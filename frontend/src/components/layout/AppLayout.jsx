import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import brandLogo from '../../assets/TrackinHubLogo.png';
import {
  BarChart3,
  Boxes,
  CalendarDays,
  Check,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  LogOut,
  CircleUserRound,
  Home,
  Package,
  Plus,
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
    items: [{ label: 'Reports', to: '/reports', icon: BarChart3 }],
  },
  {
    label: 'System',
    items: [{ label: 'Settings', to: '/settings', icon: Settings }],
  },
];

function AppLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, shop, roles, availableShops, switchShop, clearSession } = useAuth();
  const canCreateShop = roles.some((role) => ['OWNER', 'ADMIN'].includes(String(role).toUpperCase()));
  const [isShopMenuOpen, setIsShopMenuOpen] = useState(false);
  const shopSwitcherRef = useRef(null);
  const [switchingShopId, setSwitchingShopId] = useState(null);
  const [shopSwitchError, setShopSwitchError] = useState('');
  const userName = user?.name || 'Owner';
  const initials = userName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const shopLocation = [shop?.city, shop?.state].filter(Boolean).join(', ') || 'Shop location';
  const shopInitial = shop?.name?.trim()?.charAt(0)?.toUpperCase() || 'R';

  useEffect(() => {
    if (!isShopMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!shopSwitcherRef.current?.contains(event.target)) setIsShopMenuOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsShopMenuOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isShopMenuOpen]);

  const handleShopSwitch = async (nextShop) => {
    if (!nextShop || String(nextShop.id) === String(shop?.id) || nextShop.status !== 'ACTIVE') return;
    setSwitchingShopId(nextShop.id);
    setShopSwitchError('');
    try {
      await switchShop(nextShop.id);
      window.location.reload();
    } catch (error) {
      setShopSwitchError(error.response?.data?.message || 'Unable to switch shops.');
      setSwitchingShopId(null);
    }
  };

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
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[250px] flex-col border-r border-[#e6e8e4] bg-white md:flex">
        <Link to="/dashboard" className="flex h-[72px] shrink-0 items-center justify-center border-b border-[#e6e8e4] bg-white px-2 md:justify-start md:px-5">
          <img src={brandLogo} alt="TrackinHub logo" className="h-9 w-auto max-w-[150px] object-contain" />
        </Link>

        <div className="px-2 py-4 md:px-4">
          <div className="relative" ref={shopSwitcherRef}>
            <button
              type="button"
              aria-label={`Current shop: ${shop?.name || 'Your shop'}, ${shopLocation}, ${shop?.role || roles[0] || 'OWNER'}. Switch shops`}
              aria-expanded={isShopMenuOpen}
              onClick={() => {
                setIsShopMenuOpen((open) => !open);
                setShopSwitchError('');
              }}
              className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-md border border-[#e6e8e4] bg-[#f8f9f6] p-1.5 text-left transition hover:border-[#D8CCF5] focus:outline-none focus:ring-2 focus:ring-[#6132DA]/20 md:justify-start md:px-2"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-[#6132DA] text-xs font-bold text-white">{shopInitial}</span>
              <span className="hidden min-w-0 flex-1 md:block">
                <span className="block truncate text-[11px] font-semibold text-[#252a29]">{shop?.name || 'Your shop'}</span>
                <span className="mt-0.5 block truncate text-[10px] text-[#747b78]">{shopLocation} · {shop?.role || roles[0] || 'OWNER'}</span>
              </span>
              <ChevronDown size={14} className="hidden shrink-0 text-[#747b78] md:block" aria-hidden="true" />
            </button>
            {isShopMenuOpen && (
              <div className="absolute left-full top-0 z-[60] ml-2 w-[min(280px,calc(100vw-5.5rem))] border border-[#e6e8e4] bg-white shadow-lg md:left-0 md:top-[calc(100%+8px)] md:ml-0">
                <div className="border-b border-[#e8eae7] px-4 py-3">
                  <p className="text-xs font-semibold text-[#252a29]">Your shops</p>
                  <p className="mt-0.5 text-[10px] text-[#747b78]">Choose an active workspace</p>
                </div>
                <div className="max-h-64 overflow-y-auto p-1.5">
                  {availableShops.map((availableShop) => {
                    const isCurrentShop = String(availableShop.id) === String(shop?.id);
                    const isActive = availableShop.status === 'ACTIVE';
                    return (
                      <button
                        key={availableShop.id}
                        type="button"
                        disabled={!isActive || switchingShopId !== null}
                        aria-current={isCurrentShop ? 'true' : undefined}
                        onClick={() => handleShopSwitch(availableShop)}
                        className="flex min-h-14 w-full items-center gap-3 rounded-sm px-2.5 py-2 text-left transition hover:bg-[#f8f9f6] disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-[#f1f2ef] text-xs font-semibold text-[#6132DA]">{availableShop.name?.trim()?.charAt(0)?.toUpperCase() || 'S'}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-[#252a29]">{availableShop.name}</span>
                          <span className="mt-0.5 block truncate text-[10px] text-[#747b78]">{[availableShop.city, availableShop.state].filter(Boolean).join(', ') || 'Location not set'} · {availableShop.role}</span>
                        </span>
                        {isCurrentShop && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#6132DA]"><Check size={14} /> Current</span>}
                        {!isActive && <span className="text-[10px] text-[#747b78]">Inactive</span>}
                      </button>
                    );
                  })}
                </div>
                {shopSwitchError && <p role="alert" className="mx-3 mb-2 border border-rose-200 bg-rose-50 px-2 py-1.5 text-[10px] text-rose-800">{shopSwitchError}</p>}
                <div className={`grid gap-1 border-t border-[#e8eae7] p-2 ${canCreateShop ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <Link to="/settings/shops" onClick={() => setIsShopMenuOpen(false)} className="inline-flex min-h-9 items-center justify-center gap-1 rounded-sm px-2 text-[10px] font-semibold text-[#414846] transition hover:bg-[#f8f9f6]"><Settings size={13} /> Manage shops</Link>
                  {canCreateShop && <Link to="/settings/shops" onClick={() => setIsShopMenuOpen(false)} className="inline-flex min-h-9 items-center justify-center gap-1 rounded-sm bg-[#6132DA] px-2 text-[10px] font-semibold text-white transition hover:bg-[#4D25B5]"><Plus size={13} /> Create shop</Link>}
                </div>
              </div>
            )}
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
                        <span className="hidden rounded-sm bg-[#f8f9f6] px-1.5 py-0.5 text-[9px] font-medium text-[#8060D9] md:inline">Soon</span>
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
                        isActive ? 'bg-[#6132DA] text-white' : 'text-[#717875] hover:bg-[#f8f9f6] hover:text-[#6132DA]'
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

      <header className="fixed left-0 right-0 top-0 z-40 h-14 border-b border-[#e6e8e4] bg-white md:left-[250px] md:h-[72px]">
        <div className="flex h-full items-center justify-between gap-3 px-4 sm:px-5">
          <Link to="/dashboard" className="inline-flex min-w-0 items-center gap-2 md:hidden">
            <img src={brandLogo} alt="TrackinHub" className="h-8 w-auto max-w-[128px] object-contain" />
            <span className="max-w-[120px] truncate border-l border-[#e6e8e4] pl-2 text-xs font-medium text-[#59615e]">{shop?.name || 'Workspace'}</span>
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <Link to="/profile" aria-label="Open profile and settings" className="grid size-9 place-items-center rounded-full bg-[#f1ecfc] text-xs font-bold text-[#6132DA] md:size-8">
              <span className="md:hidden">{initials || 'R'}</span>
              <span className="hidden md:inline"><CircleUserRound size={17} /></span>
            </Link>
            <div className="hidden md:block">
              <p className="max-w-36 truncate text-[11px] font-semibold text-[#252a29]">{userName}</p>
              <p className="max-w-36 truncate text-[10px] text-[#747b78]">{roles.join(', ') || 'OWNER'}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sign out"
              title="Sign out"
              className="hidden size-8 place-items-center rounded-sm text-[#6132DA] transition hover:bg-[#f8f9f6] hover:text-[#4D25B5] focus:outline-none focus:ring-2 focus:ring-[#6132DA]/20 md:grid"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom))] pt-14 md:pb-0 md:pl-[250px] md:pt-[72px] [&>main]:min-h-[calc(100vh-3.5rem)] md:[&>main]:min-h-[calc(100vh-72px)]">
        {children ?? <Outlet />}
      </div>
      <nav aria-label="Primary mobile navigation" className="fixed inset-x-0 bottom-0 z-[70] grid grid-cols-3 border-t border-[#e6e8e4] bg-white/95 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(37,42,41,0.08)] backdrop-blur md:hidden">
        {[
          { label: 'Dashboard', to: '/dashboard', icon: Home, end: true },
          { label: 'Bookings', to: '/bookings', icon: CalendarDays },
          { label: 'Profile', to: '/profile', icon: CircleUserRound },
        ].map(({ label, to, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            aria-label={label}
            className={({ isActive }) => `flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition ${isActive || (label === 'Profile' && (location.pathname.startsWith('/settings') || location.pathname === '/change-password')) ? 'text-[#6132DA]' : 'text-[#747b78]'}`}
          >
            {({ isActive }) => (
              <>
                <span className={`grid size-8 place-items-center rounded-xl ${isActive || (label === 'Profile' && (location.pathname.startsWith('/settings') || location.pathname === '/change-password')) ? 'bg-[#f1ecfc]' : ''}`}>
                  <Icon size={19} strokeWidth={2} />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

AppLayout.propTypes = {
  children: PropTypes.node,
};

export default AppLayout;
