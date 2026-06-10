export interface UserProfile {
  id: string;
  email: string;
  created_at: string;
}

export type TransactionType = 'expense' | 'friend_gave' | 'friend_received' | 'settlement';

export interface Transaction {
  id: string;
  user_id: string | null;
  type: TransactionType;
  amount: number;
  category: string;
  subcategory: string;
  description: string;
  date: string;
  friend_name: string | null;
  source: string;
  qr_id: string | null;
  created_at: string;
}

export interface QRTag {
  id: string;
  user_id: string | null;
  hash: string;
  label: string;
  category_id: string;
  times_scanned: number;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  month: string; // YYYY-MM
  total_budget: number;
  category_limits: Record<string, number>; // e.g., { "food": 2000 }
  created_at: string;
  updated_at: string;
}

export interface FriendBalance {
  name: string;
  balance: number; // positive means they owe us, negative means we owe them
  lent: number;
  borrowed: number;
  repayments: number;
  pending_balance: number;
}
