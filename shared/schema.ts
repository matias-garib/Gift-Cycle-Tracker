import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── Users ──────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  birthday: text("birthday").notNull().default(""),
  paymentMethod: text("payment_method").notNull().default(""),
  paymentHandle: text("payment_handle").notNull().default(""),
  avatarColor: text("avatar_color").notNull().default("#888"),
  profileImage: text("profile_image"),
  shoeSize: text("shoe_size"),
  clothesSize: text("clothes_size"),
  waistSize: text("waist_size"),
  wishlist: jsonb("wishlist").notNull().default(sql`'[]'::jsonb`),
  createdAt: text("created_at").notNull().default(sql`now()::text`),
});

export const insertUserSchema = createInsertSchema(users).pick({
  name: true,
  email: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ── Groups ─────────────────────────────────────────────────────────────────
export const groups = pgTable("groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  organizerId: varchar("organizer_id").notNull().references(() => users.id),
  groupImage: text("group_image"),
  createdAt: text("created_at").notNull().default(sql`now()::text`),
});

export type Group = typeof groups.$inferSelect;

// ── Group Members (join table) ─────────────────────────────────────────────
export const groupMembers = pgTable("group_members", {
  groupId: varchar("group_id").notNull().references(() => groups.id),
  userId: varchar("user_id").notNull().references(() => users.id),
});

export type GroupMember = typeof groupMembers.$inferSelect;

// ── Gifts ──────────────────────────────────────────────────────────────────
export const gifts = pgTable("gifts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull().references(() => groups.id),
  birthdayPersonId: varchar("birthday_person_id").notNull().references(() => users.id),
  phase: text("phase").notNull().default("ideation"),
  purchasedItem: text("purchased_item"),
  buyerId: varchar("buyer_id").references(() => users.id),
  totalCost: real("total_cost"),
  createdAt: text("created_at").notNull().default(sql`now()::text`),
  purchasedAt: text("purchased_at"),
});

export type Gift = typeof gifts.$inferSelect;

// ── Wishlist Items ─────────────────────────────────────────────────────────
export const wishlistItems = pgTable("wishlist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  giftId: varchar("gift_id").notNull().references(() => gifts.id),
  title: text("title").notNull(),
  url: text("url"),
  addedBy: varchar("added_by").notNull().references(() => users.id),
});

export type WishlistItem = typeof wishlistItems.$inferSelect;

// ── Sessions ───────────────────────────────────────────────────────────────
export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`now()::text`),
});

// ── Payments ───────────────────────────────────────────────────────────────
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  giftId: varchar("gift_id").notNull().references(() => gifts.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  amount: real("amount").notNull(),
  paid: boolean("paid").notNull().default(false),
  paidAt: text("paid_at"),
});

export type Payment = typeof payments.$inferSelect;
