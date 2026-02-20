export interface User {
  id: string;
  name: string;
  email: string;
  birthday: string;
  paymentMethod: string;
  paymentHandle: string;
  avatarColor: string;
}

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  members: User[];
  createdAt: string;
}

export interface WishlistItem {
  id: string;
  title: string;
  url?: string;
  addedBy: string;
}

export type GiftPhase = 'ideation' | 'payment' | 'settlement';

export interface Payment {
  userId: string;
  amount: number;
  paid: boolean;
  paidAt?: string;
}

export interface Gift {
  id: string;
  groupId: string;
  birthdayPersonId: string;
  phase: GiftPhase;
  wishlist: WishlistItem[];
  purchasedItem?: string;
  buyerId?: string;
  totalCost?: number;
  payments: Payment[];
  createdAt: string;
  purchasedAt?: string;
}

export interface PaymentStat {
  userId: string;
  userName: string;
  avatarColor: string;
  avgPayTime: number;
  totalPaid: number;
  totalOwed: number;
  onTimeCount: number;
  lateCount: number;
}
