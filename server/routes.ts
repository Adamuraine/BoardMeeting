import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { insertProfileSchema, insertSwipeSchema, insertTripSchema, insertPostSchema, type SurfReport } from "@shared/schema";
import { authStorage } from "./replit_integrations/auth"; // Need this for user creation in seed
import { db } from "./db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";

// Fetch live surf forecast from Open-Meteo Marine API (free, no key required)
async function fetchLiveSurfForecast(lat: number, lng: number): Promise<Partial<SurfReport>[]> {
  const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&hourly=wave_height,wave_period,wave_direction&daily=wave_height_max,wave_period_max,wave_direction_dominant&forecast_days=14&timezone=America/Los_Angeles`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Convert meters to feet (1 meter = 3.28 feet)
  const metersToFeet = (m: number) => Math.round(m * 3.28);
  
  // Process daily data into our SurfReport format
  const reports: Partial<SurfReport>[] = [];
  
  if (data.daily?.time) {
    for (let i = 0; i < data.daily.time.length; i++) {
      const waveHeightMax = data.daily.wave_height_max?.[i] || 0;
      const waveHeightFeet = metersToFeet(waveHeightMax);
      const wavePeriod = data.daily.wave_period_max?.[i] || 0;
      
      // Calculate rating based on wave height and period
      let rating = "poor";
      if (waveHeightFeet >= 6 && wavePeriod >= 10) {
        rating = "epic";
      } else if (waveHeightFeet >= 3 && wavePeriod >= 8) {
        rating = "good";
      } else if (waveHeightFeet >= 2) {
        rating = "fair";
      }
      
      reports.push({
        date: data.daily.time[i],
        waveHeightMin: Math.max(1, waveHeightFeet - 1),
        waveHeightMax: Math.max(1, waveHeightFeet),
        rating,
        windDirection: getWindDirection(data.daily.wave_direction_dominant?.[i] || 0),
        windSpeed: Math.round(wavePeriod), // Using period as proxy for energy
      });
    }
  }
  
  return reports;
}

function getWindDirection(degrees: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
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
        // For mock profiles, auto-swipe right back to create matches (demo purposes)
        if (input.swipedId.startsWith('mock_user_')) {
          // Check if mock profile already swiped on this user
          const alreadySwiped = await storage.checkMatch(userId, input.swipedId);
          if (!alreadySwiped) {
            // Create reverse swipe from mock profile to user
            await storage.createSwipe({
              swiperId: input.swipedId,
              swipedId: userId,
              direction: 'right'
            });
          }
          isMatch = true; // Always a match with mock profiles when you swipe right
        } else {
          isMatch = await storage.checkMatch(userId, input.swipedId);
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
    
    // Fetch live surf data from Open-Meteo for each location
    const locationsWithLiveForecast = await Promise.all(
      locations.map(async (loc) => {
        try {
          const forecast = await fetchLiveSurfForecast(
            parseFloat(loc.latitude),
            parseFloat(loc.longitude)
          );
          return { ...loc, reports: forecast };
        } catch (err) {
          console.error(`Failed to fetch forecast for ${loc.name}:`, err);
          return loc; // Return with existing mock reports as fallback
        }
      })
    );
    
    res.json(locationsWithLiveForecast);
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

  // Seed Data
  await storage.seedLocations();
  await seedFakeProfiles();

  return httpServer;
}

async function seedFakeProfiles() {
  // Male surfers in action - verified working URLs
  const maleSurfAction = [
    "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=800&q=80", // Male surfer on wave
    "https://images.unsplash.com/photo-1455729552865-3658a5d39692?w=800&q=80", // Male barrel ride
    "https://images.unsplash.com/photo-1509914398892-963f53e6e2f1?w=800&q=80", // Male paddling out
    "https://images.unsplash.com/photo-1600077106724-946750eeaf3c?w=800&q=80", // Male dawn patrol
    "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80", // Male sunset surf
  ];
  // Male lifestyle photos (beach/surf vibes, no headshots)
  const maleLifestyle = [
    "https://images.unsplash.com/photo-1505459668311-8dfac7952bf0?w=800&q=80", // Man with surfboard at sunset
    "https://images.unsplash.com/photo-1520116468816-95b69f847357?w=800&q=80", // Surfer walking beach
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80", // Beach scene
  ];
  
  // Female surfers in action - verified working URLs
  const femaleSurfAction = [
    "https://images.unsplash.com/photo-1506477331477-33d5d8b3dc85?w=800&q=80", // Female surfer on wave
    "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80", // Female longboarder
    "https://images.unsplash.com/photo-1502933691298-84fc14542831?w=800&q=80", // Female tube ride
    "https://images.unsplash.com/photo-1537519646099-335112f03225?w=800&q=80", // Female paddling
    "https://images.unsplash.com/photo-1510218830377-2e994ea9087d?w=800&q=80", // Female beach walk
  ];
  // Female lifestyle photos (beach/surf vibes, no headshots)
  const femaleLifestyle = [
    "https://images.unsplash.com/photo-1510218830377-2e994ea9087d?w=800&q=80", // Woman with surfboard
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80", // Beach lifestyle
    "https://images.unsplash.com/photo-1505459668311-8dfac7952bf0?w=800&q=80", // Sunset surf silhouette
  ];

  // Helper to build image gallery: surf action photos first, lifestyle photo mixed in lower positions
  const buildMaleGallery = (surfIndices: number[], lifestyleIndex: number) => {
    const gallery = surfIndices.map(i => maleSurfAction[i]);
    gallery.splice(2, 0, maleLifestyle[lifestyleIndex]); // Insert lifestyle at position 3
    return gallery;
  };
  const buildFemaleGallery = (surfIndices: number[], lifestyleIndex: number) => {
    const gallery = surfIndices.map(i => femaleSurfAction[i]);
    gallery.splice(2, 0, femaleLifestyle[lifestyleIndex]); // Insert lifestyle at position 3
    return gallery;
  };

  const fakeUsers = [
    { email: "kai@surf.com", firstName: "Kai", lastName: "L", gender: "male", age: 31, skillLevel: "pro", location: "Oceanside, CA", bio: "Big wave hunter. Dawn patrol every day.", tricks: ["Barrel", "Air Reverse", "Cutback"], images: buildMaleGallery([0, 1, 3], 0) },
    { email: "maya@surf.com", firstName: "Maya", lastName: "S", gender: "female", age: 24, skillLevel: "advanced", location: "Carlsbad, CA", bio: "Longboard soul surfer. Chasing glassy mornings.", tricks: ["Cross Step", "Hang Ten", "Nose Ride"], images: buildFemaleGallery([1, 0, 2], 0) },
    { email: "jake@surf.com", firstName: "Jake", lastName: "M", gender: "male", age: 28, skillLevel: "intermediate", location: "Encinitas, CA", bio: "Weekend warrior. Always down for a surf sesh!", tricks: ["Bottom Turn", "Floater"], images: buildMaleGallery([2, 0, 4], 1) },
    { email: "luna@surf.com", firstName: "Luna", lastName: "R", gender: "female", age: 22, skillLevel: "beginner", location: "San Diego, CA", bio: "Just started surfing. Looking for patient buddies!", tricks: ["Pop Up", "Turtle Roll"], images: buildFemaleGallery([4, 1, 0], 1) },
    { email: "tyler@surf.com", firstName: "Tyler", lastName: "K", gender: "male", age: 35, skillLevel: "advanced", location: "La Jolla, CA", bio: "Shortboard shredder. Contest competitor.", tricks: ["Aerial", "Snap", "Carve"], images: buildMaleGallery([3, 1, 2], 2) },
    { email: "emma@surf.com", firstName: "Emma", lastName: "T", gender: "female", age: 27, skillLevel: "intermediate", location: "Oceanside, CA", bio: "Coffee first, then waves. Love reef breaks!", tricks: ["Duck Dive", "Cutback", "Floater"], images: buildFemaleGallery([2, 3, 1], 2) },
    { email: "diego@surf.com", firstName: "Diego", lastName: "V", gender: "male", age: 29, skillLevel: "pro", location: "Imperial Beach, CA", bio: "Born on a surfboard. Sunset sessions only.", tricks: ["Tube Ride", "Air 360", "Layback"], images: buildMaleGallery([0, 3, 1], 0) },
    { email: "chloe@surf.com", firstName: "Chloe", lastName: "B", gender: "female", age: 26, skillLevel: "advanced", location: "Del Mar, CA", bio: "Traveling surfer. Chased waves in 12 countries!", tricks: ["Roundhouse", "Floater", "Snap"], images: buildFemaleGallery([0, 2, 4], 0) },
    { email: "marcus@surf.com", firstName: "Marcus", lastName: "J", gender: "male", age: 32, skillLevel: "intermediate", location: "Pacific Beach, CA", bio: "Tech bro by day, surfer by dawn.", tricks: ["Pop Up", "Bottom Turn", "Cutback"], images: buildMaleGallery([4, 2, 0], 1) },
    { email: "sofia@surf.com", firstName: "Sofia", lastName: "C", gender: "female", age: 23, skillLevel: "beginner", location: "Solana Beach, CA", bio: "Learning to surf. Love the ocean vibes!", tricks: ["Paddle Out", "Pop Up"], images: buildFemaleGallery([3, 0, 1], 1) },
    { email: "alex@surf.com", firstName: "Alex", lastName: "N", gender: "other", age: 30, skillLevel: "advanced", location: "Oceanside, CA", bio: "Fish board enthusiast. Clean lines only.", tricks: ["Trim", "Cutback", "Floater"], images: buildMaleGallery([1, 4, 3], 2) },
    { email: "olivia@surf.com", firstName: "Olivia", lastName: "P", gender: "female", age: 25, skillLevel: "intermediate", location: "Cardiff, CA", bio: "Yoga and surf life. Namaste on the waves.", tricks: ["Cross Step", "Soul Arch"], images: buildFemaleGallery([1, 4, 2], 2) },
    { email: "ryan@surf.com", firstName: "Ryan", lastName: "H", gender: "male", age: 27, skillLevel: "pro", location: "Huntington Beach, CA", bio: "Pipeline dreams. Training for the tour.", tricks: ["Barrel", "Air Reverse", "Full Rotation"], images: buildMaleGallery([0, 1, 4], 0) },
    { email: "ava@surf.com", firstName: "Ava", lastName: "W", gender: "female", age: 21, skillLevel: "beginner", location: "Mission Beach, CA", bio: "New to surfing but totally hooked!", tricks: ["Paddle", "Pop Up"], images: buildFemaleGallery([4, 0, 3], 1) },
    { email: "ethan@surf.com", firstName: "Ethan", lastName: "D", gender: "male", age: 33, skillLevel: "advanced", location: "Newport Beach, CA", bio: "Longboard lover. Old school style.", tricks: ["Hang Five", "Drop Knee", "Cheater Five"], images: buildMaleGallery([2, 3, 0], 2) },
    { email: "zoe@surf.com", firstName: "Zoe", lastName: "F", gender: "female", age: 28, skillLevel: "intermediate", location: "Leucadia, CA", bio: "Morning person. Best waves before 7am!", tricks: ["Duck Dive", "Bottom Turn", "Top Turn"], images: buildFemaleGallery([0, 1, 4], 0) },
    { email: "noah@surf.com", firstName: "Noah", lastName: "G", gender: "male", age: 26, skillLevel: "intermediate", location: "Coronado, CA", bio: "Military surfer. Catching waves between deployments.", tricks: ["Cutback", "Snap"], images: buildMaleGallery([1, 0, 2], 1) },
    { email: "mia@surf.com", firstName: "Mia", lastName: "A", gender: "female", age: 24, skillLevel: "advanced", location: "Trestles, CA", bio: "Contest queen. Sponsor me!", tricks: ["Air", "Carving 360", "Tube Ride"], images: buildFemaleGallery([2, 0, 1], 2) },
    { email: "liam@surf.com", firstName: "Liam", lastName: "O", gender: "male", age: 29, skillLevel: "beginner", location: "Ocean Beach, CA", bio: "Surfer in training. Wipeouts are learning!", tricks: ["Paddle Out", "Turtle Roll"], images: buildMaleGallery([4, 1, 3], 0) },
    { email: "isla@surf.com", firstName: "Isla", lastName: "E", gender: "female", age: 31, skillLevel: "pro", location: "Sunset Cliffs, CA", bio: "Surf photographer turned surfer. Living the dream.", tricks: ["Barrel", "Floater", "Re-entry"], images: buildFemaleGallery([3, 2, 0], 1) },
  ];

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
