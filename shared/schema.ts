export * from "./models/auth";
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
  trophies: text("trophies").array(), // JSON strings: {place: 1-6, contestName: string, location: string, category: 'amateur'|'pro'}
  fastestSpeed: integer("fastest_speed").default(0), // mph
  longestWave: integer("longest_wave").default(0), // yards
  biggestWave: integer("biggest_wave").default(0), // feet
  isPremium: boolean("is_premium").default(false),
  topBuddyIds: text("top_buddy_ids").array(), // Top 10 favorite buddies (user IDs)
  buddiesPublic: boolean("buddies_public").default(true), // Whether buddies list is public
  endurance: text("endurance").array(), // JSON strings: {condition: string, hours: number}
  tripExpectations: text("trip_expectations").array(), // Array of trip expectation IDs for buddy matching
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
});

// === TRIPS ===
export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  organizerId: varchar("organizer_id").notNull().references(() => users.id),
  startingLocation: text("starting_location"),
  destination: text("destination").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  description: text("description"),
  cost: integer("cost"),
  tripType: text("trip_type"), // carpool, boat, resort, taxi
  isGuide: boolean("is_guide").default(false),
  isVisiting: boolean("is_visiting").default(false), // Solo traveler looking to meet locals
});

// === POSTS (Surf Photos) ===
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  locationId: integer("location_id").notNull().references(() => locations.id),
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

// === SCHEMAS ===
export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true });
export const insertSwipeSchema = createInsertSchema(swipes).omit({ id: true, createdAt: true });
export const insertTripSchema = createInsertSchema(trips).omit({ id: true });
export const insertPostSchema = createInsertSchema(posts).omit({ id: true, createdAt: true });
export const insertFavoriteSpotSchema = createInsertSchema(favoriteSpots).omit({ id: true });
export const insertPostLikeSchema = createInsertSchema(postLikes).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true, read: true });

// === TYPES ===
export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Swipe = typeof swipes.$inferSelect;
export type InsertSwipe = z.infer<typeof insertSwipeSchema>;
export type Location = typeof locations.$inferSelect;
export type SurfReport = typeof surfReports.$inferSelect;
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
