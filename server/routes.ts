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
        isMatch = await storage.checkMatch(userId, input.swipedId);
      }
      
      res.status(201).json({ match: isMatch });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors });
      }
      throw err;
    }
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

  // Seed Data
  await storage.seedLocations();
  await seedFakeProfiles();

  return httpServer;
}

async function seedFakeProfiles() {
  const maleImages = [
    "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=800&q=80",
    "https://images.unsplash.com/photo-1537553915828-8e14f1778c18?w=800&q=80",
    "https://images.unsplash.com/photo-1528150177508-7cc0c36cda5c?w=800&q=80",
    "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=800&q=80",
    "https://images.unsplash.com/photo-1455729552865-3658a5d39692?w=800&q=80",
  ];
  const femaleImages = [
    "https://images.unsplash.com/photo-1616801938933-d95955038c75?w=800&q=80",
    "https://images.unsplash.com/photo-1564429238909-74dfc3c0bcb9?w=800&q=80",
    "https://images.unsplash.com/photo-1509914398892-963f53e6e2f1?w=800&q=80",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
    "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80",
  ];

  const fakeUsers = [
    { email: "kai@surf.com", firstName: "Kai", lastName: "L", gender: "male", age: 31, skillLevel: "pro", location: "Oceanside, CA", bio: "Big wave hunter. Dawn patrol every day.", tricks: ["Barrel", "Air Reverse", "Cutback"], images: [maleImages[0], maleImages[2], maleImages[4]] },
    { email: "maya@surf.com", firstName: "Maya", lastName: "S", gender: "female", age: 24, skillLevel: "advanced", location: "Carlsbad, CA", bio: "Longboard soul surfer. Chasing glassy mornings.", tricks: ["Cross Step", "Hang Ten", "Nose Ride"], images: [femaleImages[0], femaleImages[2], femaleImages[3]] },
    { email: "jake@surf.com", firstName: "Jake", lastName: "M", gender: "male", age: 28, skillLevel: "intermediate", location: "Encinitas, CA", bio: "Weekend warrior. Always down for a surf sesh!", tricks: ["Bottom Turn", "Floater"], images: [maleImages[1], maleImages[0]] },
    { email: "luna@surf.com", firstName: "Luna", lastName: "R", gender: "female", age: 22, skillLevel: "beginner", location: "San Diego, CA", bio: "Just started surfing. Looking for patient buddies!", tricks: ["Pop Up", "Turtle Roll"], images: [femaleImages[1], femaleImages[4]] },
    { email: "tyler@surf.com", firstName: "Tyler", lastName: "K", gender: "male", age: 35, skillLevel: "advanced", location: "La Jolla, CA", bio: "Shortboard shredder. Contest competitor.", tricks: ["Aerial", "Snap", "Carve"], images: [maleImages[3], maleImages[4], maleImages[0]] },
    { email: "emma@surf.com", firstName: "Emma", lastName: "T", gender: "female", age: 27, skillLevel: "intermediate", location: "Oceanside, CA", bio: "Coffee first, then waves. Love reef breaks!", tricks: ["Duck Dive", "Cutback", "Floater"], images: [femaleImages[1], femaleImages[3]] },
    { email: "diego@surf.com", firstName: "Diego", lastName: "V", gender: "male", age: 29, skillLevel: "pro", location: "Imperial Beach, CA", bio: "Born on a surfboard. Sunset sessions only.", tricks: ["Tube Ride", "Air 360", "Layback"], images: [maleImages[0], maleImages[4], maleImages[2]] },
    { email: "chloe@surf.com", firstName: "Chloe", lastName: "B", gender: "female", age: 26, skillLevel: "advanced", location: "Del Mar, CA", bio: "Traveling surfer. Chased waves in 12 countries!", tricks: ["Roundhouse", "Floater", "Snap"], images: [femaleImages[2], femaleImages[4], femaleImages[3]] },
    { email: "marcus@surf.com", firstName: "Marcus", lastName: "J", gender: "male", age: 32, skillLevel: "intermediate", location: "Pacific Beach, CA", bio: "Tech bro by day, surfer by dawn.", tricks: ["Pop Up", "Bottom Turn", "Cutback"], images: [maleImages[1], maleImages[3]] },
    { email: "sofia@surf.com", firstName: "Sofia", lastName: "C", gender: "female", age: 23, skillLevel: "beginner", location: "Solana Beach, CA", bio: "Learning to surf. Love the ocean vibes!", tricks: ["Paddle Out", "Pop Up"], images: [femaleImages[0], femaleImages[4]] },
    { email: "alex@surf.com", firstName: "Alex", lastName: "N", gender: "other", age: 30, skillLevel: "advanced", location: "Oceanside, CA", bio: "Fish board enthusiast. Clean lines only.", tricks: ["Trim", "Cutback", "Floater"], images: [maleImages[2], maleImages[4]] },
    { email: "olivia@surf.com", firstName: "Olivia", lastName: "P", gender: "female", age: 25, skillLevel: "intermediate", location: "Cardiff, CA", bio: "Yoga and surf life. Namaste on the waves.", tricks: ["Cross Step", "Soul Arch"], images: [femaleImages[2], femaleImages[0]] },
    { email: "ryan@surf.com", firstName: "Ryan", lastName: "H", gender: "male", age: 27, skillLevel: "pro", location: "Huntington Beach, CA", bio: "Pipeline dreams. Training for the tour.", tricks: ["Barrel", "Air Reverse", "Full Rotation"], images: [maleImages[0], maleImages[3], maleImages[1]] },
    { email: "ava@surf.com", firstName: "Ava", lastName: "W", gender: "female", age: 21, skillLevel: "beginner", location: "Mission Beach, CA", bio: "New to surfing but totally hooked!", tricks: ["Paddle", "Pop Up"], images: [femaleImages[1], femaleImages[4]] },
    { email: "ethan@surf.com", firstName: "Ethan", lastName: "D", gender: "male", age: 33, skillLevel: "advanced", location: "Newport Beach, CA", bio: "Longboard lover. Old school style.", tricks: ["Hang Five", "Drop Knee", "Cheater Five"], images: [maleImages[2], maleImages[4], maleImages[0]] },
    { email: "zoe@surf.com", firstName: "Zoe", lastName: "F", gender: "female", age: 28, skillLevel: "intermediate", location: "Leucadia, CA", bio: "Morning person. Best waves before 7am!", tricks: ["Duck Dive", "Bottom Turn", "Top Turn"], images: [femaleImages[0], femaleImages[3]] },
    { email: "noah@surf.com", firstName: "Noah", lastName: "G", gender: "male", age: 26, skillLevel: "intermediate", location: "Coronado, CA", bio: "Military surfer. Catching waves between deployments.", tricks: ["Cutback", "Snap"], images: [maleImages[1], maleImages[3]] },
    { email: "mia@surf.com", firstName: "Mia", lastName: "A", gender: "female", age: 24, skillLevel: "advanced", location: "Trestles, CA", bio: "Contest queen. Sponsor me!", tricks: ["Air", "Carving 360", "Tube Ride"], images: [femaleImages[2], femaleImages[0], femaleImages[4]] },
    { email: "liam@surf.com", firstName: "Liam", lastName: "O", gender: "male", age: 29, skillLevel: "beginner", location: "Ocean Beach, CA", bio: "Surfer in training. Wipeouts are learning!", tricks: ["Paddle Out", "Turtle Roll"], images: [maleImages[2], maleImages[0]] },
    { email: "isla@surf.com", firstName: "Isla", lastName: "E", gender: "female", age: 31, skillLevel: "pro", location: "Sunset Cliffs, CA", bio: "Surf photographer turned surfer. Living the dream.", tricks: ["Barrel", "Floater", "Re-entry"], images: [femaleImages[1], femaleImages[3], femaleImages[4]] },
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
