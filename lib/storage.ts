import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://gift-cycle-tracker-production.up.railway.app';

// ── Token management ───────────────────────────────────────────────────────

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem('giftcycle_token');
}

export async function setToken(token: string | null): Promise<void> {
  if (token) {
    await AsyncStorage.setItem('giftcycle_token', token);
  } else {
    await AsyncStorage.removeItem('giftcycle_token');
  }
}

// ── Base fetch helper ──────────────────────────────────────────────────────

async function api(path: string, options: RequestInit = {}) {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── Auth ───────────────────────────────────────────────────────────────────

export async function register(name: string, email: string, password: string) {
  const data = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
  await setToken(data.token);
  return data.user;
}

export async function login(email: string, password: string) {
  const data = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  await setToken(data.token);
  return data.user;
}

export async function logout() {
  await api('/api/auth/logout', { method: 'POST' });
  await setToken(null);
}

// ── User / Profile ─────────────────────────────────────────────────────────

export async function getMe() {
  return api('/api/me');
}

export async function updateMe(updates: Record<string, unknown>) {
  return api('/api/me', { method: 'PATCH', body: JSON.stringify(updates) });
}

export async function getUserById(id: string) {
  return api(`/api/users/${id}`);
}

export async function addProfileWishlistItem(title: string, url?: string) {
  return api('/api/me/wishlist', { method: 'POST', body: JSON.stringify({ title, url }) });
}

export async function removeProfileWishlistItem(itemId: string) {
  return api(`/api/me/wishlist/${itemId}`, { method: 'DELETE' });
}

// ── Groups ─────────────────────────────────────────────────────────────────

export async function getGroups() {
  return api('/api/groups');
}

export async function createGroup(name: string, groupImage?: string) {
  return api('/api/groups', { method: 'POST', body: JSON.stringify({ name, groupImage }) });
}

export async function joinGroup(inviteCode: string) {
  return api('/api/groups/join', { method: 'POST', body: JSON.stringify({ inviteCode }) });
}

export async function updateGroupImage(groupId: string, imageUri: string) {
  return api(`/api/groups/${groupId}`, { method: 'PATCH', body: JSON.stringify({ groupImage: imageUri }) });
}

export async function removeMemberFromGroup(groupId: string, memberId: string) {
  return api(`/api/groups/${groupId}/members/${memberId}`, { method: 'DELETE' });
}

// ── Gifts ──────────────────────────────────────────────────────────────────

export async function getGiftsForGroup(groupId: string) {
  return api(`/api/groups/${groupId}/gifts`);
}

export async function createGift(groupId: string, birthdayPersonId: string) {
  return api(`/api/groups/${groupId}/gifts`, {
    method: 'POST',
    body: JSON.stringify({ birthdayPersonId }),
  });
}

export async function addWishlistItem(giftId: string, title: string, url?: string) {
  return api(`/api/gifts/${giftId}/wishlist`, {
    method: 'POST',
    body: JSON.stringify({ title, url }),
  });
}

export async function removeWishlistItem(giftId: string, itemId: string) {
  return api(`/api/gifts/${giftId}/wishlist/${itemId}`, { method: 'DELETE' });
}

export async function markPurchased(giftId: string, purchasedItem: string, totalCost: number) {
  return api(`/api/gifts/${giftId}/purchase`, {
    method: 'POST',
    body: JSON.stringify({ purchasedItem, totalCost }),
  });
}

export async function markPaid(giftId: string) {
  return api(`/api/gifts/${giftId}/pay`, { method: 'POST' });
}
