import {
  UtensilsCrossed, BookOpen, Bus, Gamepad2, ShoppingBag,
  Heart, UserCheck, MoreHorizontal
} from 'lucide-react';
import { getCategoryById } from '../data/categories';

const ICON_MAP = {
  UtensilsCrossed, BookOpen, Bus, Gamepad2, ShoppingBag,
  Heart, UserCheck, MoreHorizontal
};

export default function CategoryIcon({ categoryId, size = 20, className = '' }) {
  const cat = getCategoryById(categoryId);
  const Icon = ICON_MAP[cat.icon] || MoreHorizontal;

  return (
    <div
      className={`rounded-full flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ backgroundColor: cat.bg, width: size + 16, height: size + 16 }}
    >
      <Icon size={size} style={{ color: cat.color }} />
    </div>
  );
}
