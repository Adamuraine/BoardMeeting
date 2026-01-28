import { db } from "./db";
import { 
  profiles, swipes, locations, surfReports, trips, posts, favoriteSpots, postLikes, messages, feedback, tripParticipants, marketplaceListings,
  type Profile, type InsertProfile, type UpdateProfileRequest,
  type Swipe, type InsertSwipe,
  type Location, type SurfReport, type InsertSurfReport,
  type Trip, type InsertTrip,
  type Post, type InsertPost,
  type FavoriteSpot, type InsertFavoriteSpot,
  type PostLike,
  type Message, type InsertMessage,
  type Feedback,
  type TripParticipant, type InsertTripParticipant,
  type MarketplaceListing, type InsertMarketplaceListing,
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
  getAllProfiles(): Promise<Profile[]>; // All profiles for anonymous browsing
  searchProfiles(query: string, limit?: number): Promise<Profile[]>; // Search all profiles
  
  // Swipes
  createSwipe(swipe: InsertSwipe): Promise<Swipe>;
  getSwipesCountToday(userId: string): Promise<number>;
  checkMatch(userId1: string, userId2: string): Promise<boolean>;
  getMatchedBuddies(userId: string): Promise<Profile[]>;
  removeBuddy(userId: string, buddyId: string): Promise<void>;

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
  cleanupExpiredTrips(): Promise<number>;

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
  updateTrip(tripId: number, userId: string, updates: { name?: string | null; photos?: string[] | null; destination?: string; startingLocation?: string; startDate?: string; endDate?: string; expectations?: string; activities?: string[]; waveType?: string[]; rideStyle?: string[]; locationPreference?: string[]; vibe?: string[]; extraActivities?: string[]; broadcastEnabled?: boolean }): Promise<Trip>;
  updateTripDetails(tripId: number, userId: string, details: { activities?: string[]; houseRental?: number; taxiRides?: number; boatTrips?: number; cookingMeals?: number; boardRental?: number; airfare?: number; photographer?: number }): Promise<Trip>;
  
  // Surf Reports
  upsertSurfReports(locationId: number, reports: Partial<InsertSurfReport>[]): Promise<void>;
  getSurfReportsLastUpdated(locationId: number): Promise<Date | null>;
  getAllLocationsWithStaleData(maxAgeHours: number): Promise<Location[]>;
  
  // Seeding
  seedLocations(): Promise<void>;
  
  // Stripe
  getProduct(productId: string): Promise<any>;
  getSubscription(subscriptionId: string): Promise<any>;
  updateUserStripeInfo(userId: string, info: { stripeCustomerId?: string; stripeSubscriptionId?: string }): Promise<void>;
  getProfileByStripeCustomerId(customerId: string): Promise<Profile | undefined>;
  updateUserPremiumStatus(userId: string, isPremium: boolean): Promise<void>;
  
  // Trip Participants
  requestToJoinTrip(tripId: number, userId: string): Promise<TripParticipant>;
  getTripParticipants(tripId: number): Promise<(TripParticipant & { profile: Profile })[]>;
  updateParticipantStatus(tripId: number, participantUserId: string, status: string, organizerId: string): Promise<TripParticipant>;
  getUserTripStatus(tripId: number, userId: string): Promise<TripParticipant | undefined>;
  
  // Marketplace
  getMarketplaceListings(): Promise<(MarketplaceListing & { seller: Profile })[]>;
  getMarketplaceListingById(id: number): Promise<(MarketplaceListing & { seller: Profile }) | undefined>;
  getUserListings(userId: string): Promise<MarketplaceListing[]>;
  createMarketplaceListing(listing: InsertMarketplaceListing): Promise<MarketplaceListing>;
  updateMarketplaceListing(id: number, userId: string, updates: Partial<InsertMarketplaceListing>): Promise<MarketplaceListing>;
  deleteMarketplaceListing(id: number, userId: string): Promise<void>;
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
    // Get current user's profile for safety filtering
    const [currentUser] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    
    // Get IDs of users swiped RIGHT only (left swipes can reappear later)
    const rightSwiped = await db.select({ swipedId: swipes.swipedId })
      .from(swipes)
      .where(and(
        eq(swipes.swiperId, userId),
        eq(swipes.direction, 'right')
      ));
    
    const excludeIds = rightSwiped.map(s => s.swipedId);
    excludeIds.push(userId); // Exclude self
    
    // Get all profiles except right-swiped ones and self (left swipes can reappear)
    let potentialMatches = await db.select()
      .from(profiles)
      .where(notInArray(profiles.userId, excludeIds))
      .limit(100);
    
    // Safety filter: Prevent adult males (18+) from matching with underage females (<18)
    if (currentUser) {
      const userAge = currentUser.age || 0;
      const userGender = currentUser.gender?.toLowerCase();
      
      potentialMatches = potentialMatches.filter(match => {
        const matchAge = match.age || 0;
        const matchGender = match.gender?.toLowerCase();
        
        // If current user is male 18+, exclude females under 18
        if (userGender === 'male' && userAge >= 18 && matchGender === 'female' && matchAge < 18) {
          return false;
        }
        
        // If current user is female under 18, exclude males 18+
        if (userGender === 'female' && userAge < 18 && matchGender === 'male' && matchAge >= 18) {
          return false;
        }
        
        return true;
      });
    }
    
    return potentialMatches.slice(0, 20);
  }

  async getAllProfiles(): Promise<Profile[]> {
    // Get all profiles for anonymous browsing - no user filtering
    const allProfiles = await db.select()
      .from(profiles)
      .limit(100);
    return allProfiles;
  }

  async searchProfiles(query: string, limit: number = 20): Promise<Profile[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    
    // Search profiles by display name OR by user's registered first/last name
    const results = await db.select({
      id: profiles.id,
      userId: profiles.userId,
      displayName: profiles.displayName,
      bio: profiles.bio,
      gender: profiles.gender,
      age: profiles.age,
      skillLevel: profiles.skillLevel,
      location: profiles.location,
      imageUrls: profiles.imageUrls,
      tricks: profiles.tricks,
      trophies: profiles.trophies,
      fastestSpeed: profiles.fastestSpeed,
      longestWave: profiles.longestWave,
      biggestWave: profiles.biggestWave,
      isPremium: profiles.isPremium,
      topBuddyIds: profiles.topBuddyIds,
      buddiesPublic: profiles.buddiesPublic,
      endurance: profiles.endurance,
      tripExpectations: profiles.tripExpectations,
      stripeCustomerId: profiles.stripeCustomerId,
      stripeSubscriptionId: profiles.stripeSubscriptionId,
      openToGuiding: profiles.openToGuiding,
      isIncompleteProfile: profiles.isIncompleteProfile,
      trialStartedAt: profiles.trialStartedAt,
      scheduleType: profiles.scheduleType,
      availability: profiles.availability,
    })
      .from(profiles)
      .leftJoin(users, eq(profiles.userId, users.id))
      .where(
        or(
          sql`LOWER(${profiles.displayName}) LIKE ${searchTerm}`,
          sql`LOWER(${users.firstName}) LIKE ${searchTerm}`,
          sql`LOWER(${users.lastName}) LIKE ${searchTerm}`,
          sql`LOWER(${users.email}) LIKE ${searchTerm}`,
          sql`LOWER(CONCAT(${users.firstName}, ' ', ${users.lastName})) LIKE ${searchTerm}`
        )
      )
      .limit(limit);
    
    return results as Profile[];
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
    
    // Get real user IDs to filter buddies
    const realUsers = await db.select({ id: users.id })
      .from(users)
      .where(and(
        sql`${users.email} NOT LIKE '%@surf.com'`,
        sql`${users.email} NOT LIKE '%.mock'`,
        sql`${users.email} NOT LIKE '%@example.com'`,
        sql`${users.id} NOT LIKE 'mock_user_%'`,
        sql`${users.id} NOT LIKE 'test_%'`
      ));
    const realUserIds = new Set(realUsers.map(u => u.id));
    
    // Only include mutual matches that are real users
    const realMutualIds = mutualIds.filter(id => realUserIds.has(id));
    
    if (realMutualIds.length === 0) return [];
    
    // Get profiles of matched buddies (real users only)
    return await db.select()
      .from(profiles)
      .where(inArray(profiles.userId, realMutualIds));
  }

  async removeBuddy(userId: string, buddyId: string): Promise<void> {
    await db.delete(swipes)
      .where(
        or(
          and(eq(swipes.swiperId, userId), eq(swipes.swipedId, buddyId)),
          and(eq(swipes.swiperId, buddyId), eq(swipes.swipedId, userId))
        )
      );
    
    const profile = await this.getProfile(userId);
    if (profile?.topBuddyIds?.includes(buddyId)) {
      const newTopBuddyIds = profile.topBuddyIds.filter((id: string) => id !== buddyId);
      await this.updateProfile(userId, { topBuddyIds: newTopBuddyIds });
    }
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

  async cleanupExpiredTrips(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = await db.delete(trips)
      .where(sql`${trips.endDate} < ${today}`)
      .returning();
    
    return result.length;
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
    console.log(`[MESSAGES] Getting conversations for user ${userId}`);
    
    const allMessages = await db.select()
      .from(messages)
      .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)))
      .orderBy(desc(messages.createdAt));
    
    console.log(`[MESSAGES] Found ${allMessages.length} messages for user ${userId}`);
    
    const buddyMap = new Map<string, { lastMessage: Message; unreadCount: number }>();
    
    for (const msg of allMessages) {
      const buddyId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!buddyMap.has(buddyId)) {
        const unreadCount = allMessages.filter(m => 
          m.senderId === buddyId && m.receiverId === userId && !m.read
        ).length;
        buddyMap.set(buddyId, { lastMessage: msg, unreadCount });
        console.log(`[MESSAGES] Added conversation with buddy ${buddyId}, unread: ${unreadCount}`);
      }
    }
    
    const result: { buddy: Profile; lastMessage: Message; unreadCount: number }[] = [];
    const entries = Array.from(buddyMap.entries());
    for (let i = 0; i < entries.length; i++) {
      const [buddyId, data] = entries[i];
      const buddy = await this.getProfile(buddyId);
      if (buddy) {
        result.push({ buddy, ...data });
      } else {
        // Buddy profile not found - try to get user info and create placeholder
        console.log(`[MESSAGES] Profile not found for buddy ${buddyId}, checking if user exists`);
        const [user] = await db.select().from(users).where(eq(users.id, buddyId));
        if (user) {
          // Create a placeholder profile for display purposes
          const placeholderProfile: Profile = {
            id: 0,
            userId: buddyId,
            displayName: user.firstName || 'Unknown User',
            bio: '',
            gender: null,
            age: null,
            skillLevel: 'kook',
            location: '',
            imageUrls: [],
            tricks: null,
            trophies: null,
            fastestSpeed: 0,
            longestWave: 0,
            biggestWave: 0,
            isPremium: false,
            topBuddyIds: null,
            buddiesPublic: true,
            endurance: null,
            tripExpectations: null,
            stripeCustomerId: null,
            stripeSubscriptionId: null,
            openToGuiding: false,
            isIncompleteProfile: true,
            trialStartedAt: null,
            scheduleType: null,
            availability: null,
          };
          result.push({ buddy: placeholderProfile, ...data });
          console.log(`[MESSAGES] Created placeholder profile for user ${buddyId} (${user.firstName})`);
        } else {
          console.log(`[MESSAGES] User ${buddyId} not found in users table, skipping conversation`);
        }
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

  async upsertSurfReports(locationId: number, reports: Partial<InsertSurfReport>[]): Promise<void> {
    for (const report of reports) {
      if (!report.date) continue;
      
      const [existing] = await db.select()
        .from(surfReports)
        .where(and(
          eq(surfReports.locationId, locationId),
          eq(surfReports.date, report.date)
        ));
      
      if (existing) {
        await db.update(surfReports)
          .set({ 
            ...report, 
            locationId,
            lastUpdatedAt: new Date() 
          })
          .where(eq(surfReports.id, existing.id));
      } else {
        await db.insert(surfReports).values({
          ...report,
          locationId,
          date: report.date,
        });
      }
    }
  }

  async getSurfReportsLastUpdated(locationId: number): Promise<Date | null> {
    const [report] = await db.select({ lastUpdatedAt: surfReports.lastUpdatedAt })
      .from(surfReports)
      .where(eq(surfReports.locationId, locationId))
      .orderBy(desc(surfReports.lastUpdatedAt))
      .limit(1);
    
    return report?.lastUpdatedAt ?? null;
  }

  async getAllLocationsWithStaleData(maxAgeHours: number): Promise<Location[]> {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - maxAgeHours);
    
    const allLocs = await db.select().from(locations);
    const staleLocs: Location[] = [];
    
    for (const loc of allLocs) {
      const lastUpdated = await this.getSurfReportsLastUpdated(loc.id);
      if (!lastUpdated || lastUpdated < cutoff) {
        staleLocs.push(loc);
      }
    }
    
    return staleLocs;
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
        email: `${u.name.toLowerCase()}@boardmeeting.mock`,
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

  async updateTrip(tripId: number, userId: string, updates: { name?: string | null; photos?: string[] | null; destination?: string; startingLocation?: string; startDate?: string; endDate?: string; expectations?: string; activities?: string[]; waveType?: string[]; rideStyle?: string[]; locationPreference?: string[]; vibe?: string[]; extraActivities?: string[]; broadcastEnabled?: boolean }): Promise<Trip> {
    const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));
    if (!trip) throw new Error("Trip not found");
    if (trip.organizerId !== userId) throw new Error("Not authorized to update this trip");
    
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.photos !== undefined) updateData.photos = updates.photos;
    if (updates.destination !== undefined) updateData.destination = updates.destination;
    if (updates.startingLocation !== undefined) updateData.startingLocation = updates.startingLocation;
    if (updates.startDate !== undefined) updateData.startDate = updates.startDate;
    if (updates.endDate !== undefined) updateData.endDate = updates.endDate;
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

  async updateTripDetails(tripId: number, userId: string, details: { activities?: string[]; houseRental?: number; taxiRides?: number; boatTrips?: number; cookingMeals?: number; boardRental?: number; airfare?: number; photographer?: number }): Promise<Trip> {
    const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));
    if (!trip) throw new Error("Trip not found");
    if (trip.organizerId !== userId) throw new Error("Not authorized to update this trip");
    
    const updateData: any = {};
    if (details.activities !== undefined) updateData.activities = details.activities;
    if (details.houseRental !== undefined) updateData.houseRental = details.houseRental;
    if (details.taxiRides !== undefined) updateData.taxiRides = details.taxiRides;
    if (details.boatTrips !== undefined) updateData.boatTrips = details.boatTrips;
    if (details.cookingMeals !== undefined) updateData.cookingMeals = details.cookingMeals;
    if (details.boardRental !== undefined) updateData.boardRental = details.boardRental;
    if (details.airfare !== undefined) updateData.airfare = details.airfare;
    if (details.photographer !== undefined) updateData.photographer = details.photographer;
    
    // Also update total cost (excludes airfare - everyone pays their own ticket)
    const totalCost = (details.houseRental || trip.houseRental || 0) + 
                      (details.taxiRides || trip.taxiRides || 0) + 
                      (details.boatTrips || trip.boatTrips || 0) + 
                      (details.cookingMeals || trip.cookingMeals || 0) + 
                      (details.boardRental || trip.boardRental || 0) +
                      (details.photographer || trip.photographer || 0);
    updateData.cost = totalCost;
    
    const [updated] = await db.update(trips)
      .set(updateData)
      .where(eq(trips.id, tripId))
      .returning();
    return updated;
  }

  async getProduct(productId: string): Promise<any> {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE id = ${productId}`
    );
    return result.rows[0] || null;
  }

  async getSubscription(subscriptionId: string): Promise<any> {
    const result = await db.execute(
      sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId}`
    );
    return result.rows[0] || null;
  }

  async updateUserStripeInfo(userId: string, info: { stripeCustomerId?: string; stripeSubscriptionId?: string }): Promise<void> {
    const profile = await this.getProfile(userId);
    if (!profile) return;
    
    const updateData: any = {};
    if (info.stripeCustomerId !== undefined) updateData.stripeCustomerId = info.stripeCustomerId || null;
    if (info.stripeSubscriptionId !== undefined) updateData.stripeSubscriptionId = info.stripeSubscriptionId || null;
    
    if (Object.keys(updateData).length > 0) {
      await db.update(profiles).set(updateData).where(eq(profiles.userId, userId));
    }
  }
  
  async getProfileByStripeCustomerId(customerId: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.stripeCustomerId, customerId));
    return profile;
  }
  
  async updateUserPremiumStatus(userId: string, isPremium: boolean): Promise<void> {
    await db.update(profiles).set({ isPremium }).where(eq(profiles.userId, userId));
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

  // Trip Participants
  async requestToJoinTrip(tripId: number, userId: string): Promise<TripParticipant> {
    // Check if already requested
    const existing = await db.select().from(tripParticipants)
      .where(and(eq(tripParticipants.tripId, tripId), eq(tripParticipants.userId, userId)));
    if (existing.length > 0) {
      return existing[0];
    }
    const [participant] = await db.insert(tripParticipants)
      .values({ tripId, userId, status: "pending" })
      .returning();
    return participant;
  }

  async getTripParticipants(tripId: number): Promise<(TripParticipant & { profile: Profile })[]> {
    const results = await db.select({
      participant: tripParticipants,
      profile: profiles
    })
      .from(tripParticipants)
      .innerJoin(profiles, eq(tripParticipants.userId, profiles.userId))
      .where(eq(tripParticipants.tripId, tripId));
    
    return results.map(r => ({ ...r.participant, profile: r.profile }));
  }

  async updateParticipantStatus(tripId: number, participantUserId: string, status: string, organizerId: string): Promise<TripParticipant> {
    // Verify organizer owns the trip
    const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));
    if (!trip || trip.organizerId !== organizerId) {
      throw new Error("Not authorized to update this trip");
    }
    
    const [updated] = await db.update(tripParticipants)
      .set({ status, respondedAt: new Date() })
      .where(and(eq(tripParticipants.tripId, tripId), eq(tripParticipants.userId, participantUserId)))
      .returning();
    return updated;
  }

  async getUserTripStatus(tripId: number, userId: string): Promise<TripParticipant | undefined> {
    const [result] = await db.select().from(tripParticipants)
      .where(and(eq(tripParticipants.tripId, tripId), eq(tripParticipants.userId, userId)));
    return result;
  }

  // Marketplace methods
  async getMarketplaceListings(): Promise<(MarketplaceListing & { seller: Profile })[]> {
    const results = await db.select({
      listing: marketplaceListings,
      seller: profiles
    })
    .from(marketplaceListings)
    .innerJoin(profiles, eq(marketplaceListings.sellerId, profiles.userId))
    .where(eq(marketplaceListings.isActive, true))
    .orderBy(desc(marketplaceListings.createdAt));
    
    return results.map(r => ({ ...r.listing, seller: r.seller }));
  }

  async getMarketplaceListingById(id: number): Promise<(MarketplaceListing & { seller: Profile }) | undefined> {
    const [result] = await db.select({
      listing: marketplaceListings,
      seller: profiles
    })
    .from(marketplaceListings)
    .innerJoin(profiles, eq(marketplaceListings.sellerId, profiles.userId))
    .where(eq(marketplaceListings.id, id));
    
    if (!result) return undefined;
    return { ...result.listing, seller: result.seller };
  }

  async getUserListings(userId: string): Promise<MarketplaceListing[]> {
    return await db.select()
      .from(marketplaceListings)
      .where(eq(marketplaceListings.sellerId, userId))
      .orderBy(desc(marketplaceListings.createdAt));
  }

  async createMarketplaceListing(listing: InsertMarketplaceListing): Promise<MarketplaceListing> {
    const [newListing] = await db.insert(marketplaceListings).values(listing).returning();
    return newListing;
  }

  async updateMarketplaceListing(id: number, userId: string, updates: Partial<InsertMarketplaceListing>): Promise<MarketplaceListing> {
    const [existing] = await db.select().from(marketplaceListings).where(eq(marketplaceListings.id, id));
    if (!existing) throw new Error("Listing not found");
    if (existing.sellerId !== userId) throw new Error("Not authorized to update this listing");
    
    const [updated] = await db.update(marketplaceListings)
      .set(updates)
      .where(eq(marketplaceListings.id, id))
      .returning();
    return updated;
  }

  async deleteMarketplaceListing(id: number, userId: string): Promise<void> {
    const [existing] = await db.select().from(marketplaceListings).where(eq(marketplaceListings.id, id));
    if (!existing) throw new Error("Listing not found");
    if (existing.sellerId !== userId) throw new Error("Not authorized to delete this listing");
    
    await db.delete(marketplaceListings).where(eq(marketplaceListings.id, id));
  }
}

export const storage = new DatabaseStorage();
