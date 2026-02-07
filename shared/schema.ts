export * from "./models/auth";
export * from "./models/chat";
import { pgTable, text, serial, integer, boolean, timestamp, varchar, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";
import { relations } from "drizzle-orm";

// === PROFILES (Extra user info) ===
export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  gender: text("gender"),
  age: integer("age"),
  skillLevel: text("skill_level").notNull(), // beginner, intermediate, advanced, pro
  location: text("location"),
  imageUrls: text("image_urls").array(),
  tricks: text("tricks").array(),
  trickGoals: text("trick_goals").array(), // Tricks user wants to learn
  trophies: text("trophies").array(), // JSON strings: {place: 1-6, contestName: string, location: string, category: 'amateur'|'pro'}
  fastestSpeed: integer("fastest_speed").default(0), // mph
  longestWave: integer("longest_wave").default(0), // yards
  biggestWave: integer("biggest_wave").default(0), // feet
  isPremium: boolean("is_premium").default(false),
  topBuddyIds: text("top_buddy_ids").array(), // Top 10 favorite buddies (user IDs)
  buddiesPublic: boolean("buddies_public").default(true), // Whether buddies list is public
  endurance: text("endurance").array(), // JSON strings: {condition: string, hours: number}
  tripExpectations: text("trip_expectations").array(), // Array of trip expectation IDs for buddy matching
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  openToGuiding: boolean("open_to_guiding").default(false), // Open to meeting/guiding travelers
  isIncompleteProfile: boolean("is_incomplete_profile").default(false), // User skipped profile setup
  trialStartedAt: timestamp("trial_started_at"), // When trial period started for incomplete profiles
  scheduleType: text("schedule_type"), // "work", "school", "none" (I don't work/study)
  availability: text("availability").array(), // JSON strings: {day: "monday"|"tuesday"|..., startTime: "06:00", endTime: "09:00"}
  messagesNotifications: boolean("messages_notifications").default(false), // Enable notifications for messages
  marketplaceNotifications: boolean("marketplace_notifications").default(false), // Enable notifications for marketplace
  tripsNotifications: boolean("trips_notifications").default(false), // Enable notifications for trips
  savedSurfSpots: text("saved_surf_spots").array(), // User's saved surf spot names for surf report page
  tripInterests: text("trip_interests").array(), // Trip interest tags (party, 420, drinks, single, etc.)
});

// === SWIPES ===
export const swipes = pgTable("swipes", {
  id: serial("id").primaryKey(),
  swiperId: varchar("swiper_id").notNull().references(() => users.id),
  swipedId: varchar("swiped_id").notNull().references(() => users.id),
  direction: text("direction").notNull(), // 'left' or 'right'
  createdAt: timestamp("created_at").defaultNow(),
});

// === LOCATIONS (Surf Spots) ===
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  description: text("description"),
  difficultyLevel: text("difficulty_level"), // beginner, intermediate, advanced
  region: text("region"),
});

// === SURF REPORTS ===
export const surfReports = pgTable("surf_reports", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull().references(() => locations.id),
  date: date("date").notNull(),
  waveHeightMin: integer("wave_height_min"), // in feet
  waveHeightMax: integer("wave_height_max"), // in feet
  rating: text("rating"), // poor, fair, good, epic
  windDirection: text("wind_direction"),
  windSpeed: integer("wind_speed"), // knots
  swellPeriodSec: integer("swell_period_sec"), // swell period in seconds
  swellDirection: text("swell_direction"), // swell direction (N, NE, E, etc)
  source: text("source").default("stormglass"), // data source
  lastUpdatedAt: timestamp("last_updated_at").defaultNow(), // when this report was fetched
});

export const insertSurfReportSchema = createInsertSchema(surfReports).omit({ id: true, lastUpdatedAt: true });

// === TRIPS ===
export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  organizerId: varchar("organizer_id").notNull().references(() => users.id),
  name: text("name"), // Trip name/title
  photos: text("photos").array(), // Trip photos URLs
  startingLocation: text("starting_location"),
  destination: text("destination").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  description: text("description"),
  cost: integer("cost"),
  tripType: text("trip_type"), // carpool, boat, resort, taxi
  isGuide: boolean("is_guide").default(false),
  isVisiting: boolean("is_visiting").default(false), // Solo traveler looking to meet locals
  activities: text("activities").array(), // Activity icons: surfboard, sandals, beer, umbrella, boat, fishing, leaf
  expectations: text("expectations"), // Trip expectations and goals
  waveType: text("wave_type").array(), // point_break, beach_break, outer_reef, beginner_crumbly, long_performance
  rideStyle: text("ride_style").array(), // performance, chill (multi-select)
  locationPreference: text("location_preference").array(), // remote, town (multi-select)
  vibe: text("vibe").array(), // party, waterTime (multi-select)
  extraActivities: text("extra_activities").array(), // fishing, spearfishing
  broadcastEnabled: boolean("broadcast_enabled").default(false),
  priceRangeMin: integer("price_range_min"), // minimum budget
  priceRangeMax: integer("price_range_max"), // maximum budget
  approximateDates: boolean("approximate_dates").default(false), // flexible on exact dates
  // Expense breakdown (shared costs)
  houseRental: integer("house_rental"), // accommodation cost
  taxiRides: integer("taxi_rides"), // ground transportation
  boatTrips: integer("boat_trips"), // boat charters
  cookingMeals: integer("cooking_meals"), // chef/food costs
  boardRental: integer("board_rental"), // board rental or travel fees
  airfare: integer("airfare"), // flight costs
  photographer: integer("photographer"), // photographer/videographer cost
});

// === TRIP PARTICIPANTS (Join Requests) ===
export const tripParticipants = pgTable("trip_participants", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => trips.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: text("status").default("pending"), // pending, approved, rejected
  requestedAt: timestamp("requested_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
});

export const insertTripParticipantSchema = createInsertSchema(tripParticipants).omit({ id: true, requestedAt: true, respondedAt: true });
export type InsertTripParticipant = z.infer<typeof insertTripParticipantSchema>;
export type TripParticipant = typeof tripParticipants.$inferSelect;

// === POSTS (Surf Photos) ===
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  locationId: integer("location_id").references(() => locations.id),
  location: text("location"),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === FAVORITE SPOTS ===
export const favoriteSpots = pgTable("favorite_spots", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  locationId: integer("location_id").notNull().references(() => locations.id),
});

// === POST LIKES (Shaka reactions) ===
export const postLikes = pgTable("post_likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// === MESSAGES ===
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  receiverId: varchar("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  read: boolean("read").default(false),
});

// === GROUP MESSAGES (Trip Group Chats) ===
export const groupMessages = pgTable("group_messages", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === USER FEEDBACK ===
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === MARKETPLACE LISTINGS ===
export const marketplaceListings = pgTable("marketplace_listings", {
  id: serial("id").primaryKey(),
  sellerId: varchar("seller_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  price: integer("price"), // Price in cents, null for "trade only" or "free"
  category: text("category").notNull(), // surfboard, wetsuit, accessories, other
  condition: text("condition").notNull(), // new, like-new, good, fair, poor
  listingType: text("listing_type").notNull(), // sell, trade, both, free
  imageUrls: text("image_urls").array(),
  location: text("location"),
  zipCode: text("zip_code"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// === SCHEMAS ===
export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true });
export const insertSwipeSchema = createInsertSchema(swipes).omit({ id: true, createdAt: true });
export const insertTripSchema = createInsertSchema(trips).omit({ id: true });
export const insertPostSchema = createInsertSchema(posts).omit({ id: true, createdAt: true });
export const insertFavoriteSpotSchema = createInsertSchema(favoriteSpots).omit({ id: true });
export const insertPostLikeSchema = createInsertSchema(postLikes).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true, read: true });
export const insertGroupMessageSchema = createInsertSchema(groupMessages).omit({ id: true, createdAt: true });
export const insertFeedbackSchema = createInsertSchema(feedback).omit({ id: true, createdAt: true });
export const insertMarketplaceListingSchema = createInsertSchema(marketplaceListings).omit({ id: true, createdAt: true });

// === TYPES ===
export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Swipe = typeof swipes.$inferSelect;
export type InsertSwipe = z.infer<typeof insertSwipeSchema>;
export type Location = typeof locations.$inferSelect;
export type SurfReport = typeof surfReports.$inferSelect;
export type InsertSurfReport = z.infer<typeof insertSurfReportSchema>;
export type Trip = typeof trips.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type FavoriteSpot = typeof favoriteSpots.$inferSelect;
export type InsertFavoriteSpot = z.infer<typeof insertFavoriteSpotSchema>;
export type PostLike = typeof postLikes.$inferSelect;
export type InsertPostLike = z.infer<typeof insertPostLikeSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type GroupMessage = typeof groupMessages.$inferSelect;
export type InsertGroupMessage = z.infer<typeof insertGroupMessageSchema>;
export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type MarketplaceListing = typeof marketplaceListings.$inferSelect;
export type InsertMarketplaceListing = z.infer<typeof insertMarketplaceListingSchema>;

// === TRIP ITINERARY ITEMS (Checklist for trip coordination) ===
export const tripItineraryItems = pgTable("trip_itinerary_items", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => trips.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  category: text("category").notNull(), // flights, car_rental, accommodation, chef, surfboards, photographer, guide, other
  title: text("title").notNull(),
  details: text("details"),
  date: text("date"),
  time: text("time"),
  referenceNumber: text("reference_number"),
  bookingUrl: text("booking_url"),
  notes: text("notes"),
  isBooked: boolean("is_booked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTripItineraryItemSchema = createInsertSchema(tripItineraryItems).omit({ id: true, createdAt: true });
export type InsertTripItineraryItem = z.infer<typeof insertTripItineraryItemSchema>;
export type TripItineraryItem = typeof tripItineraryItems.$inferSelect;

// === SURF ALERTS (Premium feature) ===
export const surfAlerts = pgTable("surf_alerts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  spotName: text("spot_name").notNull(),
  spotLat: text("spot_lat").notNull(),
  spotLng: text("spot_lng").notNull(),
  minHeight: integer("min_height").notNull(), // minimum wave height in feet
  swellDirections: text("swell_directions").array(), // N, NE, E, SE, S, SW, W, NW - null means any
  autoBlock: boolean("auto_block").default(false), // auto-block calendar when conditions met
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSurfAlertSchema = createInsertSchema(surfAlerts).omit({ id: true, createdAt: true });
export type InsertSurfAlert = z.infer<typeof insertSurfAlertSchema>;
export type SurfAlert = typeof surfAlerts.$inferSelect;

// Request Types
export type CreateProfileRequest = InsertProfile;
export type UpdateProfileRequest = Partial<InsertProfile>;
export type CreateSwipeRequest = InsertSwipe;
export type CreateTripRequest = InsertTrip;
export type CreatePostRequest = InsertPost;

// Response Types
export type ProfileResponse = Profile;
export type LocationResponse = Location & { currentReport?: SurfReport }; // Enriched location
export type PostWithUser = Post & { user: Profile };
