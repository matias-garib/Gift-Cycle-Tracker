import * as Crypto from 'expo-crypto';

export function generateId(): string {
  return Crypto.randomUUID();
}

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

const AVATAR_COLORS = [
  '#2D5A3D', '#7BA88E', '#D4A537', '#C44B4B', '#4A7FB5',
  '#8B6DB0', '#D4785C', '#5C9A8B', '#A0522D', '#6B8E23',
  '#708090', '#CD853F', '#4682B4', '#BC8F8F', '#8FBC8F',
  '#DAA520', '#778899', '#B8860B', '#556B2F', '#8B4513',
];

export function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function formatBirthdayDisplay(dateStr: string): string {
  if (!dateStr) return 'Not set';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

export function getDaysUntilBirthday(birthdayStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bday = new Date(birthdayStr);
  const nextBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
  if (nextBday < today) {
    nextBday.setFullYear(nextBday.getFullYear() + 1);
  }
  const diff = nextBday.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getUpcomingBirthdays(
  members: { id: string; name: string; birthday: string; avatarColor: string }[],
  days: number = 30
) {
  return members
    .map((m) => ({
      ...m,
      daysUntil: getDaysUntilBirthday(m.birthday),
    }))
    .filter((m) => m.daysUntil <= days && m.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

export function timeSince(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
