import { NavLink, useLocation } from 'react-router-dom';
import { Home, Plus, List, Users, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/transactions', icon: List, label: 'Logs' },
  { to: '/add', icon: Plus, label: 'Add', isFab: true },
  { to: '/friends', icon: Users, label: 'Friends' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Floating pill container */}
      <div className="mx-4 mb-3">
        <div
          className="flex items-center justify-around h-[60px] rounded-[20px] bg-white px-2"
          style={{ boxShadow: '0 4px 28px rgba(0,0,0,0.10), 0 1px 6px rgba(0,0,0,0.06)' }}
        >
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
                  <div
                    className="flex items-center justify-center rounded-full transition-all duration-200 active:scale-90"
                    style={{
                      width: 48,
                      height: 48,
                      background: isActive
                        ? 'linear-gradient(145deg, #3D4A20, #2A3316)'
                        : 'linear-gradient(145deg, #556B2F, #3D4A20)',
                      boxShadow: '0 6px 18px rgba(85,107,47,0.38)',
                    }}
                  >
                    <Icon size={22} className="text-white" strokeWidth={2.2} />
                  </div>
                </NavLink>
              );
            }

            return (
              <NavLink
                key={to}
                to={to}
                className="flex flex-col items-center justify-center gap-1 min-w-[48px] min-h-[48px] px-2 relative"
                aria-label={label}
              >
                {isActive && (
                  <span
                    className="absolute top-1 w-5 h-0.5 rounded-full"
                    style={{ background: '#556B2F', opacity: 0.7 }}
                  />
                )}
                <Icon
                  size={21}
                  style={{ color: isActive ? '#556B2F' : '#B0BCCB' }}
                  strokeWidth={isActive ? 2.3 : 1.7}
                />
                <span
                  className="text-[9.5px] font-semibold leading-none tracking-wide"
                  style={{ color: isActive ? '#556B2F' : '#B0BCCB' }}
                >
                  {label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
