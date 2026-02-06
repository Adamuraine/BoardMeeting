import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { insertProfileSchema, insertSwipeSchema, insertTripSchema, insertPostSchema, profiles, type SurfReport } from "@shared/schema";
import { authStorage } from "./replit_integrations/auth";
import { db } from "./db";
import { users } from "@shared/models/auth";
import { eq, or, desc } from "drizzle-orm";
import { messages } from "@shared/schema";
import { fetchStormglassForecast } from "./stormglassService";
import { getSpitcastForecastByCoords, getSpitcastForecastByName, getSpitcastSpots } from "./spitcastService";

// Track API usage to stay within 50 requests/day limit
let dailyRequestCount = 0;
let lastResetDate = new Date().toDateString();

// Track recent visitors with IP addresses
interface Visitor {
  ip: string;
  userAgent: string;
  path: string;
  timestamp: Date;
  userId: string | null;
  isAuthenticated: boolean;
}

const recentVisitors: Visitor[] = [];
const MAX_VISITORS = 100; // Keep last 100 visitors

function trackVisitor(visitor: Visitor) {
  recentVisitors.unshift(visitor);
  if (recentVisitors.length > MAX_VISITORS) {
    recentVisitors.pop();
  }
}

function checkAndResetDailyCount(): void {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailyRequestCount = 0;
    lastResetDate = today;
  }
}

async function refreshSurfDataForLocation(locationId: number, lat: number, lng: number): Promise<boolean> {
  checkAndResetDailyCount();
  
  if (dailyRequestCount >= 50) {
    console.log("Stormglass daily limit reached, skipping refresh");
    return false;
  }
  
  try {
    const reports = await fetchStormglassForecast(lat, lng, 14);
    await storage.upsertSurfReports(locationId, reports);
    dailyRequestCount++;
    console.log(`Refreshed surf data for location ${locationId}, API calls today: ${dailyRequestCount}/50`);
    return true;
  } catch (err) {
    console.error(`Failed to refresh surf data for location ${locationId}:`, err);
    return false;
  }
}

function trafficLog(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[TRAFFIC ${timestamp}] ${message}`, data ? JSON.stringify(data) : '');
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth setup MUST happen first
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Traffic logging middleware for security monitoring
  app.use((req, res, next) => {
    const userId = (req.user as any)?.claims?.sub || null;
    const userEmail = (req.user as any)?.claims?.email || 'none';
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    
    // Track visitors (only track page-like requests, not assets)
    if (!req.path.includes('.') && !req.path.startsWith('/@') && !req.path.startsWith('/node_modules')) {
      trackVisitor({
        ip,
        userAgent: req.headers['user-agent'] || 'unknown',
        path: req.path,
        timestamp: new Date(),
        userId,
        isAuthenticated: req.isAuthenticated()
      });
    }
    
    // Log all requests for security auditing
    trafficLog('Request', {
      method: req.method,
      path: req.path,
      userId: userId || 'anonymous',
      userEmail: userEmail.substring(0, 5) + '***', // Partial email for privacy
      ip,
      userAgent: req.headers['user-agent']?.substring(0, 50),
      authenticated: req.isAuthenticated()
    });
    
    next();
  });
  
  // Object Storage routes for file uploads
  registerObjectStorageRoutes(app);

  // Helper to get userId from req.user
  const getUserId = (req: any) => req.user?.claims?.sub;

  // === POSTS ===
  app.get(api.posts.list.path, async (req, res) => {
    const posts = await storage.getPosts();
    res.json(posts);
  });

  app.post(api.posts.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    try {
      const body = { ...req.body, userId };
      if (!body.locationId) delete body.locationId;
      const input = insertPostSchema.parse(body);
      const post = await storage.createPost(input);
      res.status(201).json(post);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors });
      throw err;
    }
  });

  app.get(api.posts.byLocation.path, async (req, res) => {
    const posts = await storage.getPostsByLocation(Number(req.params.id));
    res.json(posts);
  });

  app.get("/api/feed", async (req, res) => {
    try {
      const [postsData, listingsData, tripsData] = await Promise.all([
        storage.getPosts(),
        storage.getMarketplaceListings(),
        storage.getTrips(),
      ]);

      const feedItems: any[] = [];

      for (const post of postsData) {
        feedItems.push({
          type: "post" as const,
          id: `post_${post.id}`,
          createdAt: post.createdAt,
          data: post,
        });
      }

      for (const listing of listingsData) {
        feedItems.push({
          type: "listing" as const,
          id: `listing_${listing.id}`,
          createdAt: listing.createdAt,
          data: listing,
        });
      }

      for (const trip of tripsData) {
        feedItems.push({
          type: "trip" as const,
          id: `trip_${trip.id}`,
          createdAt: trip.startDate,
          data: trip,
        });
      }

      feedItems.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (dateA !== dateB) return dateB - dateA;
        const idA = parseInt(a.id.split("_")[1] || "0");
        const idB = parseInt(b.id.split("_")[1] || "0");
        return idB - idA;
      });

      res.json(feedItems);
    } catch (err) {
      console.error("Error fetching feed:", err);
      res.status(500).json({ message: "Failed to fetch feed" });
    }
  });

  // === PROFILES ===
  app.get(api.profiles.me.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    const profile = await storage.getProfile(userId);
    if (!profile) return res.sendStatus(404);
    res.json(profile);
  });

  app.patch(api.profiles.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    
    // Check if profile exists, if not create it (upsert logic in update route for simplicity or handle creation separately)
    // Actually api.profiles.update is for updates. 
    // Let's support creation here too if it doesn't exist? 
    // Or better, let the frontend call update and we handle upsert logic or separate create route.
    // The schema routes defined 'update' but let's make it create if not exists for 'me'
    
    try {
      const input = insertProfileSchema.partial().parse(req.body);
      const existing = await storage.getProfile(userId);
      
      if (existing) {
        const updated = await storage.updateProfile(userId, input);
        res.json(updated);
      } else {
        // Create new
        const fullProfile = insertProfileSchema.parse({
          ...input,
          userId,
          skillLevel: input.skillLevel || "beginner",
          displayName: input.displayName || "Surfer",
        });
        const created = await storage.createProfile(fullProfile);
        res.json(created);
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors });
      }
      throw err;
    }
  });

  // Get all browsable profiles (for anonymous users)
  app.get('/api/profiles/browse', async (req, res) => {
    // Anyone can browse profiles anonymously
    const profiles = await storage.getAllProfiles();
    res.json(profiles);
  });

  app.get(api.profiles.list.path, async (req, res) => {
    // If authenticated, get potential matches (excludes already swiped)
    if (req.isAuthenticated()) {
      const userId = getUserId(req);
      const matches = await storage.getPotentialMatches(userId);
      return res.json(matches);
    }
    // If anonymous, return all profiles for browsing
    const profiles = await storage.getAllProfiles();
    res.json(profiles);
  });

  // Search all profiles (anyone can search)
  app.get('/api/profiles/search', async (req, res) => {
    const query = req.query.q as string;
    if (!query || query.trim().length === 0) {
      return res.json([]);
    }
    const results = await storage.searchProfiles(query.trim(), 10);
    res.json(results);
  });

  // Get profile by userId (anyone can view profiles)
  app.get('/api/profiles/user/:userId', async (req, res) => {
    const profile = await storage.getProfile(req.params.userId);
    if (!profile) return res.sendStatus(404);
    res.json(profile);
  });

  // Admin: Get all registered users (for debugging)
  app.get('/api/admin/users', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const allUsers = await db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        createdAt: users.createdAt
      }).from(users).orderBy(users.createdAt);
      
      // Get profiles for each user
      const usersWithProfiles = await Promise.all(
        allUsers.map(async (user) => {
          const profile = await storage.getProfile(user.id);
          return {
            ...user,
            hasProfile: !!profile,
            displayName: profile?.displayName || null,
            isMockUser: user.id.startsWith('mock_user_') || 
                       user.email?.includes('@surf.com') || 
                       user.email?.includes('@example.com') ||
                       user.email?.includes('@surftribe.mock')
          };
        })
      );
      
      // Separate real users from mock users
      const realUsers = usersWithProfiles.filter(u => !u.isMockUser);
      const mockUsers = usersWithProfiles.filter(u => u.isMockUser);
      
      res.json({
        realUsers,
        mockUserCount: mockUsers.length,
        totalCount: usersWithProfiles.length
      });
    } catch (err) {
      console.error('Error fetching users:', err);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // Admin: Get recent visitors with IP addresses
  app.get('/api/admin/visitors', async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Group visitors by IP and get unique IPs with their last visit info
    const visitorsByIp = new Map<string, { 
      ip: string; 
      visits: number; 
      lastVisit: Date; 
      lastPath: string;
      userAgent: string;
      isAuthenticated: boolean;
      userId: string | null;
    }>();
    
    for (const visitor of recentVisitors) {
      const existing = visitorsByIp.get(visitor.ip);
      if (existing) {
        existing.visits++;
        if (visitor.timestamp > existing.lastVisit) {
          existing.lastVisit = visitor.timestamp;
          existing.lastPath = visitor.path;
          existing.isAuthenticated = visitor.isAuthenticated;
          existing.userId = visitor.userId;
        }
      } else {
        visitorsByIp.set(visitor.ip, {
          ip: visitor.ip,
          visits: 1,
          lastVisit: visitor.timestamp,
          lastPath: visitor.path,
          userAgent: visitor.userAgent,
          isAuthenticated: visitor.isAuthenticated,
          userId: visitor.userId
        });
      }
    }
    
    // Convert to array and sort by most recent
    const uniqueVisitors = Array.from(visitorsByIp.values())
      .sort((a, b) => b.lastVisit.getTime() - a.lastVisit.getTime());
    
    res.json({
      visitors: uniqueVisitors,
      totalVisits: recentVisitors.length,
      uniqueCount: uniqueVisitors.length,
      anonymousCount: uniqueVisitors.filter(v => !v.isAuthenticated).length
    });
  });

  app.get(api.profiles.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const profile = await storage.getProfile(req.params.id);
    if (!profile) return res.sendStatus(404);
    res.json(profile);
  });

  // === SWIPES ===
  app.post(api.swipes.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    
    try {
      const input = insertSwipeSchema.parse({ ...req.body, swiperId: userId });
      
      // Verify target user exists before creating swipe (prevents FK constraint errors)
      const targetProfile = await storage.getProfile(input.swipedId);
      if (!targetProfile) {
        console.error(`[SWIPE] Target user ${input.swipedId} does not have a profile`);
        return res.status(400).json({ message: "User not found", code: "USER_NOT_FOUND" });
      }
      
      // Check limits for free users
      const profile = await storage.getProfile(userId);
      if (!profile?.isPremium) {
        const todayCount = await storage.getSwipesCountToday(userId);
        if (todayCount >= 5) {
          return res.status(403).json({ message: "Daily swipe limit reached", code: "LIMIT_REACHED" });
        }
      }

      await storage.createSwipe(input);
      
      // Check for match
      let isMatch = false;
      if (input.direction === 'right') {
        // Check if there's already a match (other user swiped right on us)
        isMatch = await storage.checkMatch(userId, input.swipedId);
        
        // For demo profiles (seeded or mock), auto-create reverse swipe to enable matching
        if (!isMatch) {
          // Auto-match with demo profiles (mock_user_ prefix or seeded @surf.com emails)
          const isDemo = input.swipedId.startsWith('mock_user_') || 
                         (targetProfile && !targetProfile.bio?.includes('Real user'));
          
          if (isDemo) {
            // Create reverse swipe from demo profile to user
            await storage.createSwipe({
              swiperId: input.swipedId,
              swipedId: userId,
              direction: 'right'
            });
            isMatch = true;
          }
        }
      }
      
      res.status(201).json({ match: isMatch });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors });
      }
      // Log database errors for debugging
      console.error(`[SWIPE] Error creating swipe:`, err);
      return res.status(500).json({ message: "Failed to add buddy. Please try again." });
    }
  });

  // === BUDDIES (Matches) ===
  app.get("/api/buddies", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    const buddies = await storage.getMatchedBuddies(userId);
    res.json(buddies);
  });

  app.delete("/api/buddies/:buddyId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    const { buddyId } = req.params;
    await storage.removeBuddy(userId, buddyId);
    res.sendStatus(200);
  });

  // === LOCATIONS & REPORTS ===
  app.get("/api/locations/favorites", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    const favs = await storage.getFavoriteLocations(userId);
    res.json(favs);
  });

  app.post("/api/locations/:id/favorite", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    await storage.toggleFavoriteLocation(userId, parseInt(req.params.id));
    res.sendStatus(200);
  });

  app.get(api.locations.list.path, async (req, res) => {
    const locations = await storage.getLocations();
    
    // Check if user is premium for extended forecast access
    let isPremium = false;
    if (req.isAuthenticated()) {
      const userId = getUserId(req);
      const profile = await storage.getProfile(userId);
      isPremium = profile?.isPremium || false;
    }
    
    // Filter reports based on premium status (3 days free, 14 days premium)
    const maxDays = isPremium ? 14 : 3;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const filteredLocations = locations.map(loc => {
      const filteredReports = loc.reports.filter(report => {
        const reportDate = new Date(report.date);
        const daysDiff = Math.floor((reportDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff >= 0 && daysDiff < maxDays;
      });
      return { ...loc, reports: filteredReports };
    });
    
    res.json(filteredLocations);
  });

  // Internal endpoint to refresh surf data from Stormglass (protected)
  app.post("/api/internal/refresh-surf-data", async (req, res) => {
    // Check for internal token or admin authentication
    const internalToken = req.headers["x-internal-token"];
    const expectedToken = process.env.SESSION_SECRET; // Use session secret as internal token
    
    if (!internalToken || internalToken !== expectedToken) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    
    const staleLocs = await storage.getAllLocationsWithStaleData(24);
    
    if (staleLocs.length === 0) {
      return res.json({ message: "All locations have fresh data", refreshed: 0 });
    }
    
    let refreshed = 0;
    for (const loc of staleLocs) {
      const success = await refreshSurfDataForLocation(
        loc.id,
        parseFloat(loc.latitude),
        parseFloat(loc.longitude)
      );
      if (success) refreshed++;
      if (dailyRequestCount >= 50) break;
    }
    
    res.json({ 
      message: `Refreshed ${refreshed} of ${staleLocs.length} stale locations`,
      refreshed,
      apiCallsToday: dailyRequestCount
    });
  });

  app.get(api.locations.get.path, async (req, res) => {
    const location = await storage.getLocation(Number(req.params.id));
    if (!location) return res.sendStatus(404);
    res.json(location);
  });

  // === SPITCAST SURF DATA (California spots) ===
  app.get("/api/surf/spitcast/spots", async (req, res) => {
    try {
      const spots = await getSpitcastSpots();
      res.json(spots);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch Spitcast spots" });
    }
  });

  app.get("/api/surf/spitcast/forecast", async (req, res) => {
    try {
      const { lat, lng, name } = req.query;
      
      let forecast = null;
      
      if (name && typeof name === 'string') {
        forecast = await getSpitcastForecastByName(name);
      } else if (lat && lng) {
        const latitude = parseFloat(lat as string);
        const longitude = parseFloat(lng as string);
        if (!isNaN(latitude) && !isNaN(longitude)) {
          forecast = await getSpitcastForecastByCoords(latitude, longitude);
        }
      }
      
      if (!forecast) {
        return res.status(404).json({ 
          error: "No Spitcast data available for this location",
          message: "Spitcast only covers California surf spots"
        });
      }
      
      res.json(forecast);
    } catch (error) {
      console.error("Spitcast forecast error:", error);
      res.status(500).json({ error: "Failed to fetch Spitcast forecast" });
    }
  });

  // === TRIPS ===
  app.get(api.trips.list.path, async (req, res) => {
    const trips = await storage.getTrips();
    res.json(trips);
  });

  app.get(api.trips.byUser.path, async (req, res) => {
    const trips = await storage.getUserTrips(req.params.userId);
    res.json(trips);
  });

  app.get("/api/trips/similar", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    const { destination, startDate, endDate } = req.query;
    if (!destination || !startDate || !endDate) {
      return res.status(400).json({ message: "destination, startDate, and endDate are required" });
    }
    try {
      const similar = await storage.findSimilarTrips(
        destination as string,
        startDate as string,
        endDate as string,
        userId
      );
      res.json(similar);
    } catch (err) {
      console.error("Failed to find similar trips:", err);
      res.status(500).json({ message: "Failed to find similar trips" });
    }
  });

  app.get("/api/rides/similar", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    const { destination, date } = req.query;
    if (!destination || !date) {
      return res.status(400).json({ message: "destination and date are required" });
    }
    try {
      const similar = await storage.findSimilarRides(
        destination as string,
        date as string,
        userId
      );
      res.json(similar);
    } catch (err) {
      console.error("Failed to find similar rides:", err);
      res.status(500).json({ message: "Failed to find similar rides" });
    }
  });

  app.get("/api/trips/broadcast", async (req, res) => {
    const trips = await storage.getBroadcastTrips();
    res.json(trips);
  });

  app.get("/api/trips/:id", async (req, res) => {
    const tripId = parseInt(req.params.id);
    if (isNaN(tripId)) return res.sendStatus(400);
    const trip = await storage.getTripById(tripId);
    if (!trip) return res.sendStatus(404);
    res.json(trip);
  });

  app.post(api.trips.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    try {
      const input = insertTripSchema.parse({ ...req.body, organizerId: userId });
      const trip = await storage.createTrip(input);
      res.status(201).json(trip);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors });
      }
      throw err;
    }
  });

  app.patch("/api/trips/:id/activities", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    const tripId = parseInt(req.params.id);
    if (isNaN(tripId)) return res.sendStatus(400);
    try {
      const { activities } = req.body;
      if (!Array.isArray(activities)) {
        return res.status(400).json({ message: "Activities must be an array" });
      }
      const trip = await storage.updateTripActivities(tripId, userId, activities);
      res.json(trip);
    } catch (err: any) {
      console.error("Failed to update trip activities:", err);
      if (err.message === "Trip not found") {
        return res.status(404).json({ message: "Trip not found" });
      }
      if (err.message === "Not authorized to update this trip") {
        return res.status(403).json({ message: "Not authorized to update this trip" });
      }
      res.status(500).json({ message: "Failed to update trip activities" });
    }
  });

  app.patch("/api/trips/:id/details", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    const tripId = parseInt(req.params.id);
    if (isNaN(tripId)) return res.sendStatus(400);
    try {
      const { activities, houseRental, taxiRides, boatTrips, cookingMeals, boardRental, airfare, photographer } = req.body;
      const trip = await storage.updateTripDetails(tripId, userId, { 
        activities, 
        houseRental, 
        taxiRides, 
        boatTrips, 
        cookingMeals, 
        boardRental,
        airfare,
        photographer 
      });
      res.json(trip);
    } catch (err: any) {
      console.error("Failed to update trip details:", err);
      if (err.message === "Trip not found") {
        return res.status(404).json({ message: "Trip not found" });
      }
      if (err.message === "Not authorized to update this trip") {
        return res.status(403).json({ message: "Not authorized to update this trip" });
      }
      res.status(500).json({ message: "Failed to update trip details" });
    }
  });

  // Trip Participants - Request to join
  app.post("/api/trips/:id/join", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    const tripId = parseInt(req.params.id);
    if (isNaN(tripId)) return res.sendStatus(400);
    try {
      const participant = await storage.requestToJoinTrip(tripId, userId);
      res.json(participant);
    } catch (err: any) {
      console.error("Failed to request to join trip:", err);
      res.status(500).json({ message: "Failed to request to join trip" });
    }
  });

  // Trip Participants - Get all participants
  app.get("/api/trips/:id/participants", async (req, res) => {
    const tripId = parseInt(req.params.id);
    if (isNaN(tripId)) return res.sendStatus(400);
    try {
      const participants = await storage.getTripParticipants(tripId);
      res.json(participants);
    } catch (err: any) {
      console.error("Failed to get participants:", err);
      res.status(500).json({ message: "Failed to get participants" });
    }
  });

  // Trip Participants - Get user's status for a trip
  app.get("/api/trips/:id/my-status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    const tripId = parseInt(req.params.id);
    if (isNaN(tripId)) return res.sendStatus(400);
    try {
      const status = await storage.getUserTripStatus(tripId, userId);
      res.json(status || null);
    } catch (err: any) {
      console.error("Failed to get user trip status:", err);
      res.status(500).json({ message: "Failed to get status" });
    }
  });

  // Trip Participants - Approve/Reject (organizer only)
  app.patch("/api/trips/:id/participants/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const organizerId = getUserId(req);
    const tripId = parseInt(req.params.id);
    if (isNaN(tripId)) return res.sendStatus(400);
    const participantUserId = req.params.userId;
    const { status } = req.body;
    
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
    }
    
    try {
      const participant = await storage.updateParticipantStatus(tripId, participantUserId, status, organizerId);
      res.json(participant);
    } catch (err: any) {
      console.error("Failed to update participant status:", err);
      if (err.message === "Not authorized to update this trip") {
        return res.status(403).json({ message: "Not authorized" });
      }
      res.status(500).json({ message: "Failed to update participant status" });
    }
  });

  app.patch("/api/trips/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    const tripId = parseInt(req.params.id);
    if (isNaN(tripId)) return res.sendStatus(400);
    try {
      const { name, photos, destination, startingLocation, startDate, endDate, description, cost, tripType, isVisiting, isGuide, approximateDates, expectations, activities, waveType, rideStyle, locationPreference, vibe, extraActivities, broadcastEnabled } = req.body;
      
      // Premium check for broadcast feature
      if (broadcastEnabled === true) {
        const profile = await storage.getProfile(userId);
        if (!profile?.isPremium) {
          return res.status(403).json({ message: "Premium subscription required to broadcast trips" });
        }
      }
      
      const trip = await storage.updateTrip(tripId, userId, { name, photos, destination, startingLocation, startDate, endDate, description, cost, tripType, isVisiting, isGuide, approximateDates, expectations, activities, waveType, rideStyle, locationPreference, vibe, extraActivities, broadcastEnabled });
      res.json(trip);
    } catch (err: any) {
      console.error("Failed to update trip:", err);
      if (err.message === "Trip not found") {
        return res.status(404).json({ message: "Trip not found" });
      }
      if (err.message === "Not authorized to update this trip") {
        return res.status(403).json({ message: "Not authorized to update this trip" });
      }
      res.status(500).json({ message: "Failed to update trip" });
    }
  });

  // === PREMIUM ===
  app.post(api.premium.upgrade.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    await storage.setPremium(userId, true);
    res.json({ success: true });
  });

  // === POST LIKES (Shaka) ===
  app.post("/api/posts/:id/like", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    const postId = parseInt(req.params.id);
    const liked = await storage.togglePostLike(postId, userId);
    const count = await storage.getPostLikesCount(postId);
    res.json({ liked, count });
  });

  app.get("/api/posts/:id/like", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    const postId = parseInt(req.params.id);
    const liked = await storage.hasUserLikedPost(postId, userId);
    const count = await storage.getPostLikesCount(postId);
    res.json({ liked, count });
  });

  // === MESSAGES ===
  app.get(api.messages.conversations.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    const conversations = await storage.getConversations(userId);
    res.json(conversations);
  });

  app.get(api.messages.thread.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    const messages = await storage.getMessages(userId, req.params.buddyId);
    await storage.markMessagesRead(userId, req.params.buddyId);
    res.json(messages);
  });

  app.post(api.messages.send.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    try {
      console.log(`[MESSAGE SEND] From: ${userId} To: ${req.body.receiverId} Content: "${req.body.content?.substring(0, 30)}..."`);
      
      // Verify receiver exists
      const receiverProfile = await storage.getProfile(req.body.receiverId);
      console.log(`[MESSAGE SEND] Receiver profile found: ${receiverProfile ? receiverProfile.displayName : 'NOT FOUND'}`);
      
      const message = await storage.sendMessage({
        senderId: userId,
        receiverId: req.body.receiverId,
        content: req.body.content,
      });
      console.log(`[MESSAGE SEND] Message saved with ID: ${message.id}`);
      res.status(201).json(message);
    } catch (err) {
      console.error(`[MESSAGE SEND] Error:`, err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors });
      }
      throw err;
    }
  });

  app.post(api.messages.markRead.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    await storage.markMessagesRead(userId, req.params.buddyId);
    res.json({ success: true });
  });

  // === GROUP MESSAGES (Trip Group Chats) ===
  
  app.get("/api/messages/group-conversations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    const conversations = await storage.getTripGroupConversations(userId);
    res.json(conversations);
  });

  app.get("/api/trips/:id/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    const tripId = parseInt(req.params.id);
    if (isNaN(tripId)) return res.sendStatus(400);
    
    const isMember = await storage.isUserInTrip(tripId, userId);
    if (!isMember) return res.status(403).json({ message: "You are not a member of this trip" });
    
    const messages = await storage.getTripMessages(tripId);
    res.json(messages);
  });

  app.post("/api/trips/:id/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    const tripId = parseInt(req.params.id);
    if (isNaN(tripId)) return res.sendStatus(400);
    
    const isMember = await storage.isUserInTrip(tripId, userId);
    if (!isMember) return res.status(403).json({ message: "You are not a member of this trip" });
    
    const { content } = req.body;
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ message: "Message content required" });
    }
    
    const message = await storage.sendTripMessage({
      tripId,
      senderId: userId,
      content: content.trim(),
    });
    res.status(201).json(message);
  });

  // === SETTINGS & ACCOUNT MANAGEMENT ===
  
  // Clear all chat history for user
  app.delete("/api/messages/clear-all", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    try {
      await storage.clearAllMessages(userId);
      res.json({ success: true });
    } catch (err) {
      console.error("Error clearing messages:", err);
      res.status(500).json({ message: "Failed to clear messages" });
    }
  });

  // Clear all match history for user
  app.delete("/api/matches/clear-all", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    try {
      await storage.clearAllMatches(userId);
      res.json({ success: true });
    } catch (err) {
      console.error("Error clearing matches:", err);
      res.status(500).json({ message: "Failed to clear matches" });
    }
  });

  // Debug endpoint - get user's messaging diagnostic info
  app.get("/api/debug/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    try {
      // Separate queries to diagnose the issue
      const sentMessages = await db.select()
        .from(messages)
        .where(eq(messages.senderId, userId))
        .orderBy(desc(messages.createdAt))
        .limit(10);
      
      const receivedMessages = await db.select()
        .from(messages)
        .where(eq(messages.receiverId, userId))
        .orderBy(desc(messages.createdAt))
        .limit(10);
      
      // Get ALL recent messages in database (to see full picture)
      const allRecentMessages = await db.select()
        .from(messages)
        .orderBy(desc(messages.createdAt))
        .limit(15);
      
      // Get user profile
      const profile = await storage.getProfile(userId);
      
      // Get the user record
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      
      // Include environment info to help debug dev vs prod issues
      const envInfo = {
        nodeEnv: process.env.NODE_ENV || 'unknown',
        replSlug: process.env.REPL_SLUG || 'unknown',
        replOwner: process.env.REPL_OWNER || 'unknown',
        isProduction: process.env.NODE_ENV === 'production',
        databaseUrl: process.env.DATABASE_URL ? 'connected' : 'not connected',
        serverTime: new Date().toISOString()
      };
      
      res.json({
        environment: envInfo,
        userId,
        userName: user?.firstName,
        profileId: profile?.id,
        profileDisplayName: profile?.displayName,
        sentCount: sentMessages.length,
        receivedCount: receivedMessages.length,
        totalRecentMessages: allRecentMessages.length,
        sent: sentMessages.map(m => ({
          id: m.id,
          to: m.receiverId,
          content: m.content?.substring(0, 30),
          createdAt: m.createdAt
        })),
        received: receivedMessages.map(m => ({
          id: m.id,
          from: m.senderId,
          content: m.content?.substring(0, 30),
          createdAt: m.createdAt
        })),
        allRecent: allRecentMessages.map(m => ({
          id: m.id,
          from: m.senderId,
          to: m.receiverId,
          content: m.content?.substring(0, 20),
          createdAt: m.createdAt
        }))
      });
    } catch (err) {
      console.error("Debug error:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  // Debug endpoint - search profiles by displayName, user name, or email
  app.get("/api/debug/profiles", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const searchTerm = (req.query.name as string || "").toLowerCase();
      
      // Join profiles with users to search across all fields
      const allData = await db
        .select({
          profileId: profiles.id,
          userId: profiles.userId,
          displayName: profiles.displayName,
          skillLevel: profiles.skillLevel,
          location: profiles.location,
          isIncompleteProfile: profiles.isIncompleteProfile,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName
        })
        .from(profiles)
        .leftJoin(users, eq(profiles.userId, users.id));
      
      // Filter by search term across displayName, firstName, lastName, and email
      const filtered = searchTerm 
        ? allData.filter(p => {
            const displayMatch = p.displayName?.toLowerCase().includes(searchTerm);
            const firstNameMatch = p.firstName?.toLowerCase().includes(searchTerm);
            const lastNameMatch = p.lastName?.toLowerCase().includes(searchTerm);
            const emailMatch = p.email?.toLowerCase().includes(searchTerm);
            const fullNameMatch = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase().includes(searchTerm);
            return displayMatch || firstNameMatch || lastNameMatch || emailMatch || fullNameMatch;
          })
        : allData;
      
      res.json({
        searchTerm: searchTerm || null,
        totalProfiles: filtered.length,
        profiles: filtered.map(p => ({
          id: p.profileId,
          userId: p.userId,
          displayName: p.displayName,
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.email,
          skillLevel: p.skillLevel,
          location: p.location,
          isIncompleteProfile: p.isIncompleteProfile
        }))
      });
    } catch (err) {
      console.error("Debug profiles error:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  // Delete user account
  app.delete("/api/profiles/me", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    try {
      await storage.deleteUserAccount(userId);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting account:", err);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // Submit user feedback
  app.post("/api/feedback", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    const { feedback } = req.body;
    
    if (!feedback || typeof feedback !== "string") {
      return res.status(400).json({ message: "Feedback content is required" });
    }
    
    try {
      const result = await storage.submitFeedback(userId, feedback);
      res.status(201).json(result);
    } catch (err) {
      console.error("Error submitting feedback:", err);
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  });

  // === MARKETPLACE ===
  app.get("/api/marketplace", async (req, res) => {
    try {
      const listings = await storage.getMarketplaceListings();
      res.json(listings);
    } catch (err) {
      console.error("Error fetching marketplace listings:", err);
      res.status(500).json({ message: "Failed to fetch listings" });
    }
  });

  app.get("/api/marketplace/my-listings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    try {
      const listings = await storage.getUserListings(userId);
      res.json(listings);
    } catch (err) {
      console.error("Error fetching user listings:", err);
      res.status(500).json({ message: "Failed to fetch your listings" });
    }
  });

  app.get("/api/marketplace/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.sendStatus(400);
    try {
      const listing = await storage.getMarketplaceListingById(id);
      if (!listing) return res.sendStatus(404);
      res.json(listing);
    } catch (err) {
      console.error("Error fetching listing:", err);
      res.status(500).json({ message: "Failed to fetch listing" });
    }
  });

  app.post("/api/marketplace", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    try {
      const { insertMarketplaceListingSchema } = await import("@shared/schema");
      const input = insertMarketplaceListingSchema.parse({ ...req.body, sellerId: userId });
      const listing = await storage.createMarketplaceListing(input);
      res.status(201).json(listing);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors });
      }
      console.error("Error creating listing:", err);
      res.status(500).json({ message: "Failed to create listing" });
    }
  });

  app.patch("/api/marketplace/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.sendStatus(400);
    try {
      const listing = await storage.updateMarketplaceListing(id, userId, req.body);
      res.json(listing);
    } catch (err: any) {
      if (err.message === "Listing not found") {
        return res.status(404).json({ message: "Listing not found" });
      }
      if (err.message === "Not authorized to update this listing") {
        return res.status(403).json({ message: "Not authorized" });
      }
      console.error("Error updating listing:", err);
      res.status(500).json({ message: "Failed to update listing" });
    }
  });

  app.delete("/api/marketplace/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.sendStatus(400);
    try {
      await storage.deleteMarketplaceListing(id, userId);
      res.json({ success: true });
    } catch (err: any) {
      if (err.message === "Listing not found") {
        return res.status(404).json({ message: "Listing not found" });
      }
      if (err.message === "Not authorized to delete this listing") {
        return res.status(403).json({ message: "Not authorized" });
      }
      console.error("Error deleting listing:", err);
      res.status(500).json({ message: "Failed to delete listing" });
    }
  });

  // === STRIPE CHECKOUT ===
  app.post("/api/checkout/premium", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    
    try {
      const { isStripeAvailable } = await import("./stripeClient");
      if (!isStripeAvailable()) {
        return res.status(503).json({ message: "Payments are temporarily unavailable. Please try again later." });
      }
      const { stripeService } = await import("./stripeService");
      const { getStripePublishableKey } = await import("./stripeClient");
      
      const profile = await storage.getProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const customerId = await stripeService.getOrCreateCustomer(
        profile.stripeCustomerId,
        user.email || "",
        userId
      );
      
      const priceId = process.env.STRIPE_PREMIUM_PRICE_ID;
      if (!priceId) {
        return res.status(500).json({ message: "Premium price not configured" });
      }
      
      const host = req.get('host');
      const protocol = req.protocol;
      const session = await stripeService.createCheckoutSession(
        customerId,
        priceId,
        `${protocol}://${host}/profile?checkout=success`,
        `${protocol}://${host}/profile?checkout=cancelled`
      );
      
      res.json({ url: session.url });
    } catch (err) {
      console.error("Checkout error:", err);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });
  
  app.get("/api/stripe/publishable-key", async (req, res) => {
    try {
      const { isStripeAvailable, getStripePublishableKey } = await import("./stripeClient");
      if (!isStripeAvailable()) {
        return res.status(503).json({ message: "Payments are temporarily unavailable" });
      }
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (err) {
      console.error("Error getting publishable key:", err);
      res.status(500).json({ message: "Failed to get Stripe key" });
    }
  });
  
  app.post("/api/stripe/portal", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    
    try {
      const { isStripeAvailable } = await import("./stripeClient");
      if (!isStripeAvailable()) {
        return res.status(503).json({ message: "Payments are temporarily unavailable. Please try again later." });
      }
      const { stripeService } = await import("./stripeService");
      
      const profile = await storage.getProfile(userId);
      if (!profile?.stripeCustomerId) {
        return res.status(400).json({ message: "No subscription found" });
      }
      
      const host = req.get('host');
      const protocol = req.protocol;
      const session = await stripeService.createCustomerPortalSession(
        profile.stripeCustomerId,
        `${protocol}://${host}/profile`
      );
      
      res.json({ url: session.url });
    } catch (err) {
      console.error("Portal error:", err);
      res.status(500).json({ message: "Failed to create portal session" });
    }
  });

  // Seed Data
  await storage.seedLocations();
  await seedFakeProfiles();

  return httpServer;
}

async function seedFakeProfiles() {
  // Male surfers in action - verified working URLs
  const maleSurfAction = [
    "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=800&q=80",
    "https://images.unsplash.com/photo-1455729552865-3658a5d39692?w=800&q=80",
    "https://images.unsplash.com/photo-1509914398892-963f53e6e2f1?w=800&q=80",
    "https://images.unsplash.com/photo-1600077106724-946750eeaf3c?w=800&q=80",
    "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80",
  ];
  const maleLifestyle = [
    "https://images.unsplash.com/photo-1505459668311-8dfac7952bf0?w=800&q=80",
    "https://images.unsplash.com/photo-1520116468816-95b69f847357?w=800&q=80",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
  ];
  const femaleSurfAction = [
    "https://images.unsplash.com/photo-1506477331477-33d5d8b3dc85?w=800&q=80",
    "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80",
    "https://images.unsplash.com/photo-1502933691298-84fc14542831?w=800&q=80",
    "https://images.unsplash.com/photo-1537519646099-335112f03225?w=800&q=80",
    "https://images.unsplash.com/photo-1510218830377-2e994ea9087d?w=800&q=80",
  ];
  const femaleLifestyle = [
    "https://images.unsplash.com/photo-1510218830377-2e994ea9087d?w=800&q=80",
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
    "https://images.unsplash.com/photo-1505459668311-8dfac7952bf0?w=800&q=80",
  ];

  const maleNames = ["Kai", "Jake", "Tyler", "Diego", "Marcus", "Ryan", "Ethan", "Noah", "Liam", "Mason", "Lucas", "Oliver", "Aiden", "Elijah", "James", "Benjamin", "Logan", "Alexander", "Sebastian", "Jack", "Owen", "Daniel", "Matthew", "Henry", "Joseph", "Samuel", "David", "Carter", "Wyatt", "Jayden", "John", "Luke", "Anthony", "Isaac", "Dylan", "Leo", "Caleb", "Jaxon", "Asher", "Nathan", "Aaron", "Eli", "Connor", "Colton", "Adrian", "Blake", "Jordan", "Evan", "Chase", "Brody"];
  const femaleNames = ["Maya", "Luna", "Emma", "Chloe", "Sofia", "Olivia", "Ava", "Zoe", "Mia", "Isla", "Riley", "Aria", "Layla", "Zoey", "Lily", "Aurora", "Violet", "Nova", "Emilia", "Stella", "Hazel", "Ivy", "Jade", "Willow", "Sage", "Ruby", "Coral", "Pearl", "Marina", "Summer", "Sunny", "Skye", "Ocean", "Brooke", "Sierra", "Savannah", "Madison", "Hannah", "Abigail", "Addison", "Natalie", "Grace", "Chloe", "Victoria", "Audrey", "Claire", "Skylar", "Bella", "Sydney", "Peyton"];
  const locations = ["Oceanside, CA", "Carlsbad, CA", "Encinitas, CA", "San Diego, CA", "La Jolla, CA", "Del Mar, CA", "Pacific Beach, CA", "Solana Beach, CA", "Cardiff, CA", "Huntington Beach, CA", "Newport Beach, CA", "Leucadia, CA", "Coronado, CA", "Trestles, CA", "Ocean Beach, CA", "Sunset Cliffs, CA", "Imperial Beach, CA", "Mission Beach, CA", "Santa Cruz, CA", "Malibu, CA"];
  const skillLevels = ["beginner", "intermediate", "advanced", "pro"];
  const maleBios = [
    "Big wave hunter. Dawn patrol every day.", "Weekend warrior. Always down for a surf sesh!", "Shortboard shredder. Contest competitor.", "Born on a surfboard. Sunset sessions only.", "Tech bro by day, surfer by dawn.", "Pipeline dreams. Training for the tour.", "Longboard lover. Old school style.", "Military surfer. Catching waves between deployments.", "Surfer in training. Wipeouts are learning!", "Fish board enthusiast. Clean lines only.", "Chasing barrels up and down the coast.", "Former WSL competitor. Now coaching and free surfing.", "Firefighter by day, surfer by...also day.", "Big wave charger. Mavericks regular.", "Just moved from Hawaii. Missing those reef breaks!", "Sponsored rider. Chasing swells from here to Bali.", "Dawn patrol every day before work. The stoke is real.", "Small wave specialist. Fish board enthusiast.", "Weekend surfer, weekday engineer. Living the dream.", "Shortboard shredder. Progressive airs are the goal."
  ];
  const femaleBios = [
    "Longboard soul surfer. Chasing glassy mornings.", "Just started surfing. Looking for patient buddies!", "Coffee first, then waves. Love reef breaks!", "Traveling surfer. Chased waves in 12 countries!", "Learning to surf. Love the ocean vibes!", "Yoga and surf life. Namaste on the waves.", "New to surfing but totally hooked!", "Morning person. Best waves before 7am!", "Contest queen. Sponsor me!", "Surf photographer turned surfer. Living the dream.", "Mom of two who escapes to the ocean whenever possible.", "College student catching waves between classes.", "Surf coach and yoga instructor. Balance is everything.", "Former competitive swimmer turned surfer. Water is my home.", "Competitive longboarder. Gliding is living.", "Traveled the world for waves. Indo is my happy place.", "Longboarder at heart. Cross-stepping is my jam.", "Surf photographer who also rips. Catch me at Trestles.", "New to surfing but totally addicted.", "Weekend warrior learning to shred."
  ];
  const allTricks = ["Barrel", "Air Reverse", "Cutback", "Cross Step", "Hang Ten", "Nose Ride", "Bottom Turn", "Floater", "Pop Up", "Turtle Roll", "Aerial", "Snap", "Carve", "Tube Ride", "Air 360", "Layback", "Roundhouse", "Duck Dive", "Trim", "Soul Arch", "Full Rotation", "Drop Knee", "Cheater Five", "Top Turn", "Re-entry", "Hang Five"];

  const buildMaleGallery = () => {
    const indices = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5).slice(0, 3);
    const gallery = indices.map(i => maleSurfAction[i]);
    gallery.push(maleLifestyle[Math.floor(Math.random() * maleLifestyle.length)]);
    return gallery;
  };
  const buildFemaleGallery = () => {
    const indices = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5).slice(0, 3);
    const gallery = indices.map(i => femaleSurfAction[i]);
    gallery.push(femaleLifestyle[Math.floor(Math.random() * femaleLifestyle.length)]);
    return gallery;
  };
  const getRandomTricks = (count: number) => {
    const shuffled = [...allTricks].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  };

  const fakeUsers: any[] = [];
  
  // Generate 50 male profiles
  for (let i = 0; i < 50; i++) {
    const name = maleNames[i % maleNames.length];
    fakeUsers.push({
      email: `${name.toLowerCase()}${i}@surf.com`,
      firstName: name,
      lastName: String.fromCharCode(65 + (i % 26)),
      gender: "male",
      age: 18 + Math.floor(Math.random() * 25),
      skillLevel: skillLevels[Math.floor(Math.random() * skillLevels.length)],
      location: locations[Math.floor(Math.random() * locations.length)],
      bio: maleBios[i % maleBios.length],
      tricks: getRandomTricks(2 + Math.floor(Math.random() * 4)),
      images: buildMaleGallery()
    });
  }
  
  // Generate 50 female profiles
  for (let i = 0; i < 50; i++) {
    const name = femaleNames[i % femaleNames.length];
    fakeUsers.push({
      email: `${name.toLowerCase()}${i}@surf.com`,
      firstName: name,
      lastName: String.fromCharCode(65 + (i % 26)),
      gender: "female",
      age: 18 + Math.floor(Math.random() * 25),
      skillLevel: skillLevels[Math.floor(Math.random() * skillLevels.length)],
      location: locations[Math.floor(Math.random() * locations.length)],
      bio: femaleBios[i % femaleBios.length],
      tricks: getRandomTricks(2 + Math.floor(Math.random() * 4)),
      images: buildFemaleGallery()
    });
  }

  for (const fake of fakeUsers) {
    const existingUser = await db.select().from(users).where(eq(users.email, fake.email));
    
    let userId;
    if (existingUser.length > 0) {
      userId = existingUser[0].id;
    } else {
      const user = await authStorage.upsertUser({
        email: fake.email,
        firstName: fake.firstName,
        lastName: fake.lastName,
        profileImageUrl: fake.images[0],
      });
      userId = user.id;
    }

    const existing = await storage.getProfile(userId);
    if (!existing) {
      await storage.createProfile({
        userId: userId,
        displayName: fake.firstName,
        bio: fake.bio,
        gender: fake.gender,
        age: fake.age,
        skillLevel: fake.skillLevel,
        location: fake.location,
        imageUrls: fake.images,
        tricks: fake.tricks,
        isPremium: Math.random() > 0.5
      });
    }
  }
}
