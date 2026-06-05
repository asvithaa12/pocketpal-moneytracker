export const CATEGORIES = [
  { id: 'food', label: 'Food & canteen', icon: 'UtensilsCrossed', color: '#F59E0B', bg: '#FEF3C7' },
  { id: 'education', label: 'Education & stationery', icon: 'BookOpen', color: '#3B82F6', bg: '#EFF6FF' },
  { id: 'transport', label: 'Transport', icon: 'Bus', color: '#8B5CF6', bg: '#F5F3FF' },
  { id: 'entertainment', label: 'Entertainment', icon: 'Gamepad2', color: '#EC4899', bg: '#FDF2F8' },
  { id: 'clothing', label: 'Clothing & personal', icon: 'ShoppingBag', color: '#14B8A6', bg: '#F0FDFA' },
  { id: 'health', label: 'Health', icon: 'Heart', color: '#EF4444', bg: '#FEF2F2' },
  { id: 'friend_gave', label: 'Given to friend', icon: 'UserCheck', color: '#15803D', bg: '#F0FDF4' },
  { id: 'other', label: 'Other', icon: 'MoreHorizontal', color: '#94A3B8', bg: '#F1F5F9' },
];

export const PAYMENT_MODES = [
  { id: 'cash', label: 'Cash', color: '#22C55E' },
  { id: 'fampay', label: 'FamPay', color: '#F59E0B' },
  { id: 'phonepe', label: 'PhonePe', color: '#3B82F6' },
  { id: 'online', label: 'Online / UPI', color: '#8B5CF6' },
];

export function getCategoryById(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}

export function getPaymentModeById(id) {
  return PAYMENT_MODES.find(p => p.id === id) || PAYMENT_MODES[0];
}
