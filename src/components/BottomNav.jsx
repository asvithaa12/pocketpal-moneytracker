import { NavLink, useLocation } from 'react-router-dom';
import { Home, Plus, List, Users, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/transactions', icon: List, label: 'Transactions' },
  { to: '/add', icon: Plus, label: 'Add', isFab: true },
  { to: '/friends', icon: Users, label: 'Friends' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around h-[60px] max-w-md mx-auto px-2">
        {NAV_ITEMS.map(({ to, icon: Icon, label, isFab }) => {
          const isActive = to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(to);

          if (isFab) {
            return (
              <NavLink
                key={to}
                to={to}
                className="flex flex-col items-center justify-center"
                aria-label={label}
              >
                <div className={`w-13 h-13 rounded-full flex items-center justify-center shadow-md transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#556B2F] ${
                  isActive ? 'bg-[#3D4A20] shadow-[0_8px_16px_rgba(61,74,32,0.3)]' : 'bg-[#556B2F] hover:bg-[#3D4A20] hover:shadow-[0_8px_16px_rgba(85,107,47,0.3)]'
                }`} style={{ width: 52, height: 52 }}>
                  <Icon size={22} className="text-white" />
                </div>
              </NavLink>
            );
          }

          return (
            <NavLink
              key={to}
              to={to}
              className="flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-2 py-1"
              aria-label={label}
            >
              <Icon
                size={20}
                style={{ color: isActive ? '#556B2F' : '#94A3B8' }}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span
                className="text-[10px] font-medium leading-none"
                style={{ color: isActive ? '#556B2F' : '#94A3B8' }}
              >
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
