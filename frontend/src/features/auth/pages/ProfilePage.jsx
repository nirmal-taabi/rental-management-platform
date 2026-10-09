import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Boxes,
  ChevronRight,
  CircleUserRound,
  CreditCard,
  LogOut,
  Package,
  RotateCcw,
  Settings,
  Store,
  Tags,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';

const profileLinks = [
  {
    title: 'Business',
    items: [
      { label: 'Customers', description: 'Customer profiles and rental history', to: '/customers', icon: Users },
      { label: 'Products', description: 'Products, pricing, and categories', to: '/products', icon: Package },
      { label: 'Inventory', description: 'Individual rentable pieces and status', to: '/inventory', icon: Boxes },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Payments', description: 'Payment records and receipts', to: '/payments', icon: CreditCard },
      { label: 'Returns', description: 'Returned items and condition records', to: '/returns', icon: RotateCcw },
      { label: 'Reports', description: 'Business activity and insights', to: '/reports', icon: BarChart3 },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Shop & branches', description: 'Shop details and branch access', to: '/settings/shops', icon: Store },
      { label: 'Categories', description: 'Organize your product catalog', to: '/settings/categories', icon: Tags },
      { label: 'Team members', description: 'Manage staff accounts and access', to: '/settings/team', icon: Users, ownerOnly: true },
      { label: 'Change password', description: 'Update your account password', to: '/change-password', icon: Settings },
    ],
  },
];

function ProfilePage() {
  const navigate = useNavigate();
  const { user, shop, roles, availableShops, switchShop, clearSession } = useAuth();
  const [switchError, setSwitchError] = useState('');
  const [switchingId, setSwitchingId] = useState(null);
  const [logoutError, setLogoutError] = useState('');
  const isOwner = roles.some((role) => String(role).toUpperCase() === 'OWNER');
  const visibleLinks = profileLinks.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.ownerOnly || isOwner),
  }));
  const initials = (user?.name || 'Account')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const handleLogout = async () => {
    setLogoutError('');
    try {
      await authService.logout();
    } catch (error) {
      setLogoutError(error.response?.data?.message || 'Could not reach the server to sign out. Your local session was cleared.');
    } finally {
      clearSession();
      navigate('/auth/login');
    }
  };

  const handleShopSwitch = async (nextShopId) => {
    if (!nextShopId || String(nextShopId) === String(shop?.id)) return;
    setSwitchError('');
    setSwitchingId(nextShopId);
    try {
      await switchShop(nextShopId);
      window.location.reload();
    } catch (error) {
      setSwitchError(error.response?.data?.message || 'Unable to switch shops.');
      setSwitchingId(null);
    }
  };

  return (
    <main className="min-h-full bg-[#f8f9f6] px-4 py-5 text-[#252a29] sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8060D9]">Your account</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Profile</h1>
        </header>

        <section className="mb-6 flex items-center gap-4 border border-[#e6e8e4] bg-white p-4 sm:p-5">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#f1ecfc] text-sm font-bold text-[#6132DA]">{initials}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{user?.name || 'TrackinHub user'}</span>
            <span className="mt-0.5 block truncate text-sm text-[#59615e]">{user?.email || ''}</span>
            <span className="mt-1 block truncate text-xs text-[#747b78]">{shop?.name || 'Workspace'} · {roles.join(', ') || shop?.role || 'Member'}</span>
          </span>
          <CircleUserRound className="hidden text-[#b6a5e8] sm:block" size={22} aria-hidden="true" />
        </section>

        {availableShops.length > 1 && (
          <section className="mb-6 border border-[#e6e8e4] bg-white p-4 sm:p-5">
            <h2 className="text-sm font-semibold">Switch workspace</h2>
            <p className="mt-1 text-xs text-[#747b78]">Choose another active shop linked to your account.</p>
            <div className="mt-3 space-y-2">
              {availableShops.map((availableShop) => (
                <button
                  key={availableShop.id}
                  type="button"
                  disabled={availableShop.status !== 'ACTIVE' || switchingId !== null || String(availableShop.id) === String(shop?.id)}
                  onClick={() => handleShopSwitch(availableShop.id)}
                  className="flex min-h-12 w-full items-center justify-between gap-3 border border-[#e8eae7] px-3 text-left text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="min-w-0 truncate font-medium">{availableShop.name}</span>
                  <span className="shrink-0 text-xs text-[#747b78]">{String(availableShop.id) === String(shop?.id) ? 'Current' : availableShop.status === 'ACTIVE' ? availableShop.role : 'Inactive'}</span>
                </button>
              ))}
            </div>
            {switchError && <p role="alert" className="mt-3 text-sm text-rose-700">{switchError}</p>}
          </section>
        )}

        {logoutError && <p role="status" className="mb-4 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{logoutError}</p>}

        <div className="space-y-6">
          {visibleLinks.map((group) => group.items.length > 0 && (
            <section key={group.title}>
              <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-[0.1em] text-[#747b78]">{group.title}</h2>
              <div className="overflow-hidden border border-[#e6e8e4] bg-white">
                {group.items.map(({ label, description, to, icon: Icon }, index) => (
                  <Link
                    key={to}
                    to={to}
                    className={`flex min-h-[68px] items-center gap-3 px-4 py-3 transition hover:bg-[#fbfaff] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#6132DA]/25 ${index ? 'border-t border-[#eef0ed]' : ''}`}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f5f1ff] text-[#6132DA]"><Icon size={17} aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{label}</span>
                      <span className="mt-0.5 block text-xs text-[#747b78]">{description}</span>
                    </span>
                    <ChevronRight size={17} className="shrink-0 text-[#969b98]" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 border border-[#ecd9d9] bg-white px-4 text-sm font-semibold text-[#a53636] transition hover:bg-[#fff7f7] focus:outline-none focus:ring-2 focus:ring-[#a53636]/20"
        >
          <LogOut size={17} aria-hidden="true" /> Sign out
        </button>
      </div>
    </main>
  );
}

export default ProfilePage;
