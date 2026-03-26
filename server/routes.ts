import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import * as bcrypt from "bcrypt";
import * as storage from "./storage";

// ── Simple in-memory session store ────────────────────────────────────────
const sessions = new Map<string, string>(); // token → userId

function generateToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function generateInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function getAvatarColor(index: number) {
  const colors = ["#FF6B6B","#4ECDC4","#45B7D1","#96CEB4","#FFEAA7","#DDA0DD","#98D8C8","#F7DC6F","#BB8FCE","#85C1E9"];
  return colors[index % colors.length];
}

function requireAuth(req: Request, res: Response): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  const token = auth.slice(7);
  const userId = sessions.get(token);
  if (!userId) {
    res.status(401).json({ error: "Invalid or expired session" });
    return null;
  }
  return userId;
}

function stripPassword<T extends { password?: string }>(user: T) {
  const { password: _, ...safe } = user;
  return safe;
}

export async function registerRoutes(app: Express): Promise<Server> {

  // ── Auth ──────────────────────────────────────────────────────────────────

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password)
        return res.status(400).json({ error: "name, email and password required" });

      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(409).json({ error: "Email already registered" });

      const hashed = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        name,
        email,
        password: hashed,
        avatarColor: getAvatarColor(Math.floor(Math.random() * 10)),
      });

      const token = generateToken();
      sessions.set(token, user.id);
      return res.json({ token, user: stripPassword(user) });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password)
        return res.status(400).json({ error: "email and password required" });

      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(401).json({ error: "Invalid credentials" });

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ error: "Invalid credentials" });

      const token = generateToken();
      sessions.set(token, user.id);
      return res.json({ token, user: stripPassword(user) });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const auth = req.headers.authorization;
    if (auth?.startsWith("Bearer ")) sessions.delete(auth.slice(7));
    return res.json({ ok: true });
  });

  // ── Me ────────────────────────────────────────────────────────────────────

  app.get("/api/me", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const user = await storage.getUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json(stripPassword(user));
  });

  app.patch("/api/me", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    try {
      const updated = await storage.updateUser(userId, req.body);
      if (!updated) return res.status(404).json({ error: "User not found" });
      return res.json(stripPassword(updated));
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  // Profile wishlist — stored as part of user wishlist field for now
  app.post("/api/me/wishlist", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const { title, url } = req.body;
    if (!title) return res.status(400).json({ error: "title required" });
    // Store in user's wishlist JSON field
    const user = await storage.getUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const currentWishlist = (user as any).wishlist || [];
    const newItem = { id: generateToken(), title, url };
    await storage.updateUser(userId, { wishlist: [...currentWishlist, newItem] } as any);
    return res.json(newItem);
  });

  app.delete("/api/me/wishlist/:itemId", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const user = await storage.getUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const currentWishlist = (user as any).wishlist || [];
    await storage.updateUser(userId, {
      wishlist: currentWishlist.filter((w: any) => w.id !== req.params.itemId)
    } as any);
    return res.json({ ok: true });
  });

  // ── Users ─────────────────────────────────────────────────────────────────

  app.get("/api/users/:id", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const user = await storage.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: "Not found" });
    return res.json({ ...stripPassword(user), wishlist: (user as any).wishlist || [] });
  });

  // ── Groups ────────────────────────────────────────────────────────────────

  app.get("/api/groups", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const userGroups = await storage.getGroupsForUser(userId);
    const result = await Promise.all(userGroups.map(async (g) => {
      const members = await storage.getMembersOfGroup(g.id);
      return { ...g, members: members.map(stripPassword) };
    }));
    return res.json(result);
  });

  app.post("/api/groups", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const { name, groupImage } = req.body;
    if (!name) return res.status(400).json({ error: "name required" });
    const group = await storage.createGroup({
      name,
      inviteCode: generateInviteCode(),
      organizerId: userId,
      groupImage,
    });
    // createGroup already adds organizer as member
    const members = await storage.getMembersOfGroup(group.id);
    return res.json({ ...group, members: members.map(stripPassword) });
  });

  app.post("/api/groups/join", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ error: "inviteCode required" });
    const group = await storage.getGroupByInviteCode(inviteCode);
    if (!group) return res.status(404).json({ error: "Invalid invite code" });
    await storage.addMemberToGroup(group.id, userId);
    const members = await storage.getMembersOfGroup(group.id);
    return res.json({ ...group, members: members.map(stripPassword) });
  });

  app.patch("/api/groups/:id", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const { groupImage } = req.body;
    const updated = await storage.updateGroupImage(req.params.id, groupImage);
    return res.json(updated);
  });

  app.delete("/api/groups/:id/members/:memberId", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    await storage.removeMemberFromGroup(req.params.id, req.params.memberId);
    return res.json({ ok: true });
  });

  // ── Gifts ─────────────────────────────────────────────────────────────────

  app.get("/api/groups/:groupId/gifts", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const groupGifts = await storage.getGiftsForGroup(req.params.groupId);
    const result = await Promise.all(groupGifts.map(async (g) => {
      const [wishlist, payments] = await Promise.all([
        storage.getWishlistForGift(g.id),
        storage.getPaymentsForGift(g.id),
      ]);
      return { ...g, wishlist, payments };
    }));
    return res.json(result);
  });

  app.post("/api/groups/:groupId/gifts", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const { birthdayPersonId } = req.body;
    if (!birthdayPersonId) return res.status(400).json({ error: "birthdayPersonId required" });
    const gift = await storage.createGift({ groupId: req.params.groupId, birthdayPersonId });
    return res.json({ ...gift, wishlist: [], payments: [] });
  });

  app.post("/api/gifts/:giftId/wishlist", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const { title, url } = req.body;
    if (!title) return res.status(400).json({ error: "title required" });
    const item = await storage.addWishlistItem({ giftId: req.params.giftId, title, url, addedBy: userId });
    return res.json(item);
  });

  app.delete("/api/gifts/:giftId/wishlist/:itemId", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    await storage.removeWishlistItem(req.params.itemId);
    return res.json({ ok: true });
  });

  app.post("/api/gifts/:giftId/purchase", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const { purchasedItem, totalCost } = req.body;
    if (!purchasedItem || !totalCost) return res.status(400).json({ error: "purchasedItem and totalCost required" });

    const gift = await storage.getGiftById(req.params.giftId);
    if (!gift) return res.status(404).json({ error: "Gift not found" });

    const members = await storage.getMembersOfGroup(gift.groupId);
    const payers = members.filter((m) => m.id !== gift.birthdayPersonId);
    if (payers.length === 0) return res.status(400).json({ error: "No members to split cost with" });
    const splitAmount = Math.round((totalCost / payers.length) * 100) / 100;

    await storage.updateGift(req.params.giftId, {
      phase: "settlement",
      purchasedItem,
      buyerId: userId,
      totalCost,
      purchasedAt: new Date().toISOString(),
    });

    const paymentEntries = payers.map((m) => ({
      giftId: req.params.giftId,
      userId: m.id,
      amount: splitAmount,
      paid: m.id === userId,
    }));
    await storage.createPayments(paymentEntries);

    const updated = await storage.getGiftById(req.params.giftId);
    const [wishlist, payments] = await Promise.all([
      storage.getWishlistForGift(req.params.giftId),
      storage.getPaymentsForGift(req.params.giftId),
    ]);
    return res.json({ ...updated, wishlist, payments });
  });

  app.post("/api/gifts/:giftId/pay", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    await storage.markPaymentPaid(req.params.giftId, userId);
    return res.json({ ok: true });
  });

  const httpServer = createServer(app);
  return httpServer;
}
