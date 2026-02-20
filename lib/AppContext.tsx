import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import type { User, Group, Gift, WishlistItem, Payment, GiftPhase } from './types';
import * as Storage from './storage';
import { generateId, generateInviteCode, getAvatarColor } from './helpers';

interface AppContextValue {
  user: User | null;
  groups: Group[];
  gifts: Gift[];
  loading: boolean;
  login: (email: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  addProfileWishlistItem: (item: { title: string; url?: string }) => Promise<void>;
  removeProfileWishlistItem: (itemId: string) => Promise<void>;
  createGroup: (name: string, groupImage?: string) => Promise<Group>;
  updateGroupImage: (groupId: string, imageUri: string) => Promise<void>;
  joinGroup: (inviteCode: string) => Promise<Group | null>;
  addMemberToGroup: (groupId: string, member: User) => Promise<void>;
  removeMemberFromGroup: (groupId: string, memberId: string) => Promise<void>;
  createGift: (groupId: string, birthdayPersonId: string) => Promise<Gift>;
  addWishlistItem: (giftId: string, item: Omit<WishlistItem, 'id'>) => Promise<void>;
  removeWishlistItem: (giftId: string, itemId: string) => Promise<void>;
  markPurchased: (giftId: string, item: string, cost: number) => Promise<void>;
  markPaid: (giftId: string, userId: string) => Promise<void>;
  getGroupById: (id: string) => Group | undefined;
  getGiftById: (id: string) => Gift | undefined;
  getGiftsForGroup: (groupId: string) => Gift[];
  getUserById: (id: string) => User | undefined;
  seedDemoData: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const DEMO_NAMES = [
  'Alex Rivera', 'Jordan Chen', 'Sam Patel', 'Casey Kim', 'Morgan Li',
  'Riley Brooks', 'Avery Singh', 'Quinn Davis', 'Jamie Scott', 'Drew Nguyen',
  'Taylor Hart', 'Blake Murphy', 'Reese Garcia', 'Emery Cox', 'Skyler Reed',
  'Parker Wood', 'Finley James', 'Rowan Bell', 'Charlie Fox', 'Dakota Cruz',
];

function generateDemoBirthday(index: number): string {
  const now = new Date();
  const daysOffset = (index * 7) % 60 - 10;
  const date = new Date(now);
  date.setDate(date.getDate() + daysOffset);
  date.setFullYear(1990 + (index % 10));
  return date.toISOString().split('T')[0];
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [savedUser, savedGroups, savedGifts, savedUsers] = await Promise.all([
        Storage.getCurrentUser(),
        Storage.getGroups(),
        Storage.getGifts(),
        Storage.getUsers(),
      ]);
      if (savedUser) setUser(savedUser);
      setGroups(savedGroups);
      setGifts(savedGifts);
      setAllUsers(savedUsers);
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, name: string) => {
    const users = await Storage.getUsers();
    let existing = users.find((u) => u.email === email);
    if (!existing) {
      existing = {
        id: generateId(),
        name,
        email,
        birthday: '',
        paymentMethod: '',
        paymentHandle: '',
        avatarColor: getAvatarColor(users.length),
      };
      await Storage.saveUser(existing);
      setAllUsers((prev) => [...prev, existing!]);
    }
    await Storage.setCurrentUser(existing);
    setUser(existing);
  }, []);

  const logout = useCallback(async () => {
    await Storage.setCurrentUser(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    await Storage.setCurrentUser(updated);
    await Storage.saveUser(updated);
    setUser(updated);
    setAllUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    const updatedGroups = groups.map((g) => ({
      ...g,
      members: g.members.map((m) => (m.id === updated.id ? updated : m)),
    }));
    setGroups(updatedGroups);
    await Storage.saveGroups(updatedGroups);
  }, [user, groups]);

  const addProfileWishlistItem = useCallback(async (item: { title: string; url?: string }) => {
    if (!user) return;
    const newItem: WishlistItem = { id: generateId(), title: item.title, url: item.url, addedBy: user.id };
    const updated = { ...user, wishlist: [...(user.wishlist || []), newItem] };
    await Storage.setCurrentUser(updated);
    await Storage.saveUser(updated);
    setUser(updated);
    setAllUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    const updatedGroups = groups.map((g) => ({
      ...g,
      members: g.members.map((m) => (m.id === updated.id ? updated : m)),
    }));
    setGroups(updatedGroups);
    await Storage.saveGroups(updatedGroups);
  }, [user, groups]);

  const removeProfileWishlistItem = useCallback(async (itemId: string) => {
    if (!user) return;
    const updated = { ...user, wishlist: (user.wishlist || []).filter((w) => w.id !== itemId) };
    await Storage.setCurrentUser(updated);
    await Storage.saveUser(updated);
    setUser(updated);
    setAllUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    const updatedGroups = groups.map((g) => ({
      ...g,
      members: g.members.map((m) => (m.id === updated.id ? updated : m)),
    }));
    setGroups(updatedGroups);
    await Storage.saveGroups(updatedGroups);
  }, [user, groups]);

  const createGroup = useCallback(async (name: string, groupImage?: string) => {
    if (!user) throw new Error('Not logged in');
    const group: Group = {
      id: generateId(),
      name,
      inviteCode: generateInviteCode(),
      members: [user],
      organizerId: user.id,
      groupImage,
      createdAt: new Date().toISOString(),
    };
    const updated = [...groups, group];
    setGroups(updated);
    await Storage.saveGroups(updated);
    return group;
  }, [user, groups]);

  const updateGroupImage = useCallback(async (groupId: string, imageUri: string) => {
    const updated = groups.map((g) =>
      g.id === groupId ? { ...g, groupImage: imageUri } : g
    );
    setGroups(updated);
    await Storage.saveGroups(updated);
  }, [groups]);

  const joinGroup = useCallback(async (inviteCode: string) => {
    if (!user) return null;
    const group = groups.find((g) => g.inviteCode.toUpperCase() === inviteCode.toUpperCase());
    if (!group) return null;
    if (group.members.some((m) => m.id === user.id)) return group;
    const updatedGroup = { ...group, members: [...group.members, user] };
    const updated = groups.map((g) => (g.id === group.id ? updatedGroup : g));
    setGroups(updated);
    await Storage.saveGroups(updated);
    return updatedGroup;
  }, [user, groups]);

  const addMemberToGroup = useCallback(async (groupId: string, member: User) => {
    const updated = groups.map((g) => {
      if (g.id === groupId && !g.members.some((m) => m.id === member.id)) {
        return { ...g, members: [...g.members, member] };
      }
      return g;
    });
    setGroups(updated);
    await Storage.saveGroups(updated);
  }, [groups]);

  const removeMemberFromGroup = useCallback(async (groupId: string, memberId: string) => {
    const updated = groups.map((g) => {
      if (g.id === groupId) {
        return { ...g, members: g.members.filter((m) => m.id !== memberId) };
      }
      return g;
    });
    setGroups(updated);
    await Storage.saveGroups(updated);
  }, [groups]);

  const createGift = useCallback(async (groupId: string, birthdayPersonId: string) => {
    const gift: Gift = {
      id: generateId(),
      groupId,
      birthdayPersonId,
      phase: 'ideation' as GiftPhase,
      wishlist: [],
      payments: [],
      createdAt: new Date().toISOString(),
    };
    const updated = [...gifts, gift];
    setGifts(updated);
    await Storage.saveGifts(updated);
    return gift;
  }, [gifts]);

  const addWishlistItem = useCallback(async (giftId: string, item: Omit<WishlistItem, 'id'>) => {
    const updated = gifts.map((g) => {
      if (g.id === giftId) {
        return { ...g, wishlist: [...g.wishlist, { ...item, id: generateId() }] };
      }
      return g;
    });
    setGifts(updated);
    await Storage.saveGifts(updated);
  }, [gifts]);

  const removeWishlistItem = useCallback(async (giftId: string, itemId: string) => {
    const updated = gifts.map((g) => {
      if (g.id === giftId) {
        return { ...g, wishlist: g.wishlist.filter((w) => w.id !== itemId) };
      }
      return g;
    });
    setGifts(updated);
    await Storage.saveGifts(updated);
  }, [gifts]);

  const markPurchased = useCallback(async (giftId: string, item: string, cost: number) => {
    if (!user) return;
    const updated = gifts.map((g) => {
      if (g.id === giftId) {
        const group = groups.find((gr) => gr.id === g.groupId);
        const otherMembers = group?.members.filter((m) => m.id !== g.birthdayPersonId) || [];
        const splitAmount = otherMembers.length > 0 ? cost / otherMembers.length : cost;
        const payments: Payment[] = otherMembers.map((m) => ({
          userId: m.id,
          amount: Math.round(splitAmount * 100) / 100,
          paid: m.id === user.id,
          paidAt: m.id === user.id ? new Date().toISOString() : undefined,
        }));
        return {
          ...g,
          phase: 'settlement' as GiftPhase,
          purchasedItem: item,
          buyerId: user.id,
          totalCost: cost,
          payments,
          purchasedAt: new Date().toISOString(),
        };
      }
      return g;
    });
    setGifts(updated);
    await Storage.saveGifts(updated);
  }, [user, gifts, groups]);

  const markPaid = useCallback(async (giftId: string, userId: string) => {
    const updated = gifts.map((g) => {
      if (g.id === giftId) {
        return {
          ...g,
          payments: g.payments.map((p) =>
            p.userId === userId ? { ...p, paid: true, paidAt: new Date().toISOString() } : p
          ),
        };
      }
      return g;
    });
    setGifts(updated);
    await Storage.saveGifts(updated);
  }, [gifts]);

  const getGroupById = useCallback((id: string) => groups.find((g) => g.id === id), [groups]);
  const getGiftById = useCallback((id: string) => gifts.find((g) => g.id === id), [gifts]);
  const getGiftsForGroup = useCallback((groupId: string) => gifts.filter((g) => g.groupId === groupId), [gifts]);
  const getUserById = useCallback((id: string) => {
    if (user?.id === id) return user;
    const fromGroups = groups.flatMap((g) => g.members).find((m) => m.id === id);
    if (fromGroups) return fromGroups;
    return allUsers.find((u) => u.id === id);
  }, [user, groups, allUsers]);

  const seedDemoData = useCallback(async () => {
    if (!user) return;

    await Storage.clearAll();
    await Storage.setCurrentUser(user);
    await Storage.saveUser(user);
    setGroups([]);
    setGifts([]);
    setAllUsers([user]);

    const demoMembers: User[] = DEMO_NAMES.slice(0, 19).map((name, i) => ({
      id: generateId(),
      name,
      email: `${name.toLowerCase().replace(' ', '.')}@demo.com`,
      birthday: generateDemoBirthday(i),
      paymentMethod: i % 2 === 0 ? 'Venmo' : 'Zelle',
      paymentHandle: i % 2 === 0 ? `@${name.split(' ')[0].toLowerCase()}` : `${name.split(' ')[0].toLowerCase()}@email.com`,
      avatarColor: getAvatarColor(i + 1),
    }));

    const group: Group = {
      id: generateId(),
      name: 'College Friends',
      inviteCode: generateInviteCode(),
      members: [user, ...demoMembers],
      organizerId: user.id,
      createdAt: new Date().toISOString(),
    };

    const upcomingMember = demoMembers.find((m) => {
      const bday = new Date(m.birthday);
      const now = new Date();
      const nextBday = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
      if (nextBday < now) nextBday.setFullYear(nextBday.getFullYear() + 1);
      const diff = (nextBday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 30 && diff > 0;
    });

    const demoGifts: Gift[] = [];
    if (upcomingMember) {
      demoGifts.push({
        id: generateId(),
        groupId: group.id,
        birthdayPersonId: upcomingMember.id,
        phase: 'ideation',
        wishlist: [
          { id: generateId(), title: 'AirPods Pro', addedBy: upcomingMember.id },
          { id: generateId(), title: 'Kindle Paperwhite', addedBy: upcomingMember.id },
          { id: generateId(), title: 'Nike Running Shoes', addedBy: upcomingMember.id },
        ],
        payments: [],
        createdAt: new Date().toISOString(),
      });
    }

    const pastMember = demoMembers[5];
    const allMembers = [user, ...demoMembers];
    const otherMembers = allMembers.filter((m) => m.id !== pastMember.id);
    const splitAmount = 120 / otherMembers.length;
    const purchasedAt = new Date(Date.now() - 172800000).toISOString();
    demoGifts.push({
      id: generateId(),
      groupId: group.id,
      birthdayPersonId: pastMember.id,
      phase: 'settlement',
      wishlist: [{ id: generateId(), title: 'Bluetooth Speaker', addedBy: pastMember.id }],
      purchasedItem: 'Bluetooth Speaker',
      buyerId: demoMembers[0].id,
      totalCost: 120,
      payments: otherMembers.map((m, i) => ({
        userId: m.id,
        amount: Math.round(splitAmount * 100) / 100,
        paid: i < 12,
        paidAt: i < 12
          ? new Date(new Date(purchasedAt).getTime() + (i + 1) * 3600000 * (1 + Math.random() * 20)).toISOString()
          : undefined,
      })),
      createdAt: new Date(Date.now() - 604800000).toISOString(),
      purchasedAt,
    });

    for (const m of demoMembers) {
      await Storage.saveUser(m);
    }
    setAllUsers((prev) => [...prev, ...demoMembers]);

    const newGroups = [group];
    const newGifts = [...demoGifts];
    setGroups(newGroups);
    setGifts(newGifts);
    await Storage.saveGroups(newGroups);
    await Storage.saveGifts(newGifts);
  }, [user]);

  const value = useMemo(() => ({
    user, groups, gifts, loading,
    login, logout, updateProfile,
    addProfileWishlistItem, removeProfileWishlistItem,
    createGroup, updateGroupImage, joinGroup, addMemberToGroup, removeMemberFromGroup,
    createGift, addWishlistItem, removeWishlistItem,
    markPurchased, markPaid,
    getGroupById, getGiftById, getGiftsForGroup, getUserById,
    seedDemoData,
  }), [user, groups, gifts, loading, login, logout, updateProfile, addProfileWishlistItem, removeProfileWishlistItem, createGroup, updateGroupImage, joinGroup, addMemberToGroup, removeMemberFromGroup, createGift, addWishlistItem, removeWishlistItem, markPurchased, markPaid, getGroupById, getGiftById, getGiftsForGroup, getUserById, seedDemoData]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
