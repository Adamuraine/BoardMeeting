import { db } from "./db";
import { 
  profiles, swipes, locations, surfReports, trips, posts, favoriteSpots,
  type Profile, type InsertProfile, type UpdateProfileRequest,
  type Swipe, type InsertSwipe,
  type Location, type SurfReport,
  type Trip, type InsertTrip,
  type Post, type InsertPost,
  type FavoriteSpot, type InsertFavoriteSpot,
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
  getFavoriteLocations(userId: string): Promise<(Location & { reports: SurfReport[] })[]>;
  toggleFavoriteLocation(userId: string, locationId: number): Promise<void>;
  
  // Trips
  getTrips(): Promise<(Trip & { organizer: Profile })[]>;
  createTrip(trip: InsertTrip): Promise<Trip>;

  // Posts
  createPost(post: InsertPost): Promise<Post>;
  getPosts(): Promise<(Post & { user: Profile, location: Location })[]>;
  getPostsByLocation(locationId: number): Promise<(Post & { user: Profile })[]>;

  // Premium
  setPremium(userId: string, status: boolean): Promise<void>;
  
  // Seeding
  seedLocations(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // ... existing methods

  async createPost(post: InsertPost): Promise<Post> {
    const [newPost] = await db.insert(posts).values(post).returning();
    return newPost;
  }

  async getPosts(): Promise<(Post & { user: Profile, location: Location })[]> {
    const results = await db.select({
      post: posts,
      user: profiles,
      location: locations
    })
    .from(posts)
    .innerJoin(profiles, eq(posts.userId, profiles.userId))
    .innerJoin(locations, eq(posts.locationId, locations.id))
    .orderBy(desc(posts.createdAt));
    
    return results.map(r => ({ ...r.post, user: r.user, location: r.location }));
  }

  async getPostsByLocation(locationId: number): Promise<(Post & { user: Profile })[]> {
    const results = await db.select({
      post: posts,
      user: profiles
    })
    .from(posts)
    .where(eq(posts.locationId, locationId))
    .innerJoin(profiles, eq(posts.userId, profiles.userId))
    .orderBy(desc(posts.createdAt));
    
    return results.map(r => ({ ...r.post, user: r.user }));
  }
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

  async getFavoriteLocations(userId: string): Promise<(Location & { reports: SurfReport[] })[]> {
    const favorites = await db.select({ locationId: favoriteSpots.locationId })
      .from(favoriteSpots)
      .where(eq(favoriteSpots.userId, userId));
    
    if (favorites.length === 0) return [];

    const result = [];
    for (const fav of favorites) {
      const loc = await this.getLocation(fav.locationId);
      if (loc) result.push(loc);
    }
    return result;
  }

  async toggleFavoriteLocation(userId: string, locationId: number): Promise<void> {
    const [existing] = await db.select()
      .from(favoriteSpots)
      .where(and(eq(favoriteSpots.userId, userId), eq(favoriteSpots.locationId, locationId)));
    
    if (existing) {
      await db.delete(favoriteSpots).where(eq(favoriteSpots.id, existing.id));
    } else {
      await db.insert(favoriteSpots).values({ userId, locationId });
    }
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

    const spots = [
      { name: "The Rock", latitude: "33.20", longitude: "-117.38", description: "Consistent break near the harbor.", difficultyLevel: "intermediate", region: "Oceanside" },
      { name: "Forster St.", latitude: "33.19", longitude: "-117.38", description: "Popular beach break for locals.", difficultyLevel: "intermediate", region: "Oceanside" },
      { name: "Oceanside Pier", latitude: "33.19", longitude: "-117.39", description: "Iconic North County spot.", difficultyLevel: "advanced", region: "Oceanside" },
      { name: "Oceanside Harbor", latitude: "33.21", longitude: "-117.40", description: "Best on NW swells.", difficultyLevel: "advanced", region: "Oceanside" },
      { name: "Upper Trestles", latitude: "33.38", longitude: "-117.59", description: "World-class performance wave.", difficultyLevel: "intermediate", region: "San Clemente" },
    ];

    const today = new Date();
    for (const spot of spots) {
      const [loc] = await db.insert(locations).values(spot).returning();
      for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const waveHeightMin = Math.floor(Math.random() * 3) + 2;
        const waveHeightMax = waveHeightMin + Math.floor(Math.random() * 3) + 1;

        await db.insert(surfReports).values({
          locationId: loc.id,
          date: date.toISOString().split('T')[0],
          waveHeightMin,
          waveHeightMax,
          rating: waveHeightMax > 4 ? "good" : "fair",
          windDirection: "Offshore",
          windSpeed: Math.floor(Math.random() * 10) + 5,
        });
      }
    }
  }
}

export const storage = new DatabaseStorage();
