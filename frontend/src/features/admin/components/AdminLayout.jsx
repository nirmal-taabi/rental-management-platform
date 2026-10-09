import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  Store,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import brandLogo from '../../../assets/TrackinHubLogo.png';
import { useAuth } from '../../auth/context/AuthContext';
import { authService } from '../../auth/services/auth.service';

const navigation = [
  { label: 'Overview', to: '/admin/overview', icon: LayoutDashboard },
  { label: 'Shops', to: '/admin/shops', icon: Store },
  { label: 'Account users', to: '/admin/users', icon: UserRound },
  { label: 'End customers', to: '/admin/customers', icon: Users },
  { label: 'Bookings', to: '/admin/bookings', icon: CalendarDays },
  { label: 'Reports', to: '/admin/reports', icon: Activity },
];

const pageTitles = {
  '/admin/overview': 'Platform overview',
  '/admin/shops': 'Rental shops',
  '/admin/users': 'Account users',
  '/admin/customers': 'End customers',
  '/admin/bookings': 'Bookings',
  '/admin/reports': 'Platform reports',
};

function AdminLayout() {
  const { user, clearSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      clearSession();
      navigate('/auth/login');
    }
  };

  const renderNavigation = () => navigation.map(({ label, to, icon: Icon }) => (
    <NavLink
      key={to}
      to={to}
      onClick={() => setMobileNavOpen(false)}
      className={({ isActive }) => `flex min-h-11 items-center gap-3 px-3 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#6132DA] ${isActive ? 'bg-[#f2edff] text-[#5127bd]' : 'text-[#535a57] hover:bg-[#f8f9f6] hover:text-[#252a29]'}`}
    >
      <Icon size={17} aria-hidden="true" />
      {label}
    </NavLink>
  ));

  return (
    <div className="min-h-screen bg-[#f7f7fa] text-[#252a29]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-[#e8e8ee] bg-white lg:flex">
        <Link to="/admin/overview" className="flex h-[72px] items-center border-b border-[#e8e8ee] px-5">
          <img src={brandLogo} alt="TrackinHub" className="h-9 max-w-[170px] object-contain" />
          <span className="ml-auto rounded-full bg-[#f2edff] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-[#5127bd]">Platform</span>
        </Link>
        <p className="px-5 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#93999e]">Administration</p>
        <nav aria-label="Super Admin navigation" className="space-y-1 px-3">{renderNavigation()}</nav>
        <div className="mt-auto border-t border-[#e8e8ee] p-3">
          <button type="button" onClick={logout} className="flex min-h-11 w-full items-center gap-3 px-3 text-sm font-medium text-[#535a57] transition hover:bg-[#f8f9f6] hover:text-[#252a29] focus:outline-none focus:ring-2 focus:ring-[#6132DA]">
            <LogOut size={17} aria-hidden="true" /> Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex min-h-[68px] items-center justify-between border-b border-[#e8e8ee] bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button type="button" aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen((open) => !open)} className="grid size-9 place-items-center text-[#535a57] hover:bg-[#f4f3f7] lg:hidden">
              {mobileNavOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
            <div>
              <p className="text-[10px] font-medium text-[#898e94]">TrackinHub / Platform</p>
              <h1 className="text-sm font-semibold text-[#26252c] sm:text-base">{pageTitles[location.pathname] || 'Shop details'}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-right sm:block">
              <span className="block text-xs font-semibold text-[#323039]">{user?.name || 'Platform administrator'}</span>
              <span className="mt-0.5 block text-[10px] text-[#898e94]">Super Admin</span>
            </span>
            <span className="grid size-9 place-items-center rounded-full bg-[#f2edff] text-xs font-bold text-[#5127bd]" aria-hidden="true">
              {(user?.name || 'SA').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
            </span>
            <button type="button" onClick={logout} aria-label="Sign out" className="grid size-9 place-items-center text-[#535a57] hover:bg-[#f4f3f7] lg:hidden"><LogOut size={17} /></button>
          </div>
        </header>

        {mobileNavOpen && (
          <div className="fixed inset-0 z-20 bg-black/30 lg:hidden" onClick={() => setMobileNavOpen(false)}>
            <nav aria-label="Super Admin navigation" className="w-[min(280px,85vw)] space-y-1 border-r border-[#e8e8ee] bg-white px-3 pb-4 pt-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
              {renderNavigation()}
            </nav>
          </div>
        )}

        <main className="min-h-[calc(100vh-68px)] px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px]"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
