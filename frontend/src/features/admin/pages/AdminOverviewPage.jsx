import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, CalendarDays, Store, Users } from 'lucide-react';
import { adminService } from '../services/admin.service';

const metrics = [
  { key: 'total_shops', label: 'Total shops', icon: Store, to: '/admin/shops' },
  { key: 'active_shops', label: 'Active shops', icon: Store, to: '/admin/shops?status=active' },
  { key: 'total_users', label: 'Account users', icon: Users, to: '/admin/users' },
  { key: 'total_customers', label: 'End customers', icon: Users, to: '/admin/customers' },
  { key: 'total_bookings', label: 'Bookings', icon: CalendarDays, to: '/admin/bookings' },
  { key: 'pending_shops', label: 'Pending shops', icon: Activity, to: '/admin/shops?status=pending' },
  { key: 'new_shops', label: 'New shops in period', icon: Store, to: '/admin/shops' },
  { key: 'new_users', label: 'New accounts in period', icon: Users, to: '/admin/users' },
];

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
  : '—';

function AdminOverviewPage() {
  const [days, setDays] = useState(30);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    adminService.getOverview({ days })
      .then((response) => {
        if (active) {
          setResult(response.data.data);
          setError('');
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load the platform overview.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [days]);

  const summary = result?.summary || {};
  const trend = result?.trend || [];
  const activityPeak = Math.max(1, ...trend.flatMap((point) => [
    Number(point.shops || 0),
    Number(point.users || 0),
    Number(point.bookings || 0),
  ]));
  const statusLabel = (status) => String(status || '').toLowerCase().replace(/^\w/, (letter) => letter.toUpperCase());

  if (loading && !result) return <p className="py-10 text-sm text-[#59615e]">Loading platform overview…</p>;
  if (error && !result) {
    return <div role="alert" className="border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {error && <div role="alert" className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[#26252c]">Platform at a glance</h2>
          <p className="mt-1 text-sm text-[#74747e]">Live totals across TrackinHub shops and their activity.</p>
        </div>
        <label className="text-xs font-medium text-[#53535d]">
          Registration period
          <select value={days} onChange={(event) => setDays(Number(event.target.value))} className="ml-2 min-h-10 border border-[#dedee6] bg-white px-3 text-sm text-[#252a29] focus:border-[#6132DA] focus:outline-none focus:ring-2 focus:ring-[#6132DA]/15">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </label>
      </section>

      <section aria-label="Platform metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map(({ key, label, icon: Icon, to }) => (
          <Link key={key} to={to} className="flex min-h-28 items-center gap-4 border border-[#e7e6ec] bg-white p-4 transition hover:border-[#c9b9f2] hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6132DA]">
            <span className="grid size-10 shrink-0 place-items-center bg-[#f3efff] text-[#6132DA]"><Icon size={18} /></span>
            <span>
              <span className="block text-xs font-medium text-[#74747e]">{label}</span>
              <span className="mt-1 block text-2xl font-semibold tabular-nums text-[#26252c]">{summary[key] ?? '—'}</span>
            </span>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <div className="border border-[#e7e6ec] bg-white">
          <header className="border-b border-[#eeedf1] px-5 py-4">
            <h3 className="text-sm font-semibold text-[#26252c]">Platform registrations and activity</h3>
            <p className="mt-1 text-xs text-[#74747e]">Daily shop registrations, account registrations, and bookings.</p>
          </header>
          {trend.length ? (
            <div className="overflow-x-auto p-5">
              <div className="mb-3 flex flex-wrap gap-4 text-[11px] text-[#74747e]" aria-label="Chart legend">
                <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#6132DA]" />Shops</span>
                <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#14a779]" />Accounts</span>
                <span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#e2a13a]" />Bookings</span>
              </div>
              <div className="flex h-40 min-w-[560px] items-end gap-1.5 border-b border-l border-[#e7e6ec] px-2">
                {trend.map((point) => {
                  return (
                    <div key={point.date} className="group relative flex h-full min-w-1 flex-1 items-end justify-center gap-px" title={`${point.date}: ${point.shops} shops, ${point.users} accounts, ${point.bookings} bookings`} aria-label={`${point.date}: ${point.shops} shops, ${point.users} accounts, ${point.bookings} bookings`}>
                      <span className="w-full max-w-2 rounded-t-sm bg-[#6132DA]" style={{ height: `${Math.max((Number(point.shops || 0) / activityPeak) * 100, 3)}%` }} />
                      <span className="w-full max-w-2 rounded-t-sm bg-[#14a779]" style={{ height: `${Math.max((Number(point.users || 0) / activityPeak) * 100, 3)}%` }} />
                      <span className="w-full max-w-2 rounded-t-sm bg-[#e2a13a]" style={{ height: `${Math.max((Number(point.bookings || 0) / activityPeak) * 100, 3)}%` }} />
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-[#898e94]"><span>{trend[0]?.date}</span><span>{trend[trend.length - 1]?.date}</span></div>
            </div>
          ) : <p className="p-5 text-sm text-[#74747e]">No booking activity in this period.</p>}
        </div>

        <div className="border border-[#e7e6ec] bg-white">
          <header className="border-b border-[#eeedf1] px-5 py-4">
            <h3 className="text-sm font-semibold text-[#26252c]">Recent shop registrations</h3>
            <p className="mt-1 text-xs text-[#74747e]">Newest registered shops.</p>
          </header>
          {result?.recentShops?.length ? (
            <ul className="divide-y divide-[#eeedf1]">
              {result.recentShops.map((shop) => (
                <li key={shop.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-[#26252c]">{shop.name}</span>
                    <span className="mt-0.5 block truncate text-xs text-[#74747e]">{shop.ownerName || shop.email || 'Owner not available'} · {formatDate(shop.createdAt)}</span>
                  </span>
                  <span className={`shrink-0 border px-2 py-1 text-[10px] font-semibold ${shop.status === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-[#e7e6ec] bg-[#f8f8fa] text-[#62626c]'}`}>{statusLabel(shop.status)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="p-5 text-sm text-[#74747e]">No registered shops yet.</p>}
          <Link to="/admin/shops" className="block border-t border-[#eeedf1] px-5 py-3 text-xs font-semibold text-[#6132DA] hover:bg-[#faf9fd]">View all shops</Link>
        </div>
      </section>

      <section className="border border-[#e7e6ec] bg-white">
        <header className="border-b border-[#eeedf1] px-5 py-4">
          <h3 className="text-sm font-semibold text-[#26252c]">Recent bookings</h3>
          <p className="mt-1 text-xs text-[#74747e]">Read-only platform activity from existing booking records.</p>
        </header>
        {result?.recentBookings?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead><tr className="border-b border-[#eeedf1] text-xs text-[#74747e]"><th className="px-5 py-3 font-medium">Booking</th><th className="px-5 py-3 font-medium">Shop</th><th className="px-5 py-3 font-medium">Customer</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Created</th></tr></thead>
              <tbody>{result.recentBookings.map((booking) => <tr key={booking.id} className="border-b border-[#f0eff3] last:border-0"><td className="px-5 py-3 font-medium text-[#26252c]">{booking.bookingNumber}</td><td className="px-5 py-3 text-[#53535d]">{booking.shopName}</td><td className="px-5 py-3 text-[#53535d]">{booking.customerName}</td><td className="px-5 py-3 text-[#53535d]">{statusLabel(booking.status)}</td><td className="px-5 py-3 text-[#74747e]">{formatDate(booking.bookingDate)}</td></tr>)}</tbody>
            </table>
          </div>
        ) : <p className="p-5 text-sm text-[#74747e]">No booking activity yet.</p>}
      </section>
    </div>
  );
}

export default AdminOverviewPage;
