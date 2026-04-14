import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { userCredits, generatedImages, referencePhotos } from "../drizzle/schema";
import type { InsertUserCredit, InsertGeneratedImage, InsertReferencePhoto } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.phone) {
    throw new Error("User phone is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      phone: user.phone,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.openId !== undefined) {
      values.openId = user.openId;
      updateSet.openId = user.openId;
    }

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByPhone(phone: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertUserByPhone(phone: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getUserByPhone(phone);
  if (existing) {
    await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, existing.id));
    return existing.id;
  }

  const result = await db.insert(users).values({
    phone,
    loginMethod: "phone",
    lastSignedIn: new Date(),
  });
  return (result as any).insertId;
}

/**
 * User Credits
 */

export async function getUserCredits(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(userCredits)
    .where(eq(userCredits.userId, userId));

  return result[0] || null;
}

export async function createUserCredits(data: InsertUserCredit) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(userCredits).values(data);
  return getUserCredits(data.userId);
}

export async function updateUserCredits(userId: number, data: Partial<InsertUserCredit>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(userCredits).set(data).where(eq(userCredits.userId, userId));
  return getUserCredits(userId);
}

export async function deductCredits(userId: number, amount: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const credits = await getUserCredits(userId);
  if (!credits) throw new Error("User credits not found");

  const available = credits.totalCredits - credits.usedCredits;
  if (available < amount) {
    throw new Error("Insufficient credits");
  }

  await db
    .update(userCredits)
    .set({ usedCredits: credits.usedCredits + amount })
    .where(eq(userCredits.userId, userId));

  return getUserCredits(userId);
}

/**
 * Generated Images
 */
export async function createGeneratedImage(data: InsertGeneratedImage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(generatedImages).values(data);
  return (result as any).insertId;
}

export async function getGeneratedImage(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(generatedImages)
    .where(eq(generatedImages.id, id));

  return result[0] || null;
}

export async function getUserGeneratedImages(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(generatedImages)
    .where(eq(generatedImages.userId, userId));
}

export async function updateGeneratedImage(
  id: number,
  data: Partial<InsertGeneratedImage>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(generatedImages).set(data).where(eq(generatedImages.id, id));
  return getGeneratedImage(id);
}

export async function getGeneratedImageByReplicateJobId(jobId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(generatedImages)
    .where(eq(generatedImages.replicateJobId, jobId));

  return result[0] || null;
}

/**
 * Reference Photos
 */
export async function createReferencePhoto(data: InsertReferencePhoto) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(referencePhotos).values(data);
  return (result as any).insertId;
}

export async function getUserReferencePhotos(userId: number, photoType?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(referencePhotos.userId, userId)];
  if (photoType) {
    conditions.push(eq(referencePhotos.photoType, photoType as any));
  }

  return db
    .select()
    .from(referencePhotos)
    .where(conditions.length > 1 ? and(...conditions) : conditions[0]);
}

export async function deleteReferencePhoto(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(referencePhotos).where(eq(referencePhotos.id, id));
}

export async function updateReferencePhoto(
  id: number,
  data: Partial<InsertReferencePhoto>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(referencePhotos).set(data).where(eq(referencePhotos.id, id));

  const result = await db
    .select()
    .from(referencePhotos)
    .where(eq(referencePhotos.id, id));

  return result[0] || null;
}

/**
 * LoRA Training
 */
export async function updateUserLoRA(
  userId: number,
  data: {
    loraModelUrl?: string | null;
    loraModelVersion?: string | null;
    loraStatus?: "none" | "pending" | "training" | "ready" | "failed";
    loraTrainingId?: string | null;
    loraTrainedAt?: Date | null;
  },
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(users).where(eq(users.id, userId));
  return result[0] || null;
}

export async function getTrainingPhotos(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(referencePhotos)
    .where(and(eq(referencePhotos.userId, userId), eq(referencePhotos.photoType, "training" as any)));
}

export async function deleteGeneratedImage(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(generatedImages).where(eq(generatedImages.id, id));
}

/**
 * Referral System
 */
import { referrals } from "../drizzle/schema";

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function ensureReferralCode(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const user = await getUserById(userId);
  if (user?.referralCode) return user.referralCode;

  // Generate unique code
  let code = generateReferralCode();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await db.select().from(users).where(eq(users.referralCode, code)).limit(1);
    if (existing.length === 0) break;
    code = generateReferralCode();
    attempts++;
  }

  await db.update(users).set({ referralCode: code }).where(eq(users.id, userId));
  return code;
}

export async function getUserByReferralCode(code: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(users).where(eq(users.referralCode, code.toUpperCase())).limit(1);
  return result[0] || null;
}

export async function applyReferral(referrerId: number, referredId: number, creditsEach: number = 3) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Referral kaydı oluştur
  await db.insert(referrals).values({
    referrerId,
    referredId,
    creditsAwarded: creditsEach,
  });

  // Davet edene kredi ekle
  const referrerCredits = await getUserCredits(referrerId);
  if (referrerCredits) {
    await updateUserCredits(referrerId, {
      totalCredits: referrerCredits.totalCredits + creditsEach,
    });
  } else {
    await createUserCredits({
      userId: referrerId,
      totalCredits: creditsEach,
      usedCredits: 0,
      subscriptionTier: "free",
    });
  }

  // Davet edilene ekstra kredi (normal 3 + bonus 3 = 6)
  const referredCredits = await getUserCredits(referredId);
  if (referredCredits) {
    await updateUserCredits(referredId, {
      totalCredits: referredCredits.totalCredits + creditsEach,
    });
  }

  // referredBy kaydet
  await db.update(users).set({ referredBy: referrerId }).where(eq(users.id, referredId));
}

export async function getReferralStats(userId: number) {
  const db = await getDb();
  if (!db) return { totalReferred: 0, totalCreditsEarned: 0 };

  const result = await db.select().from(referrals).where(eq(referrals.referrerId, userId));
  const totalCreditsEarned = result.reduce((sum, r) => sum + r.creditsAwarded, 0);

  return {
    totalReferred: result.length,
    totalCreditsEarned,
  };
}

/**
 * Showcase
 */
import { showcase } from "../drizzle/schema";
import type { InsertShowcase } from "../drizzle/schema";
import { desc } from "drizzle-orm";

export async function addToShowcase(data: InsertShowcase) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(showcase).values(data);
  return (result as any).insertId;
}

export async function getShowcaseImages(limit: number = 20) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(showcase).orderBy(desc(showcase.createdAt)).limit(limit);
}

export async function getShowcaseByStyle(style: string, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(showcase).where(eq(showcase.style, style)).orderBy(desc(showcase.createdAt)).limit(limit);
}

export async function isImageInShowcase(generatedImageId: number) {
  const db = await getDb();
  if (!db) return false;

  const result = await db.select().from(showcase).where(eq(showcase.generatedImageId, generatedImageId)).limit(1);
  return result.length > 0;
}

export async function removeFromShowcase(generatedImageId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(showcase).where(and(eq(showcase.generatedImageId, generatedImageId), eq(showcase.userId, userId)));
}

/**
 * Push Token
 */
export async function savePushToken(userId: number, token: string) {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ pushToken: token }).where(eq(users.id, userId));
}

export async function getPushToken(userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select({ pushToken: users.pushToken }).from(users).where(eq(users.id, userId)).limit(1);
  return result[0]?.pushToken || null;
}
