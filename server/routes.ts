import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { insertProfileSchema, insertSwipeSchema, insertTripSchema, insertPostSchema, type SurfReport } from "@shared/schema";
import { authStorage } from "./replit_integrations/auth";
import { db } from "./db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";
import { fetchStormglassForecast } from "./stormglassService";

// Track API usage to stay within 50 requests/day limit
let dailyRequestCount = 0;
let lastResetDate = new Date().toDateString();

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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Auth setup MUST happen first
  await setupAuth(app);
  registerAuthRoutes(app);
  
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
      const input = insertPostSchema.parse({ ...req.body, userId });
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

  app.get(api.profiles.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    const matches = await storage.getPotentialMatches(userId);
    res.json(matches);
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
      
      // Check limits for free users
      const profile = await storage.getProfile(userId);
      if (!profile?.isPremium) {
        const todayCount = await storage.getSwipesCountToday(userId);
        if (todayCount >= 10) {
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
          const swipedProfile = await storage.getProfile(input.swipedId);
          // Auto-match with demo profiles (mock_user_ prefix or seeded @surf.com emails)
          const isDemo = input.swipedId.startsWith('mock_user_') || 
                         (swipedProfile && !swipedProfile.bio?.includes('Real user'));
          
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
      throw err;
    }
  });

  // === BUDDIES (Matches) ===
  app.get("/api/buddies", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    const buddies = await storage.getMatchedBuddies(userId);
    res.json(buddies);
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

  // === TRIPS ===
  app.get(api.trips.list.path, async (req, res) => {
    const trips = await storage.getTrips();
    res.json(trips);
  });

  app.get(api.trips.byUser.path, async (req, res) => {
    const trips = await storage.getUserTrips(req.params.userId);
    res.json(trips);
  });

  app.get("/api/trips/broadcast", async (req, res) => {
    const trips = await storage.getBroadcastTrips();
    res.json(trips);
  });

  app.get("/api/trips/:id", async (req, res) => {
    const tripId = parseInt(req.params.id);
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
    try {
      const { activities, houseRental, taxiRides, boatTrips, cookingMeals, boardRental } = req.body;
      const trip = await storage.updateTripDetails(tripId, userId, { 
        activities, 
        houseRental, 
        taxiRides, 
        boatTrips, 
        cookingMeals, 
        boardRental 
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

  app.patch("/api/trips/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = getUserId(req);
    const tripId = parseInt(req.params.id);
    try {
      const { expectations, activities, waveType, rideStyle, locationPreference, vibe, extraActivities, broadcastEnabled } = req.body;
      
      // Premium check for broadcast feature
      if (broadcastEnabled === true) {
        const profile = await storage.getProfile(userId);
        if (!profile?.isPremium) {
          return res.status(403).json({ message: "Premium subscription required to broadcast trips" });
        }
      }
      
      const trip = await storage.updateTrip(tripId, userId, { expectations, activities, waveType, rideStyle, locationPreference, vibe, extraActivities, broadcastEnabled });
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
      const message = await storage.sendMessage({
        senderId: userId,
        receiverId: req.body.receiverId,
        content: req.body.content,
      });
      res.status(201).json(message);
    } catch (err) {
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
      
      let customerId = profile.stripeCustomerId;
      if (!customerId) {
        const customer = await stripeService.createCustomer(user.email || "", userId);
        await storage.updateUserStripeInfo(userId, { stripeCustomerId: customer.id });
        customerId = customer.id;
      }
      
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
