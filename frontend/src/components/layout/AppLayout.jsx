import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import {
  BarChart3,
  Boxes,
  CalendarDays,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Package,
  RotateCcw,
  Settings,
  Users,
} from 'lucide-react';
import { useAuth } from '../../features/auth/context/AuthContext';
import { authService } from '../../features/auth/services/auth.service';

const navigationGroups = [
  {
    label: 'Workspace',
    items: [
      { label: 'Overview', to: '/dashboard', icon: LayoutDashboard, end: true },
      { label: 'Customers', to: '/customers', icon: Users },
      { label: 'Products', to: '/products', icon: Package },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Inventory', to: '/inventory', icon: Boxes },
      { label: 'Bookings', to: '/bookings', icon: CalendarDays },
      { label: 'Payments', to: '/payments', icon: CreditCard },
      { label: 'Returns', to: '/returns', icon: RotateCcw },
    ],
  },
  {
    label: 'Insights',
    items: [{ label: 'Reports', icon: BarChart3, comingSoon: true }],
  },
  {
    label: 'System',
    items: [{ label: 'Settings', to: '/settings/categories', icon: Settings }],
  },
];

function AppLayout({ children }) {
  const navigate = useNavigate();
  const { user, shop, roles, clearSession } = useAuth();
  const userName = user?.name || 'Owner';
  const initials = userName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const shopLocation = [shop?.city, shop?.state].filter(Boolean).join(', ') || 'Shop location';
  const shopInitial = shop?.name?.trim()?.charAt(0)?.toUpperCase() || 'R';

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      clearSession();
      navigate('/auth/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9f6] text-[#252a29]">
      <aside className="fixed inset-y-0 left-0 z-50 flex w-16 flex-col border-r border-[#e6e8e4] bg-white md:w-[250px]">
        <Link to="/dashboard" className="flex h-[72px] shrink-0 items-center justify-center gap-2 border-b border-[#e6e8e4] px-2 md:justify-start md:px-5">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-[#68404b] text-sm font-bold text-white">R</span>
          <span className="hidden min-w-0 md:block">
            <span className="block text-[12px] font-extrabold tracking-[0.08em] text-[#252a29]">RENTORA</span>
            <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8a5360]">Atelier Suite</span>
          </span>
        </Link>

        <div className="px-2 py-4 md:px-4">
          <div className="flex min-h-[56px] items-center justify-center gap-2 rounded-md border border-[#e6e8e4] bg-[#f8f9f6] p-1.5 md:justify-start md:px-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-[#68404b] text-xs font-bold text-white">{shopInitial}</span>
            <span className="hidden min-w-0 flex-1 md:block">
              <span className="block truncate text-[11px] font-semibold text-[#252a29]">{shop?.name || 'Your shop'}</span>
              <span className="mt-0.5 block truncate text-[10px] text-[#747b78]">{shopLocation}</span>
            </span>
            <ChevronDown size={14} className="hidden shrink-0 text-[#747b78] md:block" aria-hidden="true" />
          </div>
        </div>

        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-2 pb-4 md:px-3">
          {navigationGroups.map((group) => (
            <div key={group.label} className="mb-5 last:mb-0">
              <p className="mb-2 hidden px-2 text-[9px] font-bold uppercase tracking-[0.12em] text-[#747b78] md:block">{group.label}</p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  if (item.comingSoon) {
                    return (
                      <div key={item.label} className="flex min-h-9 items-center justify-center gap-2 rounded-sm px-2 text-[11px] text-[#a1a6a2] md:justify-start md:px-2.5">
                        <Icon size={15} strokeWidth={1.8} />
                        <span className="hidden flex-1 md:inline">{item.label}</span>
                        <span className="hidden rounded-sm bg-[#f8f9f6] px-1.5 py-0.5 text-[9px] font-medium text-[#8a5360] md:inline">Soon</span>
                      </div>
                    );
                  }

                  return (
                    <NavLink
                      key={item.label}
                      to={item.to}
                      end={item.end}
                      title={item.label}
                      aria-label={item.label}
                      className={({ isActive }) => `flex min-h-9 items-center justify-center gap-2 rounded-sm px-2 text-[11px] font-medium transition md:justify-start md:px-2.5 ${
                        isActive ? 'bg-[#68404b] text-white' : 'text-[#717875] hover:bg-[#f8f9f6] hover:text-[#68404b]'
                      }`}
                    >
                      <Icon size={15} strokeWidth={1.9} />
                      <span className="hidden md:inline">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <header className="fixed left-16 right-0 top-0 z-40 h-[72px] border-b border-[#e6e8e4] bg-white md:left-[250px]">
        <div className="flex h-full items-center justify-end gap-3 px-3 sm:px-5">
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="grid size-8 place-items-center rounded-full bg-[#f8f9f6] text-[10px] font-bold text-[#68404b]">{initials || 'R'}</span>
            <div className="hidden sm:block">
              <p className="max-w-36 truncate text-[11px] font-semibold text-[#252a29]">{userName}</p>
              <p className="max-w-36 truncate text-[10px] text-[#747b78]">{roles.join(', ') || 'OWNER'}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              title="Sign out"
              className="grid size-8 place-items-center rounded-sm text-[#68404b] transition hover:bg-[#f8f9f6] hover:text-[#54333d] focus:outline-none focus:ring-2 focus:ring-[#68404b]/20"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="min-h-screen pl-16 pt-[72px] md:pl-[250px] [&>main]:min-h-[calc(100vh-72px)]">
        {children ?? <Outlet />}
      </div>
    </div>
  );
}

AppLayout.propTypes = {
  children: PropTypes.node,
};

export default AppLayout;
