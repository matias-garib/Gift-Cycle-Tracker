import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import type { User, Group, Gift, WishlistItem } from './types';
import * as API from './storage';

interface AppContextValue {
  user: User | null;
  groups: Group[];
  gifts: Gift[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  addProfileWishlistItem: (item: { title: string; url?: string }) => Promise<void>;
  removeProfileWishlistItem: (itemId: string) => Promise<void>;
  createGroup: (name: string, groupImage?: string) => Promise<Group>;
  updateGroupImage: (groupId: string, imageUri: string) => Promise<void>;
  joinGroup: (inviteCode: string) => Promise<Group | null>;
  removeMemberFromGroup: (groupId: string, memberId: string) => Promise<void>;
  createGift: (groupId: string, birthdayPersonId: string) => Promise<Gift>;
  addWishlistItem: (giftId: string, item: Omit<WishlistItem, 'id'>) => Promise<void>;
  removeWishlistItem: (giftId: string, itemId: string) => Promise<void>;
  markPurchased: (giftId: string, item: string, cost: number) => Promise<void>;
  markPaid: (giftId: string, userId: string) => Promise<void>;
  refreshGroups: () => Promise<void>;
  refreshGifts: (groupId: string) => Promise<void>;
  getGroupById: (id: string) => Group | undefined;
  getGiftById: (id: string) => Gift | undefined;
  getGiftsForGroup: (groupId: string) => Gift[];
  getUserById: (id: string) => User | undefined;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);

  // Load user on mount if token exists
  useEffect(() => {
    (async () => {
      try {
        const token = await API.getToken();
        if (token) {
          const me = await API.getMe();
          setUser(me);
          const userGroups = await API.getGroups();
          setGroups(userGroups);
          // Load gifts for all groups
          const allGifts = await Promise.all(userGroups.map((g: Group) => API.getGiftsForGroup(g.id)));
          setGifts(allGifts.flat());
        }
      } catch {
        await API.setToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const me = await API.login(email, password);
    setUser(me);
    const userGroups = await API.getGroups();
    setGroups(userGroups);
    const allGifts = await Promise.all(userGroups.map((g: Group) => API.getGiftsForGroup(g.id)));
    setGifts(allGifts.flat());
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const me = await API.register(name, email, password);
    setUser(me);
    setGroups([]);
    setGifts([]);
  }, []);

  const logout = useCallback(async () => {
    await API.logout();
    setUser(null);
    setGroups([]);
    setGifts([]);
  }, []);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    const updated = await API.updateMe(updates as Record<string, unknown>);
    setUser(updated);
    // Update user in group members too
    setGroups((prev) => prev.map((g) => ({
      ...g,
      members: g.members.map((m) => m.id === updated.id ? { ...m, ...updated } : m),
    })));
  }, []);

  const addProfileWishlistItem = useCallback(async (item: { title: string; url?: string }) => {
    await API.addProfileWishlistItem(item.title, item.url);
    const me = await API.getMe();
    setUser(me);
  }, []);

  const removeProfileWishlistItem = useCallback(async (itemId: string) => {
    await API.removeProfileWishlistItem(itemId);
    const me = await API.getMe();
    setUser(me);
  }, []);

  const refreshGroups = useCallback(async () => {
    const userGroups = await API.getGroups();
    setGroups(userGroups);
  }, []);

  const refreshGifts = useCallback(async (groupId: string) => {
    const groupGifts = await API.getGiftsForGroup(groupId);
    setGifts((prev) => [...prev.filter((g) => g.groupId !== groupId), ...groupGifts]);
  }, []);

  const createGroup = useCallback(async (name: string, groupImage?: string) => {
    const group = await API.createGroup(name, groupImage);
    setGroups((prev) => [...prev, group]);
    return group;
  }, []);

  const updateGroupImage = useCallback(async (groupId: string, imageUri: string) => {
    await API.updateGroupImage(groupId, imageUri);
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, groupImage: imageUri } : g));
  }, []);

  const joinGroup = useCallback(async (inviteCode: string) => {
    try {
      const group = await API.joinGroup(inviteCode);
      setGroups((prev) => {
        if (prev.some((g) => g.id === group.id)) return prev;
        return [...prev, group];
      });
      return group;
    } catch {
      return null;
    }
  }, []);

  const removeMemberFromGroup = useCallback(async (groupId: string, memberId: string) => {
    await API.removeMemberFromGroup(groupId, memberId);
    setGroups((prev) => prev.map((g) => g.id === groupId
      ? { ...g, members: g.members.filter((m) => m.id !== memberId) }
      : g
    ));
  }, []);

  const createGift = useCallback(async (groupId: string, birthdayPersonId: string) => {
    const gift = await API.createGift(groupId, birthdayPersonId);
    setGifts((prev) => [...prev, gift]);
    return gift;
  }, []);

  const addWishlistItem = useCallback(async (giftId: string, item: Omit<WishlistItem, 'id'>) => {
    await API.addWishlistItem(giftId, item.title, item.url);
    await refreshGifts(gifts.find((g) => g.id === giftId)?.groupId || '');
  }, [gifts, refreshGifts]);

  const removeWishlistItem = useCallback(async (giftId: string, itemId: string) => {
    await API.removeWishlistItem(giftId, itemId);
    await refreshGifts(gifts.find((g) => g.id === giftId)?.groupId || '');
  }, [gifts, refreshGifts]);

  const markPurchased = useCallback(async (giftId: string, item: string, cost: number) => {
    await API.markPurchased(giftId, item, cost);
    await refreshGifts(gifts.find((g) => g.id === giftId)?.groupId || '');
  }, [gifts, refreshGifts]);

  const markPaid = useCallback(async (giftId: string, _userId: string) => {
    await API.markPaid(giftId);
    await refreshGifts(gifts.find((g) => g.id === giftId)?.groupId || '');
  }, [gifts, refreshGifts]);

  const getGroupById = useCallback((id: string) => groups.find((g) => g.id === id), [groups]);
  const getGiftById = useCallback((id: string) => gifts.find((g) => g.id === id), [gifts]);
  const getGiftsForGroup = useCallback((groupId: string) => gifts.filter((g) => g.groupId === groupId), [gifts]);
  const getUserById = useCallback((id: string) => {
    if (user?.id === id) return user;
    return groups.flatMap((g) => g.members).find((m) => m.id === id);
  }, [user, groups]);

  const value = useMemo(() => ({
    user, groups, gifts, loading,
    login, register, logout,
    updateProfile, addProfileWishlistItem, removeProfileWishlistItem,
    createGroup, updateGroupImage, joinGroup, removeMemberFromGroup,
    createGift, addWishlistItem, removeWishlistItem,
    markPurchased, markPaid,
    refreshGroups, refreshGifts,
    getGroupById, getGiftById, getGiftsForGroup, getUserById,
  }), [user, groups, gifts, loading, login, register, logout, updateProfile,
    addProfileWishlistItem, removeProfileWishlistItem, createGroup, updateGroupImage,
    joinGroup, removeMemberFromGroup, createGift, addWishlistItem, removeWishlistItem,
    markPurchased, markPaid, refreshGroups, refreshGifts,
    getGroupById, getGiftById, getGiftsForGroup, getUserById]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
