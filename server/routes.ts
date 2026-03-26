import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import * as db from "./storage";

// ── helpers ────────────────────────────────────────────────────────────────

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getAvatarColor(index: number) {
  const colors = ["#F87171","#FB923C","#FBBF24","#34D399","#60A5FA","#A78BFA","#F472B6"];
  return colors[index % colors.length];
}

/** Build the rich Group shape the frontend expects */
async function buildGroup(group: Awaited<ReturnType<typeof db.getGroupById>>) {
  if (!group) return null;
  const members = await db.getMembersOfGroup(group.id);
  return { ...group, members };
}

/** Build the rich Gift shape the frontend expects */
async function buildGift(gift: Awaited<ReturnType<typeof db.getGiftById>>) {
  if (!gift) return null;
  const [wishlist, payments] = await Promise.all([
    db.getWishlistForGift(gift.id),
    db.getPaymentsForGift(gift.id),
  ]);
  return { ...gift, wishlist, payments };
}

// ── route registration ─────────────────────────────────────────────────────

export async function registerRoutes(app: Express): Promise<Server> {

  // ── Auth ──────────────────────────────────────────────────────────────────

  /** POST /api/auth/register */
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password)
        return res.status(400).json({ error: "name, email and password are required" });

      const existing = await db.getUserByEmail(email);
      if (existing) return res.status(409).json({ error: "Email already registered" });

      const allGroups = await db.getGroupsForUser(""); // just to get user count for color
      const user = await db.createUser({
        name,
        email,
        password, // NOTE: hash this in production
        avatarColor: getAvatarColor(Math.floor(Math.random() * 100)),
      });
      return res.json(user);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  /** POST /api/auth/login */
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password)
        return res.status(400).json({ error: "email and password are required" });

      const user = await db.getUserByEmail(email);
      if (!user || user.password !== password)
        return res.status(401).json({ error: "Invalid credentials" });

      return res.json(user);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  // ── Users ─────────────────────────────────────────────────────────────────

  /** GET /api/users/:id */
  app.get("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const user = await db.getUserById(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      return res.json(user);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  /** PATCH /api/users/:id */
  app.patch("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const updated = await db.updateUser(req.params.id, req.body);
      return res.json(updated);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  // ── Groups ────────────────────────────────────────────────────────────────

  /** GET /api/groups?userId=xxx  — all groups the user belongs to */
  app.get("/api/groups", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: "userId is required" });

      const rawGroups = await db.getGroupsForUser(userId);
      const rich = await Promise.all(rawGroups.map(buildGroup));
      return res.json(rich);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  /** GET /api/groups/:id */
  app.get("/api/groups/:id", async (req: Request, res: Response) => {
    try {
      const group = await buildGroup(await db.getGroupById(req.params.id));
      if (!group) return res.status(404).json({ error: "Group not found" });
      return res.json(group);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  /** POST /api/groups */
  app.post("/api/groups", async (req: Request, res: Response) => {
    try {
      const { name, organizerId, groupImage } = req.body;
      if (!name || !organizerId)
        return res.status(400).json({ error: "name and organizerId are required" });

      const group = await db.createGroup({
        name,
        organizerId,
        groupImage,
        inviteCode: generateInviteCode(),
      });
      return res.json(await buildGroup(group));
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  /** POST /api/groups/join  — join via invite code */
  app.post("/api/groups/join", async (req: Request, res: Response) => {
    try {
      const { inviteCode, userId } = req.body;
      if (!inviteCode || !userId)
        return res.status(400).json({ error: "inviteCode and userId are required" });

      const group = await db.getGroupByInviteCode(inviteCode);
      if (!group) return res.status(404).json({ error: "Invalid invite code" });

      await db.addMemberToGroup(group.id, userId);
      return res.json(await buildGroup(group));
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  /** PATCH /api/groups/:id/image */
  app.patch("/api/groups/:id/image", async (req: Request, res: Response) => {
    try {
      const { imageUri } = req.body;
      await db.updateGroupImage(req.params.id, imageUri);
      return res.json({ ok: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  /** DELETE /api/groups/:id/members/:userId */
  app.delete("/api/groups/:id/members/:userId", async (req: Request, res: Response) => {
    try {
      await db.removeMemberFromGroup(req.params.id, req.params.userId);
      return res.json({ ok: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  // ── Gifts ─────────────────────────────────────────────────────────────────

  /** GET /api/gifts?groupId=xxx */
  app.get("/api/gifts", async (req: Request, res: Response) => {
    try {
      const groupId = req.query.groupId as string;
      if (!groupId) return res.status(400).json({ error: "groupId is required" });

      const rawGifts = await db.getGiftsForGroup(groupId);
      const rich = await Promise.all(rawGifts.map(buildGift));
      return res.json(rich);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  /** GET /api/gifts/:id */
  app.get("/api/gifts/:id", async (req: Request, res: Response) => {
    try {
      const gift = await buildGift(await db.getGiftById(req.params.id));
      if (!gift) return res.status(404).json({ error: "Gift not found" });
      return res.json(gift);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  /** POST /api/gifts */
  app.post("/api/gifts", async (req: Request, res: Response) => {
    try {
      const { groupId, birthdayPersonId } = req.body;
      if (!groupId || !birthdayPersonId)
        return res.status(400).json({ error: "groupId and birthdayPersonId are required" });

      const gift = await db.createGift({ groupId, birthdayPersonId });
      return res.json(await buildGift(gift));
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  /** POST /api/gifts/:id/purchase  — mark a gift as purchased & create payment splits */
  app.post("/api/gifts/:id/purchase", async (req: Request, res: Response) => {
    try {
      const { purchasedItem, totalCost, buyerId, memberIds } = req.body;
      if (!purchasedItem || totalCost == null || !buyerId || !memberIds?.length)
        return res.status(400).json({ error: "purchasedItem, totalCost, buyerId, memberIds required" });

      const splitAmount = Math.round((totalCost / memberIds.length) * 100) / 100;

      // delete old payments if re-purchasing
      const oldPayments = await db.getPaymentsForGift(req.params.id);

      const paymentRows = (memberIds as string[]).map((uid: string) => ({
        giftId: req.params.id,
        userId: uid,
        amount: splitAmount,
        paid: uid === buyerId,
        paidAt: uid === buyerId ? new Date().toISOString() : undefined,
      }));

      await db.createPayments(paymentRows);

      const gift = await db.updateGift(req.params.id, {
        phase: "settlement",
        purchasedItem,
        buyerId,
        totalCost,
        purchasedAt: new Date().toISOString(),
      });

      return res.json(await buildGift(gift!));
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  // ── Wishlist Items ────────────────────────────────────────────────────────

  /** POST /api/gifts/:id/wishlist */
  app.post("/api/gifts/:id/wishlist", async (req: Request, res: Response) => {
    try {
      const { title, url, addedBy } = req.body;
      if (!title || !addedBy)
        return res.status(400).json({ error: "title and addedBy are required" });

      const item = await db.addWishlistItem({ giftId: req.params.id, title, url, addedBy });
      return res.json(item);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  /** DELETE /api/wishlist/:itemId */
  app.delete("/api/wishlist/:itemId", async (req: Request, res: Response) => {
    try {
      await db.removeWishlistItem(req.params.itemId);
      return res.json({ ok: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  // ── Payments ──────────────────────────────────────────────────────────────

  /** POST /api/gifts/:id/pay  — mark a user as paid */
  app.post("/api/gifts/:id/pay", async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "userId is required" });

      const payment = await db.markPaymentPaid(req.params.id, userId);
      return res.json(payment);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
