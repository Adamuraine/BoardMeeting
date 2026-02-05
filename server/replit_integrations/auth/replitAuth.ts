import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";

function authLog(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[AUTH ${timestamp}] ${message}`, data ? JSON.stringify(data) : '');
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  authLog('Creating/updating user', { 
    id: claims["sub"], 
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"]
  });
  try {
    await authStorage.upsertUser({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
    });
    authLog('User created/updated successfully', { id: claims["sub"], email: claims["email"] });
  } catch (error) {
    authLog('ERROR: Failed to create/update user', { 
      id: claims["sub"], 
      email: claims["email"],
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const getCanonicalDomain = () => {
    const replitDomains = process.env.REPLIT_DOMAINS;
    if (replitDomains) {
      return replitDomains.split(',')[0];
    }
    return null;
  };

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      const claims = tokens.claims();
      authLog('Auth verification started', { 
        userId: claims?.["sub"], 
        email: claims?.["email"] 
      });
      
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(claims);
      
      authLog('Auth verification successful - user logged in', { 
        userId: claims?.["sub"], 
        email: claims?.["email"] 
      });
      verified(null, user);
    } catch (error) {
      authLog('ERROR: Auth verification failed', { 
        error: error instanceof Error ? error.message : String(error)
      });
      verified(error as Error, undefined);
    }
  };

  const registeredStrategies = new Set<string>();

  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    const canonicalDomain = getCanonicalDomain();
    const currentDomain = req.hostname;

    authLog('Login attempt started', { 
      hostname: currentDomain,
      canonicalDomain,
      userAgent: req.headers['user-agent'],
      ip: req.ip 
    });

    if (canonicalDomain && currentDomain !== canonicalDomain) {
      authLog('Redirecting to canonical domain for login', {
        from: currentDomain,
        to: canonicalDomain
      });
      return res.redirect(`https://${canonicalDomain}/api/login`);
    }

    const domain = canonicalDomain || currentDomain;
    ensureStrategy(domain);
    passport.authenticate(`replitauth:${domain}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    const canonicalDomain = getCanonicalDomain();
    const domain = canonicalDomain || req.hostname;

    authLog('Auth callback received', { 
      hostname: req.hostname,
      canonicalDomain: domain,
      hasError: !!req.query.error,
      error: req.query.error,
      errorDescription: req.query.error_description,
      queryParams: Object.keys(req.query)
    });
    
    if (req.query.error) {
      authLog('ERROR: Auth callback failed with OAuth error', {
        error: req.query.error,
        errorDescription: req.query.error_description
      });
    }
    
    ensureStrategy(domain);
    passport.authenticate(`replitauth:${domain}`, (err: any, user: any, info: any) => {
      authLog('Passport authenticate result', { 
        hasError: !!err, 
        hasUser: !!user,
        info: info,
        errorMessage: err?.message
      });
      
      if (err) {
        authLog('ERROR: Passport authentication error', { 
          error: err.message,
          stack: err.stack
        });
        return res.redirect("/api/login");
      }
      
      if (!user) {
        authLog('ERROR: No user returned from authentication', { info });
        return res.redirect("/api/login");
      }
      
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          authLog('ERROR: Session login failed', { 
            error: loginErr.message 
          });
          return res.redirect("/api/login");
        }
        
        authLog('SUCCESS: User logged in and session created', { 
          userId: user.claims?.sub 
        });
        return res.redirect("/");
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      const canonicalDomain = getCanonicalDomain();
      const domain = canonicalDomain || req.hostname;
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `https://${domain}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
