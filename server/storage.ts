import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });

// ── Sessions ───────────────────────────────────────────────────────────────

export async function createSession(token: string, userId: string) {
  await db.insert(schema.sessions).values({ token, userId });
}

export async function getSession(token: string) {
  const rows = await db.select().from(schema.sessions).where(eq(schema.sessions.token, token));
  return rows[0] ?? null;
}

export async function deleteSession(token: string) {
  await db.delete(schema.sessions).where(eq(schema.sessions.token, token));
}

// ── Users ──────────────────────────────────────────────────────────────────

export async function getUserById(id: string) {
  const rows = await db.select().from(schema.users).where(eq(schema.users.id, id));
  return rows[0] ?? null;
}

export async function getUserByEmail(email: string) {
  const rows = await db.select().from(schema.users).where(eq(schema.users.email, email));
  return rows[0] ?? null;
}

export async function createUser(data: schema.InsertUser & {
  name: string;
  avatarColor?: string;
}) {
  const rows = await db.insert(schema.users).values(data).returning();
  return rows[0];
}

export async function updateUser(id: string, data: Partial<typeof schema.users.$inferInsert>) {
  const rows = await db.update(schema.users).set(data).where(eq(schema.users.id, id)).returning();
  return rows[0];
}

// ── Groups ─────────────────────────────────────────────────────────────────

export async function getGroupById(id: string) {
  const rows = await db.select().from(schema.groups).where(eq(schema.groups.id, id));
  return rows[0] ?? null;
}

export async function getGroupByInviteCode(code: string) {
  const rows = await db
    .select()
    .from(schema.groups)
    .where(eq(schema.groups.inviteCode, code.toUpperCase()));
  return rows[0] ?? null;
}

export async function getGroupsForUser(userId: string) {
  const memberships = await db
    .select()
    .from(schema.groupMembers)
    .where(eq(schema.groupMembers.userId, userId));
  if (!memberships.length) return [];

  const groupIds = memberships.map((m) => m.groupId);
  const result: typeof schema.groups.$inferSelect[] = [];
  for (const gid of groupIds) {
    const g = await getGroupById(gid);
    if (g) result.push(g);
  }
  return result;
}

export async function createGroup(data: {
  name: string;
  inviteCode: string;
  organizerId: string;
  groupImage?: string;
}) {
  const rows = await db.insert(schema.groups).values(data).returning();
  const group = rows[0];
  // organizer is also a member
  await db.insert(schema.groupMembers).values({ groupId: group.id, userId: data.organizerId });
  return group;
}

export async function updateGroupImage(groupId: string, imageUri: string) {
  const rows = await db
    .update(schema.groups)
    .set({ groupImage: imageUri })
    .where(eq(schema.groups.id, groupId))
    .returning();
  return rows[0];
}

export async function getMembersOfGroup(groupId: string) {
  const memberships = await db
    .select()
    .from(schema.groupMembers)
    .where(eq(schema.groupMembers.groupId, groupId));
  const result: typeof schema.users.$inferSelect[] = [];
  for (const m of memberships) {
    const u = await getUserById(m.userId);
    if (u) result.push(u);
  }
  return result;
}

export async function addMemberToGroup(groupId: string, userId: string) {
  // avoid duplicate
  const existing = await db
    .select()
    .from(schema.groupMembers)
    .where(and(eq(schema.groupMembers.groupId, groupId), eq(schema.groupMembers.userId, userId)));
  if (existing.length) return;
  await db.insert(schema.groupMembers).values({ groupId, userId });
}

export async function removeMemberFromGroup(groupId: string, userId: string) {
  await db
    .delete(schema.groupMembers)
    .where(and(eq(schema.groupMembers.groupId, groupId), eq(schema.groupMembers.userId, userId)));
}

// ── Gifts ──────────────────────────────────────────────────────────────────

export async function getGiftById(id: string) {
  const rows = await db.select().from(schema.gifts).where(eq(schema.gifts.id, id));
  return rows[0] ?? null;
}

export async function getGiftsForGroup(groupId: string) {
  return db.select().from(schema.gifts).where(eq(schema.gifts.groupId, groupId));
}

export async function createGift(data: {
  groupId: string;
  birthdayPersonId: string;
}) {
  const rows = await db.insert(schema.gifts).values(data).returning();
  return rows[0];
}

export async function updateGift(id: string, data: Partial<typeof schema.gifts.$inferInsert>) {
  const rows = await db.update(schema.gifts).set(data).where(eq(schema.gifts.id, id)).returning();
  return rows[0];
}

// ── Wishlist Items ─────────────────────────────────────────────────────────

export async function getWishlistForGift(giftId: string) {
  return db.select().from(schema.wishlistItems).where(eq(schema.wishlistItems.giftId, giftId));
}

export async function addWishlistItem(data: {
  giftId: string;
  title: string;
  url?: string;
  addedBy: string;
}) {
  const rows = await db.insert(schema.wishlistItems).values(data).returning();
  return rows[0];
}

export async function removeWishlistItem(id: string) {
  await db.delete(schema.wishlistItems).where(eq(schema.wishlistItems.id, id));
}

// ── Payments ───────────────────────────────────────────────────────────────

export async function getPaymentsForGift(giftId: string) {
  return db.select().from(schema.payments).where(eq(schema.payments.giftId, giftId));
}

export async function createPayments(
  items: { giftId: string; userId: string; amount: number; paid: boolean; paidAt?: string }[]
) {
  if (!items.length) return [];
  return db.insert(schema.payments).values(items).returning();
}

export async function markPaymentPaid(giftId: string, userId: string) {
  const rows = await db
    .update(schema.payments)
    .set({ paid: true, paidAt: new Date().toISOString() })
    .where(and(eq(schema.payments.giftId, giftId), eq(schema.payments.userId, userId)))
    .returning();
  return rows[0];
}
