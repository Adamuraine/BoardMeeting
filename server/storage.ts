import { db } from "./db";
import { 
  profiles, swipes, locations, surfReports, trips,
  type Profile, type InsertProfile, type UpdateProfileRequest,
  type Swipe, type InsertSwipe,
  type Location, type SurfReport,
  type Trip, type InsertTrip,
  users
} from "@shared/schema";
import { eq, and, desc, sql, notInArray } from "drizzle-orm";
import { authStorage } from "./replit_integrations/auth";

export interface IStorage {
  // Profiles
  getProfile(userId: string): Promise<Profile | undefined>;
  getProfileById(id: number): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(userId: string, updates: UpdateProfileRequest): Promise<Profile>;
  getPotentialMatches(userId: string): Promise<Profile[]>; // Excludes already swiped
  
  // Swipes
  createSwipe(swipe: InsertSwipe): Promise<Swipe>;
  getSwipesCountToday(userId: string): Promise<number>;
  checkMatch(userId1: string, userId2: string): Promise<boolean>;

  // Locations & Reports
  getLocations(): Promise<(Location & { reports: SurfReport[] })[]>;
  getLocation(id: number): Promise<(Location & { reports: SurfReport[] }) | undefined>;
  
  // Trips
  getTrips(): Promise<(Trip & { organizer: Profile })[]>;
  createTrip(trip: InsertTrip): Promise<Trip>;

  // Premium
  setPremium(userId: string, status: boolean): Promise<void>;
  
  // Seeding
  seedLocations(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getProfile(userId: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    return profile;
  }

  async getProfileById(id: number): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, id));
    return profile;
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    const [newProfile] = await db.insert(profiles).values(profile).returning();
    return newProfile;
  }

  async updateProfile(userId: string, updates: UpdateProfileRequest): Promise<Profile> {
    const [updated] = await db
      .update(profiles)
      .set(updates)
      .where(eq(profiles.userId, userId))
      .returning();
    return updated;
  }

  async getPotentialMatches(userId: string): Promise<Profile[]> {
    // Get IDs of users already swiped by this user
    const swiped = await db.select({ swipedId: swipes.swipedId })
      .from(swipes)
      .where(eq(swipes.swiperId, userId));
    
    const swipedIds = swiped.map(s => s.swipedId);
    swipedIds.push(userId); // Exclude self

    return await db.select()
      .from(profiles)
      .where(notInArray(profiles.userId, swipedIds))
      .limit(20);
  }

  async createSwipe(swipe: InsertSwipe): Promise<Swipe> {
    const [newSwipe] = await db.insert(swipes).values(swipe).returning();
    return newSwipe;
  }

  async getSwipesCountToday(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [count] = await db
      .select({ count: sql<number>`count(*)` })
      .from(swipes)
      .where(
        and(
          eq(swipes.swiperId, userId),
          sql`${swipes.createdAt} >= ${today.toISOString()}`
        )
      );
    return Number(count.count);
  }

  async checkMatch(userId1: string, userId2: string): Promise<boolean> {
    // Check if user2 has already swiped right on user1
    const [swipe] = await db.select()
      .from(swipes)
      .where(
        and(
          eq(swipes.swiperId, userId2),
          eq(swipes.swipedId, userId1),
          eq(swipes.direction, 'right')
        )
      );
    return !!swipe;
  }

  async getLocations(): Promise<(Location & { reports: SurfReport[] })[]> {
    const locs = await db.select().from(locations);
    const result = [];
    
    for (const loc of locs) {
      const reports = await db.select()
        .from(surfReports)
        .where(eq(surfReports.locationId, loc.id))
        .orderBy(surfReports.date);
      result.push({ ...loc, reports });
    }
    return result;
  }

  async getLocation(id: number): Promise<(Location & { reports: SurfReport[] }) | undefined> {
    const [loc] = await db.select().from(locations).where(eq(locations.id, id));
    if (!loc) return undefined;
    
    const reports = await db.select()
      .from(surfReports)
      .where(eq(surfReports.locationId, id))
      .orderBy(surfReports.date);
      
    return { ...loc, reports };
  }

  async getTrips(): Promise<(Trip & { organizer: Profile })[]> {
    // Join trips with profiles
    const tripsData = await db.select({
      trip: trips,
      organizer: profiles
    })
    .from(trips)
    .innerJoin(profiles, eq(trips.organizerId, profiles.userId));
    
    return tripsData.map(({ trip, organizer }) => ({ ...trip, organizer }));
  }

  async createTrip(trip: InsertTrip): Promise<Trip> {
    const [newTrip] = await db.insert(trips).values(trip).returning();
    return newTrip;
  }

  async setPremium(userId: string, status: boolean): Promise<void> {
    await db.update(profiles)
      .set({ isPremium: status })
      .where(eq(profiles.userId, userId));
  }

  async seedLocations(): Promise<void> {
    const existing = await this.getLocations();
    if (existing.length > 0) return;

    // Seed Locations
    const spots = [
      { name: "Pipeline", latitude: "21.66", longitude: "-158.05", description: "World famous reef break.", difficultyLevel: "pro", region: "Hawaii" },
      { name: "Superbank", latitude: "-28.16", longitude: "153.55", description: "Longest hollow wave.", difficultyLevel: "advanced", region: "Australia" },
      { name: "Teahupoo", latitude: "-17.84", longitude: "-149.26", description: "Heaviest wave in the world.", difficultyLevel: "pro", region: "Tahiti" },
      { name: "Uluwatu", latitude: "-8.81", longitude: "115.08", description: "Iconic Balinese reef break.", difficultyLevel: "advanced", region: "Bali" },
      { name: "Trestles", latitude: "33.38", longitude: "-117.59", description: "Performance wave.", difficultyLevel: "intermediate", region: "California" },
    ];

    for (const spot of spots) {
      const [loc] = await db.insert(locations).values(spot).returning();
      
      // Seed Reports for 14 days
      const today = new Date();
      for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        await db.insert(surfReports).values({
          locationId: loc.id,
          date: date.toISOString().split('T')[0],
          waveHeightMin: Math.floor(Math.random() * 5) + 2,
          waveHeightMax: Math.floor(Math.random() * 5) + 6,
          rating: ["poor", "fair", "good", "epic"][Math.floor(Math.random() * 4)],
          windDirection: "Offshore",
          windSpeed: Math.floor(Math.random() * 15),
        });
      }
    }
  }
}

export const storage = new DatabaseStorage();
