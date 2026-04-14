import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  /** Phone number — primary login identifier */
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  /** Legacy OAuth identifier — kept for backward compat, nullable now */
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  /** LoRA training fields */
  loraModelUrl: text("loraModelUrl"),
  loraModelVersion: text("loraModelVersion"),
  loraStatus: mysqlEnum("loraStatus", ["none", "pending", "training", "ready", "failed"]).default("none").notNull(),
  loraTrainingId: varchar("loraTrainingId", { length: 255 }),
  loraTrainedAt: timestamp("loraTrainedAt"),
  /** Referral system */
  referralCode: varchar("referralCode", { length: 10 }).unique(),
  referredBy: int("referredBy"),
  /** Expo Push Token for notifications */
  pushToken: text("pushToken"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * User credits and subscription info
 */
export const userCredits = mysqlTable("userCredits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  totalCredits: int("totalCredits").default(0).notNull(),
  usedCredits: int("usedCredits").default(0).notNull(),
  subscriptionTier: mysqlEnum("subscriptionTier", ["free", "pro", "premium"]).default("free").notNull(),
  subscriptionExpiry: timestamp("subscriptionExpiry"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserCredit = typeof userCredits.$inferSelect;
export type InsertUserCredit = typeof userCredits.$inferInsert;

/**
 * Generated images metadata
 */
export const generatedImages = mysqlTable("generatedImages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  contentImageUrl: text("contentImageUrl").notNull(),
  faceImageUrl: text("faceImageUrl").notNull(),
  generatedImageUrl: text("generatedImageUrl").notNull(),
  prompt: text("prompt").notNull(),
  style: varchar("style", { length: 255 }),
  replicateJobId: varchar("replicateJobId", { length: 255 }),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  creditsUsed: int("creditsUsed").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GeneratedImage = typeof generatedImages.$inferSelect;
export type InsertGeneratedImage = typeof generatedImages.$inferInsert;

/**
 * Reference photos for users
 */
export const referencePhotos = mysqlTable("referencePhotos", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  photoUrl: text("photoUrl").notNull(),
  photoType: mysqlEnum("photoType", ["face", "content", "training"]).notNull(),
  analysis: text("analysis"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReferencePhoto = typeof referencePhotos.$inferSelect;
export type InsertReferencePhoto = typeof referencePhotos.$inferInsert;

/**
 * Referral tracking
 */
export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  referrerId: int("referrerId").notNull(),
  referredId: int("referredId").notNull(),
  creditsAwarded: int("creditsAwarded").default(3).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;

/**
 * Showcase — public gallery of user-shared images
 */
export const showcase = mysqlTable("showcase", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  generatedImageId: int("generatedImageId").notNull(),
  imageUrl: text("imageUrl").notNull(),
  style: varchar("style", { length: 255 }),
  likes: int("likes").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Showcase = typeof showcase.$inferSelect;
export type InsertShowcase = typeof showcase.$inferInsert;

/**
 * In-app notifications
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  isRead: int("isRead").default(0).notNull(),
  data: text("data"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
