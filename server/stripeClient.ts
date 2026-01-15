import Stripe from 'stripe';

let stripeAvailable = true;
let cachedSecretKey: string | null = null;
let cachedPublishableKey: string | null = null;

async function getCredentialsFromConnector() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken || !hostname) {
    return null;
  }

  const connectorName = 'stripe';
  const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
  const targetEnvironment = isProduction ? 'production' : 'development';

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set('include_secrets', 'true');
  url.searchParams.set('connector_names', connectorName);
  url.searchParams.set('environment', targetEnvironment);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    });

    const data = await response.json();
    const connectionSettings = data.items?.[0];

    if (connectionSettings?.settings?.publishable && connectionSettings?.settings?.secret) {
      return {
        publishableKey: connectionSettings.settings.publishable,
        secretKey: connectionSettings.settings.secret,
      };
    }
  } catch (error) {
    console.log('Connector not available, checking environment variables...');
  }
  
  return null;
}

async function getCredentials() {
  if (cachedSecretKey && cachedPublishableKey) {
    return { secretKey: cachedSecretKey, publishableKey: cachedPublishableKey };
  }

  const connectorCreds = await getCredentialsFromConnector();
  if (connectorCreds) {
    cachedSecretKey = connectorCreds.secretKey;
    cachedPublishableKey = connectorCreds.publishableKey;
    console.log('Using Stripe credentials from Replit connector');
    return connectorCreds;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

  if (secretKey && publishableKey) {
    cachedSecretKey = secretKey;
    cachedPublishableKey = publishableKey;
    console.log('Using Stripe credentials from environment variables');
    return { secretKey, publishableKey };
  }

  stripeAvailable = false;
  throw new Error('Stripe not configured: No connector or STRIPE_SECRET_KEY/STRIPE_PUBLISHABLE_KEY found');
}

export function isStripeAvailable() {
  return stripeAvailable;
}

export async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey);
}

export async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey() {
  const { secretKey } = await getCredentials();
  return secretKey;
}

let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import('stripe-replit-sync');
    const secretKey = await getStripeSecretKey();

    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
