import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  Boxes,
  Building2,
  CalendarDays,
  CircleCheck,
  Mail,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  Store,
  Users,
} from 'lucide-react';
import { useAuth } from '../features/auth/context/AuthContext';

function DashboardPage() {
  const { user, shop, roles } = useAuth();
  const userName = user?.name || 'Owner';
  const roleLabel = roles.join(', ') || 'OWNER';

  const quickLinks = [
    { label: 'Create a booking', description: 'Start a new rental', to: '/bookings/new', icon: CalendarDays },
    { label: 'View inventory', description: 'Check item availability', to: '/inventory', icon: Boxes },
    { label: 'Add a customer', description: 'Build your customer list', to: '/customers/new', icon: Users },
    { label: 'Manage products', description: 'Update your catalog', to: '/products', icon: Package },
  ];

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-7 text-[#252a29] sm:px-6 sm:py-9 lg:px-10">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8a5360]">Workspace overview</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal text-[#252a29]">Dashboard</h1>
              <p className="mt-2 text-sm text-[#747b78]">A clear view of your rental shop and account.</p>
            </div>
            <div className="inline-flex items-center gap-2 border border-[#e6e8e4] bg-white px-3 py-2 text-xs font-medium text-[#59615e]">
              <Activity size={15} className="text-[#8a5360]" />
              Workspace active
            </div>
          </div>

          <section aria-label="Account summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="flex min-w-0 items-start gap-4 border border-[#e6e8e4] bg-white p-5">
              <span className="grid size-10 shrink-0 place-items-center bg-[#f8f9f6] text-[#68404b]"><Building2 size={18} /></span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8b928e]">Shop</p>
                <p className="mt-1 truncate text-lg font-semibold text-[#252a29]">{shop?.name || 'Your shop'}</p>
                <p className="mt-1 text-xs text-[#747b78]">Rental workspace</p>
              </div>
            </div>
            <div className="flex min-w-0 items-start gap-4 border border-[#e6e8e4] bg-white p-5">
              <span className="grid size-10 shrink-0 place-items-center bg-[#f8f9f6] text-[#68404b]"><CircleCheck size={18} /></span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8b928e]">Status</p>
                <p className="mt-1 text-lg font-semibold text-[#252a29]">Active</p>
                <p className="mt-1 text-xs text-[#747b78]">Account is ready to use</p>
              </div>
            </div>
            <div className="flex min-w-0 items-start gap-4 border border-[#e6e8e4] bg-white p-5 sm:col-span-2 xl:col-span-1">
              <span className="grid size-10 shrink-0 place-items-center bg-[#f8f9f6] text-[#68404b]"><ShieldCheck size={18} /></span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8b928e]">Access</p>
                <p className="mt-1 truncate text-lg font-semibold text-[#252a29]">{roleLabel}</p>
                <p className="mt-1 text-xs text-[#747b78]">Signed in as {userName}</p>
              </div>
            </div>
          </section>

          <div className="mt-7 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="border border-[#e6e8e4] bg-white">
              <div className="flex items-center justify-between gap-4 border-b border-[#e6e8e4] px-5 py-4 sm:px-6">
                <div>
                  <h2 className="text-base font-semibold text-[#252a29]">Shop details</h2>
                  <p className="mt-1 text-xs text-[#8b928e]">Business information on your account</p>
                </div>
                <Building2 size={18} className="text-[#8a5360]" />
              </div>
              <dl className="grid gap-x-8 px-5 sm:grid-cols-2 sm:px-6">
                <div className="border-b border-[#eef0ed] py-4">
                  <dt className="flex items-center gap-2 text-xs font-medium text-[#8b928e]"><Mail size={14} /> Business email</dt>
                  <dd className="mt-2 break-words text-sm font-medium text-[#414846]">{shop?.email || 'Not provided'}</dd>
                </div>
                <div className="border-b border-[#eef0ed] py-4">
                  <dt className="flex items-center gap-2 text-xs font-medium text-[#8b928e]"><Phone size={14} /> Business phone</dt>
                  <dd className="mt-2 text-sm font-medium text-[#414846]">{shop?.phone || 'Not provided'}</dd>
                </div>
                <div className="border-b border-[#eef0ed] py-4">
                  <dt className="flex items-center gap-2 text-xs font-medium text-[#8b928e]"><MapPin size={14} /> Location</dt>
                  <dd className="mt-2 text-sm font-medium text-[#414846]">{[shop?.city, shop?.state].filter(Boolean).join(', ') || 'Not provided'}</dd>
                </div>
                <div className="border-b border-[#eef0ed] py-4">
                  <dt className="flex items-center gap-2 text-xs font-medium text-[#8b928e]"><Store size={14} /> GST number</dt>
                  <dd className="mt-2 text-sm font-medium text-[#414846]">{shop?.gstNumber || 'Not provided'}</dd>
                </div>
              </dl>
              <div className="px-5 py-4 sm:px-6">
                <p className="text-xs text-[#8b928e]">Account owner</p>
                <p className="mt-1 text-sm font-medium text-[#414846]">{userName}</p>
              </div>
            </section>

            <section className="border border-[#e6e8e4] bg-white">
              <div className="flex items-center justify-between gap-4 border-b border-[#e6e8e4] px-5 py-4 sm:px-6">
                <div>
                  <h2 className="text-base font-semibold text-[#252a29]">Quick actions</h2>
                  <p className="mt-1 text-xs text-[#8b928e]">Go straight to a common task</p>
                </div>
                <ArrowUpRight size={18} className="text-[#8a5360]" />
              </div>
              <div className="divide-y divide-[#eef0ed] px-5 sm:px-6">
                {quickLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.label} to={item.to} className="group flex min-h-[68px] items-center gap-3 py-3">
                      <span className="grid size-9 shrink-0 place-items-center bg-[#f8f9f6] text-[#68404b] transition group-hover:bg-[#f8f9f6]"><Icon size={17} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-[#414846] group-hover:text-[#68404b]">{item.label}</span>
                        <span className="mt-0.5 block text-xs text-[#8b928e]">{item.description}</span>
                      </span>
                      <ArrowUpRight size={15} className="shrink-0 text-[#a1a6a2] transition group-hover:text-[#68404b]" />
                    </Link>
                  );
                })}
              </div>
            </section>
          </div>
    </div>
  );
}

export default DashboardPage;
