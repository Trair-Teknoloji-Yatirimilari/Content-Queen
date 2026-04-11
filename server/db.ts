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
