import { db } from "./db";
import { 
  profiles, swipes, locations, surfReports, trips, posts, favoriteSpots, postLikes, messages, feedback,
  type Profile, type InsertProfile, type UpdateProfileRequest,
  type Swipe, type InsertSwipe,
  type Location, type SurfReport,
  type Trip, type InsertTrip,
  type Post, type InsertPost,
  type FavoriteSpot, type InsertFavoriteSpot,
  type PostLike,
  type Message, type InsertMessage,
  type Feedback,
  users
} from "@shared/schema";
import { eq, and, desc, sql, notInArray, inArray, or } from "drizzle-orm";
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
  getMatchedBuddies(userId: string): Promise<Profile[]>;

  // Locations & Reports
  getLocations(): Promise<(Location & { reports: SurfReport[] })[]>;
  getLocation(id: number): Promise<(Location & { reports: SurfReport[] }) | undefined>;
  getFavoriteLocations(userId: string): Promise<(Location & { reports: SurfReport[] })[]>;
  toggleFavoriteLocation(userId: string, locationId: number): Promise<void>;
  
  // Trips
  getTrips(): Promise<(Trip & { organizer: Profile })[]>;
  getUserTrips(userId: string): Promise<Trip[]>;
  getTripById(tripId: number): Promise<(Trip & { organizer: Profile }) | undefined>;
  getBroadcastTrips(): Promise<(Trip & { organizer: Profile })[]>;
  createTrip(trip: InsertTrip): Promise<Trip>;

  // Posts
  createPost(post: InsertPost): Promise<Post>;
  getPosts(): Promise<(Post & { user: Profile, location: Location })[]>;
  getPostsByLocation(locationId: number): Promise<(Post & { user: Profile })[]>;

  // Post Likes (Shaka)
  togglePostLike(postId: number, userId: string): Promise<boolean>;
  getPostLikesCount(postId: number): Promise<number>;
  hasUserLikedPost(postId: number, userId: string): Promise<boolean>;

  // Premium
  setPremium(userId: string, status: boolean): Promise<void>;

  // Messages
  getConversations(userId: string): Promise<{ buddy: Profile; lastMessage: Message; unreadCount: number }[]>;
  getMessages(userId: string, buddyId: string): Promise<Message[]>;
  sendMessage(message: InsertMessage): Promise<Message>;
  markMessagesRead(userId: string, buddyId: string): Promise<void>;
  
  // Account Management
  clearAllMessages(userId: string): Promise<void>;
  clearAllMatches(userId: string): Promise<void>;
  deleteUserAccount(userId: string): Promise<void>;
  submitFeedback(userId: string, content: string): Promise<Feedback>;
  
  // Trip Activities
  updateTripActivities(tripId: number, userId: string, activities: string[]): Promise<Trip>;
  updateTrip(tripId: number, userId: string, updates: { expectations?: string; activities?: string[]; waveType?: string; rideStyle?: string; locationPreference?: string; vibe?: string; extraActivities?: string[]; broadcastEnabled?: boolean }): Promise<Trip>;
  
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

  async getMatchedBuddies(userId: string): Promise<Profile[]> {
    // Get all users this person swiped right on
    const myRightSwipes = await db.select({ swipedId: swipes.swipedId })
      .from(swipes)
      .where(
        and(
          eq(swipes.swiperId, userId),
          eq(swipes.direction, 'right')
        )
      );
    
    if (myRightSwipes.length === 0) return [];
    
    const mySwipedIds = myRightSwipes.map(s => s.swipedId);
    
    // Find mutual matches - users who also swiped right on me
    const mutualSwipes = await db.select({ swiperId: swipes.swiperId })
      .from(swipes)
      .where(
        and(
          inArray(swipes.swiperId, mySwipedIds),
          eq(swipes.swipedId, userId),
          eq(swipes.direction, 'right')
        )
      );
    
    if (mutualSwipes.length === 0) return [];
    
    const mutualIds = mutualSwipes.map(s => s.swiperId);
    
    // Get profiles of matched buddies
    return await db.select()
      .from(profiles)
      .where(inArray(profiles.userId, mutualIds));
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

  async getUserTrips(userId: string): Promise<Trip[]> {
    return await db.select()
      .from(trips)
      .where(eq(trips.organizerId, userId))
      .orderBy(trips.startDate);
  }

  async createTrip(trip: InsertTrip): Promise<Trip> {
    const [newTrip] = await db.insert(trips).values(trip).returning();
    return newTrip;
  }

  async getTripById(tripId: number): Promise<(Trip & { organizer: Profile }) | undefined> {
    const [result] = await db.select({
      trip: trips,
      organizer: profiles
    })
    .from(trips)
    .innerJoin(profiles, eq(trips.organizerId, profiles.userId))
    .where(eq(trips.id, tripId));
    
    if (!result) return undefined;
    return { ...result.trip, organizer: result.organizer };
  }

  async getBroadcastTrips(): Promise<(Trip & { organizer: Profile })[]> {
    const tripsData = await db.select({
      trip: trips,
      organizer: profiles
    })
    .from(trips)
    .innerJoin(profiles, eq(trips.organizerId, profiles.userId))
    .where(eq(trips.broadcastEnabled, true));
    
    return tripsData.map(({ trip, organizer }) => ({ ...trip, organizer }));
  }

  async setPremium(userId: string, status: boolean): Promise<void> {
    await db.update(profiles)
      .set({ isPremium: status })
      .where(eq(profiles.userId, userId));
  }

  async togglePostLike(postId: number, userId: string): Promise<boolean> {
    const [existing] = await db.select()
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
    
    if (existing) {
      await db.delete(postLikes).where(eq(postLikes.id, existing.id));
      return false;
    } else {
      await db.insert(postLikes).values({ postId, userId });
      return true;
    }
  }

  async getPostLikesCount(postId: number): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(postLikes)
      .where(eq(postLikes.postId, postId));
    return Number(result.count);
  }

  async hasUserLikedPost(postId: number, userId: string): Promise<boolean> {
    const [existing] = await db.select()
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
    return !!existing;
  }

  async getConversations(userId: string): Promise<{ buddy: Profile; lastMessage: Message; unreadCount: number }[]> {
    const allMessages = await db.select()
      .from(messages)
      .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)))
      .orderBy(desc(messages.createdAt));
    
    const buddyMap = new Map<string, { lastMessage: Message; unreadCount: number }>();
    
    for (const msg of allMessages) {
      const buddyId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!buddyMap.has(buddyId)) {
        const unreadCount = allMessages.filter(m => 
          m.senderId === buddyId && m.receiverId === userId && !m.read
        ).length;
        buddyMap.set(buddyId, { lastMessage: msg, unreadCount });
      }
    }
    
    const result: { buddy: Profile; lastMessage: Message; unreadCount: number }[] = [];
    const entries = Array.from(buddyMap.entries());
    for (let i = 0; i < entries.length; i++) {
      const [buddyId, data] = entries[i];
      const buddy = await this.getProfile(buddyId);
      if (buddy) {
        result.push({ buddy, ...data });
      }
    }
    
    return result;
  }

  async getMessages(userId: string, buddyId: string): Promise<Message[]> {
    return await db.select()
      .from(messages)
      .where(
        or(
          and(eq(messages.senderId, userId), eq(messages.receiverId, buddyId)),
          and(eq(messages.senderId, buddyId), eq(messages.receiverId, userId))
        )
      )
      .orderBy(messages.createdAt);
  }

  async sendMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async markMessagesRead(userId: string, buddyId: string): Promise<void> {
    await db.update(messages)
      .set({ read: true })
      .where(
        and(
          eq(messages.senderId, buddyId),
          eq(messages.receiverId, userId),
          eq(messages.read, false)
        )
      );
  }

  async seedLocations(): Promise<void> {
    const existing = await this.getLocations();
    
    if (existing.length === 0) {
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
    
    await this.seedMockProfiles();
  }

  async seedMockProfiles(): Promise<void> {
    const existingMockProfiles = await db.select().from(profiles).where(sql`${profiles.userId} LIKE 'mock_user_%'`);
    if (existingMockProfiles.length >= 20) return;

    // Male surfers in action - verified working URLs
    const maleSurfAction = [
      "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=800&q=80",
      "https://images.unsplash.com/photo-1455729552865-3658a5d39692?w=800&q=80",
      "https://images.unsplash.com/photo-1509914398892-963f53e6e2f1?w=800&q=80",
      "https://images.unsplash.com/photo-1600077106724-946750eeaf3c?w=800&q=80",
      "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80",
    ];
    // Male lifestyle photos (no headshots)
    const maleLifestyle = [
      "https://images.unsplash.com/photo-1505459668311-8dfac7952bf0?w=800&q=80",
      "https://images.unsplash.com/photo-1520116468816-95b69f847357?w=800&q=80",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
    ];
    
    // Female surfers in action - verified working URLs
    const femaleSurfAction = [
      "https://images.unsplash.com/photo-1506477331477-33d5d8b3dc85?w=800&q=80",
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80",
      "https://images.unsplash.com/photo-1502933691298-84fc14542831?w=800&q=80",
      "https://images.unsplash.com/photo-1537519646099-335112f03225?w=800&q=80",
      "https://images.unsplash.com/photo-1510218830377-2e994ea9087d?w=800&q=80",
    ];
    // Female lifestyle photos (no headshots)
    const femaleLifestyle = [
      "https://images.unsplash.com/photo-1510218830377-2e994ea9087d?w=800&q=80",
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
      "https://images.unsplash.com/photo-1505459668311-8dfac7952bf0?w=800&q=80",
    ];

    // Build gallery: surf action first, lifestyle mixed in lower positions
    const buildMaleGallery = (idx: number) => {
      const surf1 = maleSurfAction[idx % maleSurfAction.length];
      const surf2 = maleSurfAction[(idx + 1) % maleSurfAction.length];
      const surf3 = maleSurfAction[(idx + 2) % maleSurfAction.length];
      const lifestyle = maleLifestyle[idx % maleLifestyle.length];
      return [surf1, surf2, lifestyle, surf3];
    };
    const buildFemaleGallery = (idx: number) => {
      const surf1 = femaleSurfAction[idx % femaleSurfAction.length];
      const surf2 = femaleSurfAction[(idx + 1) % femaleSurfAction.length];
      const surf3 = femaleSurfAction[(idx + 2) % femaleSurfAction.length];
      const lifestyle = femaleLifestyle[idx % femaleLifestyle.length];
      return [surf1, surf2, lifestyle, surf3];
    };

    const mockUsers = [
      { name: "Jake", gender: "male", age: 28, skill: "advanced", bio: "Chasing barrels up and down the coast. Love early dawn sessions.", location: "Oceanside, CA", tricks: ["Tube Ride", "Cutback", "Floater"] },
      { name: "Mia", gender: "female", age: 24, skill: "intermediate", bio: "Weekend warrior learning to shred. Looking for surf buddies!", location: "Encinitas, CA", tricks: ["Pop-up", "Bottom Turn"] },
      { name: "Carlos", gender: "male", age: 32, skill: "pro", bio: "Former WSL competitor. Now coaching and free surfing.", location: "San Clemente, CA", tricks: ["Aerial", "Barrel Roll", "Carve"] },
      { name: "Sophie", gender: "female", age: 26, skill: "advanced", bio: "Longboarder at heart. Cross-stepping is my jam.", location: "Cardiff, CA", tricks: ["Cross-step", "Hang Ten", "Nose Ride"] },
      { name: "Kai", gender: "male", age: 22, skill: "intermediate", bio: "Just moved from Hawaii. Missing those reef breaks!", location: "Carlsbad, CA", tricks: ["Duck Dive", "Snap"] },
      { name: "Emma", gender: "female", age: 29, skill: "advanced", bio: "Surf photographer who also rips. Catch me at Trestles.", location: "San Clemente, CA", tricks: ["Roundhouse Cutback", "Off the Lip"] },
      { name: "Tyler", gender: "male", age: 35, skill: "pro", bio: "Big wave hunter. Mavericks regular when it's firing.", location: "Oceanside, CA", tricks: ["Big Wave Charging", "Gun Riding"] },
      { name: "Luna", gender: "female", age: 23, skill: "beginner", bio: "New to surfing but totally hooked! Looking for patient surf partners.", location: "Del Mar, CA", tricks: ["Pop-up", "Paddling"] },
      { name: "Bryce", gender: "male", age: 27, skill: "advanced", bio: "Dawn patrol every day before work. The stoke is real.", location: "Leucadia, CA", tricks: ["Floater", "Re-entry", "Carve"] },
      { name: "Jade", gender: "female", age: 31, skill: "intermediate", bio: "Former competitive swimmer turned surfer. Water is my home.", location: "La Jolla, CA", tricks: ["Duck Dive", "Bottom Turn"] },
      { name: "Marcus", gender: "male", age: 25, skill: "advanced", bio: "Shortboard shredder. Progressive airs are the goal.", location: "Oceanside, CA", tricks: ["Air Reverse", "Alley Oop"] },
      { name: "Aria", gender: "female", age: 28, skill: "pro", bio: "Surf coach and yoga instructor. Balance is everything.", location: "Encinitas, CA", tricks: ["Tube Ride", "Soul Arch"] },
      { name: "Diego", gender: "male", age: 30, skill: "intermediate", bio: "Weekend surfer, weekday engineer. Living the dream.", location: "Carlsbad, CA", tricks: ["Cutback", "Floater"] },
      { name: "Sienna", gender: "female", age: 21, skill: "beginner", bio: "College student catching waves between classes.", location: "Pacific Beach, CA", tricks: ["Pop-up", "Turtle Roll"] },
      { name: "Finn", gender: "male", age: 34, skill: "advanced", bio: "Fish board enthusiast. Small wave specialist.", location: "Cardiff, CA", tricks: ["Layback", "Trim"] },
      { name: "Zara", gender: "female", age: 27, skill: "advanced", bio: "Traveled the world for waves. Indo is my happy place.", location: "Oceanside, CA", tricks: ["Barrel", "Frontside Snap"] },
      { name: "Noah", gender: "male", age: 29, skill: "intermediate", bio: "Firefighter by day, surfer by...also day. Living the SoCal life.", location: "Solana Beach, CA", tricks: ["Bottom Turn", "Top Turn"] },
      { name: "Ivy", gender: "female", age: 25, skill: "advanced", bio: "Competitive longboarder. Gliding is living.", location: "San Onofre, CA", tricks: ["Nose Ride", "Drop Knee Turn"] },
      { name: "Ethan", gender: "male", age: 26, skill: "pro", bio: "Sponsored rider. Chasing swells from here to Bali.", location: "Huntington Beach, CA", tricks: ["Full Rotation", "Superman"] },
      { name: "Chloe", gender: "female", age: 30, skill: "intermediate", bio: "Mom of two who escapes to the ocean whenever possible.", location: "Oceanside, CA", tricks: ["Cutback", "Floater"] },
    ];

    const locationIds = await db.select({ id: locations.id }).from(locations);
    const locIds = locationIds.map(l => l.id);

    let maleIdx = 0;
    let femaleIdx = 0;
    for (let i = 0; i < mockUsers.length; i++) {
      const u = mockUsers[i];
      const fakeUserId = `mock_user_${i + 1}`;
      
      await db.insert(users).values({
        id: fakeUserId,
        email: `${u.name.toLowerCase()}@surftribe.mock`,
        firstName: u.name,
        lastName: "Surfer",
      }).onConflictDoNothing();

      // Gender-appropriate images - surf action first, lifestyle mixed in
      const imageUrls = u.gender === "female" 
        ? buildFemaleGallery(femaleIdx++)
        : buildMaleGallery(maleIdx++);

      await db.insert(profiles).values({
        userId: fakeUserId,
        displayName: u.name,
        bio: u.bio,
        gender: u.gender,
        age: u.age,
        skillLevel: u.skill,
        location: u.location,
        imageUrls,
        tricks: u.tricks,
        fastestSpeed: Math.floor(Math.random() * 15) + 10,
        longestWave: Math.floor(Math.random() * 200) + 50,
        biggestWave: Math.floor(Math.random() * 8) + 3,
        isPremium: Math.random() > 0.7,
      }).onConflictDoNothing();
    }

    await this.seedMockPosts(locIds);
  }

  // Account Management Methods
  async clearAllMessages(userId: string): Promise<void> {
    await db.delete(messages).where(
      or(
        eq(messages.senderId, userId),
        eq(messages.receiverId, userId)
      )
    );
  }

  async clearAllMatches(userId: string): Promise<void> {
    await db.delete(swipes).where(
      or(
        eq(swipes.swiperId, userId),
        eq(swipes.swipedId, userId)
      )
    );
  }

  async deleteUserAccount(userId: string): Promise<void> {
    // Delete all user data in order (respecting foreign key constraints)
    await db.delete(messages).where(
      or(
        eq(messages.senderId, userId),
        eq(messages.receiverId, userId)
      )
    );
    await db.delete(postLikes).where(eq(postLikes.userId, userId));
    await db.delete(posts).where(eq(posts.userId, userId));
    await db.delete(favoriteSpots).where(eq(favoriteSpots.userId, userId));
    await db.delete(swipes).where(
      or(
        eq(swipes.swiperId, userId),
        eq(swipes.swipedId, userId)
      )
    );
    await db.delete(trips).where(eq(trips.organizerId, userId));
    await db.delete(feedback).where(eq(feedback.userId, userId));
    await db.delete(profiles).where(eq(profiles.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }

  async submitFeedback(userId: string, content: string): Promise<Feedback> {
    const [newFeedback] = await db.insert(feedback).values({
      userId,
      content,
    }).returning();
    return newFeedback;
  }

  async updateTripActivities(tripId: number, userId: string, activities: string[]): Promise<Trip> {
    const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));
    if (!trip) throw new Error("Trip not found");
    if (trip.organizerId !== userId) throw new Error("Not authorized to update this trip");
    
    const [updated] = await db.update(trips)
      .set({ activities })
      .where(eq(trips.id, tripId))
      .returning();
    return updated;
  }

  async updateTrip(tripId: number, userId: string, updates: { expectations?: string; activities?: string[]; waveType?: string; rideStyle?: string; locationPreference?: string; vibe?: string; extraActivities?: string[]; broadcastEnabled?: boolean }): Promise<Trip> {
    const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));
    if (!trip) throw new Error("Trip not found");
    if (trip.organizerId !== userId) throw new Error("Not authorized to update this trip");
    
    const updateData: Partial<{ expectations: string; activities: string[]; waveType: string; rideStyle: string; locationPreference: string; vibe: string; extraActivities: string[]; broadcastEnabled: boolean }> = {};
    if (updates.expectations !== undefined) updateData.expectations = updates.expectations;
    if (updates.activities !== undefined) updateData.activities = updates.activities;
    if (updates.waveType !== undefined) updateData.waveType = updates.waveType;
    if (updates.rideStyle !== undefined) updateData.rideStyle = updates.rideStyle;
    if (updates.locationPreference !== undefined) updateData.locationPreference = updates.locationPreference;
    if (updates.vibe !== undefined) updateData.vibe = updates.vibe;
    if (updates.extraActivities !== undefined) updateData.extraActivities = updates.extraActivities;
    if (updates.broadcastEnabled !== undefined) updateData.broadcastEnabled = updates.broadcastEnabled;
    
    const [updated] = await db.update(trips)
      .set(updateData)
      .where(eq(trips.id, tripId))
      .returning();
    return updated;
  }

  async seedMockPosts(locationIds: number[]): Promise<void> {
    const existingPosts = await db.select().from(posts);
    if (existingPosts.length > 0) return;

    const surfPhotos = [
      { url: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=800&q=80", caption: "Epic morning session at the pier!" },
      { url: "https://images.unsplash.com/photo-1455264745730-cb3b76250ae8?w=800&q=80", caption: "Caught this beauty at sunrise" },
      { url: "https://images.unsplash.com/photo-1509914398892-963f53e6e2f1?w=800&q=80", caption: "Glassy conditions all day" },
      { url: "https://images.unsplash.com/photo-1531722569936-825d3dd91b15?w=800&q=80", caption: "Finally got my first barrel!" },
      { url: "https://images.unsplash.com/photo-1527769929977-c341ee9f2e66?w=800&q=80", caption: "Perfect peelers today" },
      { url: "https://images.unsplash.com/photo-1600077106724-946750eeaf3c?w=800&q=80", caption: "Dawn patrol never disappoints" },
      { url: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&q=80", caption: "Sunset session was magical" },
      { url: "https://images.unsplash.com/photo-1505459668311-8dfac7952bf0?w=800&q=80", caption: "Clean lines at Trestles" },
      { url: "https://images.unsplash.com/photo-1484264883846-5d0df33f3b67?w=800&q=80", caption: "Offshore winds making it perfect" },
      { url: "https://images.unsplash.com/photo-1581610186406-5f6e9f9edbc1?w=800&q=80", caption: "Small but fun!" },
      { url: "https://images.unsplash.com/photo-1531859663742-44d8e2a61ad4?w=800&q=80", caption: "Nothing like a late afternoon glass-off" },
      { url: "https://images.unsplash.com/photo-1502933691298-84fc14542831?w=800&q=80", caption: "Stoked on this wave!" },
      { url: "https://images.unsplash.com/photo-1539857284950-98bea9b83e06?w=800&q=80", caption: "The harbor was pumping" },
      { url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80", caption: "Post-session vibes" },
      { url: "https://images.unsplash.com/photo-1462392246754-28dfa2df8e6b?w=800&q=80", caption: "Crystal clear water today" },
      { url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80", caption: "Beach day perfection" },
      { url: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80", caption: "Head high and hollow!" },
      { url: "https://images.unsplash.com/photo-1506953823645-3a08c6f1b7a8?w=800&q=80", caption: "Surfed until my arms gave out" },
      { url: "https://images.unsplash.com/photo-1535924472843-c6973e251cc3?w=800&q=80", caption: "Fun ones with friends" },
      { url: "https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?w=800&q=80", caption: "The coast never gets old" },
    ];

    for (let i = 0; i < 20; i++) {
      const photo = surfPhotos[i % surfPhotos.length];
      const userId = `mock_user_${(i % 20) + 1}`;
      const locationId = locationIds[i % locationIds.length];

      await db.insert(posts).values({
        userId,
        locationId,
        imageUrl: photo.url,
        caption: photo.caption,
      });
    }
  }
}

export const storage = new DatabaseStorage();
