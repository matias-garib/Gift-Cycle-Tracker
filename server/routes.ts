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

export async function registerRoutes(app: Express): Promise<Server> {

  // ── Auth ──────────────────────────────────────────────────────────────────

  // POST /api/auth/register
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
      const { password: _, ...safeUser } = user;
      return res.json({ token, user: safeUser });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  // POST /api/auth/login
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
      const { password: _, ...safeUser } = user;
      return res.json({ token, user: safeUser });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Server error" });
    }
  });

  // POST /api/auth/logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const auth = req.headers.authorization;
    if (auth?.startsWith("Bearer ")) sessions.delete(auth.slice(7));
    return res.json({ ok: true });
  });

  // ── Me ────────────────────────────────────────────────────────────────────

  // GET /api/me
  app.get("/api/me", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const user = await storage.getUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const wishlist = await storage.getProfileWishlist(userId);
    const { password: _, ...safeUser } = user;
    return res.json({ ...safeUser, wishlist });
  });

  // PATCH /api/me
  app.patch("/api/me", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const updated = await storage.updateUser(userId, req.body);
    const { password: _, ...safeUser } = updated;
    return res.json(safeUser);
  });

  // POST /api/me/wishlist
  app.post("/api/me/wishlist", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const { title, url } = req.body;
    if (!title) return res.status(400).json({ error: "title required" });
    const item = await storage.addProfileWishlistItem(userId, title, url);
    return res.json(item);
  });

  // DELETE /api/me/wishlist/:itemId
  app.delete("/api/me/wishlist/:itemId", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    await storage.removeProfileWishlistItem(req.params.itemId, userId);
    return res.json({ ok: true });
  });

  // ── Users ─────────────────────────────────────────────────────────────────

  // GET /api/users/:id
  app.get("/api/users/:id", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const user = await storage.getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: "Not found" });
    const wishlist = await storage.getProfileWishlist(req.params.id);
    const { password: _, ...safeUser } = user;
    return res.json({ ...safeUser, wishlist });
  });

  // ── Groups ────────────────────────────────────────────────────────────────

  // GET /api/groups
  app.get("/api/groups", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const userGroups = await storage.getGroupsForUser(userId);
    const result = await Promise.all(userGroups.map(async (g) => {
      const members = await storage.getMembersOfGroup(g.id);
      return { ...g, members: members.map(({ password: _, ...u }) => u) };
    }));
    return res.json(result);
  });

  // POST /api/groups
  app.post("/api/groups", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const { name, groupImage } = req.body;
    if (!name) return res.status(400).json({ error: "name required" });
    const group = await storage.createGroup({ name, inviteCode: generateInviteCode(), organizerId: userId, groupImage });
    await storage.addMemberToGroup(group.id, userId);
    const members = await storage.getMembersOfGroup(group.id);
    return res.json({ ...group, members: members.map(({ password: _, ...u }) => u) });
  });

  // POST /api/groups/join
  app.post("/api/groups/join", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ error: "inviteCode required" });
    const group = await storage.getGroupByInviteCode(inviteCode);
    if (!group) return res.status(404).json({ error: "Invalid invite code" });
    await storage.addMemberToGroup(group.id, userId);
    const members = await storage.getMembersOfGroup(group.id);
    return res.json({ ...group, members: members.map(({ password: _, ...u }) => u) });
  });

  // PATCH /api/groups/:id
  app.patch("/api/groups/:id", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const { groupImage } = req.body;
    const updated = await storage.updateGroup(req.params.id, { groupImage });
    return res.json(updated);
  });

  // DELETE /api/groups/:id/members/:memberId
  app.delete("/api/groups/:id/members/:memberId", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    await storage.removeMemberFromGroup(req.params.id, req.params.memberId);
    return res.json({ ok: true });
  });

  // ── Gifts ─────────────────────────────────────────────────────────────────

  // GET /api/groups/:groupId/gifts
  app.get("/api/groups/:groupId/gifts", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const groupGifts = await storage.getGiftsForGroup(req.params.groupId);
    const result = await Promise.all(groupGifts.map(async (g) => {
      const wishlist = await storage.getWishlistForGift(g.id);
      const payments = await storage.getPaymentsForGift(g.id);
      return { ...g, wishlist, payments };
    }));
    return res.json(result);
  });

  // POST /api/groups/:groupId/gifts
  app.post("/api/groups/:groupId/gifts", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const { birthdayPersonId } = req.body;
    if (!birthdayPersonId) return res.status(400).json({ error: "birthdayPersonId required" });
    const gift = await storage.createGift({ groupId: req.params.groupId, birthdayPersonId });
    return res.json({ ...gift, wishlist: [], payments: [] });
  });

  // POST /api/gifts/:giftId/wishlist
  app.post("/api/gifts/:giftId/wishlist", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const { title, url } = req.body;
    if (!title) return res.status(400).json({ error: "title required" });
    const item = await storage.addWishlistItem(req.params.giftId, title, userId, url);
    return res.json(item);
  });

  // DELETE /api/gifts/:giftId/wishlist/:itemId
  app.delete("/api/gifts/:giftId/wishlist/:itemId", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    await storage.removeWishlistItem(req.params.itemId, req.params.giftId);
    return res.json({ ok: true });
  });

  // POST /api/gifts/:giftId/purchase
  app.post("/api/gifts/:giftId/purchase", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    const { purchasedItem, totalCost } = req.body;
    if (!purchasedItem || !totalCost) return res.status(400).json({ error: "purchasedItem and totalCost required" });

    const gift = await storage.getGiftById(req.params.giftId);
    if (!gift) return res.status(404).json({ error: "Gift not found" });

    const members = await storage.getMembersOfGroup(gift.groupId);
    const payers = members.filter((m) => m.id !== gift.birthdayPersonId);
    const splitAmount = Math.round((totalCost / payers.length) * 100) / 100;

    await storage.updateGift(req.params.giftId, {
      phase: "settlement",
      purchasedItem,
      buyerId: userId,
      totalCost,
      purchasedAt: new Date(),
    });

    const paymentEntries = payers.map((m) => ({
      giftId: req.params.giftId,
      userId: m.id,
      amount: splitAmount,
      paid: m.id === userId,
    }));
    await storage.createPayments(paymentEntries);

    const updated = await storage.getGiftById(req.params.giftId);
    const wishlist = await storage.getWishlistForGift(req.params.giftId);
    const payments = await storage.getPaymentsForGift(req.params.giftId);
    return res.json({ ...updated, wishlist, payments });
  });

  // POST /api/gifts/:giftId/pay
  app.post("/api/gifts/:giftId/pay", async (req: Request, res: Response) => {
    const userId = requireAuth(req, res);
    if (!userId) return;
    await storage.markPaymentPaid(req.params.giftId, userId);
    return res.json({ ok: true });
  });

  const httpServer = createServer(app);
  return httpServer;
}
