import { users, type User, type UpsertUser } from "@shared/models/auth";
import { profiles } from "@shared/schema";
import { db } from "../../db";
import { eq } from "drizzle-orm";

// Interface for auth storage operations
// (IMPORTANT) These user operations are mandatory for Replit Auth.
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if user already exists
    const existingUser = await this.getUser(userData.id!);
    const isNewUser = !existingUser;
    
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    // Auto-create profile for new users so they appear in searches
    // Use as much data from Replit Auth as possible to pre-populate their profile
    if (isNewUser && userData.id) {
      const existingProfile = await db.select().from(profiles).where(eq(profiles.userId, userData.id));
      if (existingProfile.length === 0) {
        // Build display name from first and last name
        const displayName = [userData.firstName, userData.lastName]
          .filter(Boolean)
          .join(' ') || "Surfer";
        
        // Use profile image from Replit if available
        const imageUrls = userData.profileImageUrl ? [userData.profileImageUrl] : [];
        
        await db.insert(profiles).values({
          userId: userData.id,
          displayName,
          imageUrls,
          skillLevel: "kook",
          bio: "",
          isIncompleteProfile: true,
          trialStartedAt: new Date(),
        });
        console.log(`[AUTH] Auto-created profile for new user: ${userData.id} with name: ${displayName}`);
      }
    }
    
    return user;
  }
}

export const authStorage = new AuthStorage();
