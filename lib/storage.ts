import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, Group, Gift } from './types';

const KEYS = {
  currentUser: 'giftcycle_current_user',
  groups: 'giftcycle_groups',
  gifts: 'giftcycle_gifts',
  users: 'giftcycle_users',
};

export async function getCurrentUser(): Promise<User | null> {
  const data = await AsyncStorage.getItem(KEYS.currentUser);
  return data ? JSON.parse(data) : null;
}

export async function setCurrentUser(user: User | null): Promise<void> {
  if (user) {
    await AsyncStorage.setItem(KEYS.currentUser, JSON.stringify(user));
  } else {
    await AsyncStorage.removeItem(KEYS.currentUser);
  }
}

export async function getUsers(): Promise<User[]> {
  const data = await AsyncStorage.getItem(KEYS.users);
  return data ? JSON.parse(data) : [];
}

export async function saveUser(user: User): Promise<void> {
  const users = await getUsers();
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    users[idx] = user;
  } else {
    users.push(user);
  }
  await AsyncStorage.setItem(KEYS.users, JSON.stringify(users));
}

export async function getGroups(): Promise<Group[]> {
  const data = await AsyncStorage.getItem(KEYS.groups);
  return data ? JSON.parse(data) : [];
}

export async function saveGroups(groups: Group[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.groups, JSON.stringify(groups));
}

export async function getGifts(): Promise<Gift[]> {
  const data = await AsyncStorage.getItem(KEYS.gifts);
  return data ? JSON.parse(data) : [];
}

export async function saveGifts(gifts: Gift[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.gifts, JSON.stringify(gifts));
}

export async function clearAll(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}

const RESET_KEY = 'giftcycle_data_reset_v1';

export async function getResetFlag(): Promise<boolean> {
  const val = await AsyncStorage.getItem(RESET_KEY);
  return val === 'true';
}

export async function setResetFlag(): Promise<void> {
  await AsyncStorage.setItem(RESET_KEY, 'true');
}
