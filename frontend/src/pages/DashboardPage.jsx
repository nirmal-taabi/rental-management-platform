import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Activity, AlertTriangle, ArrowUpRight, Boxes, CalendarDays, Clock3, CreditCard, Package, RotateCcw, Users } from 'lucide-react';
import { useAuth } from '../features/auth/context/AuthContext';
import { dashboardService } from '../features/dashboard/services/dashboard.service';

const dateInBusinessZone = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const shiftDate = (date, days) => {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

const getRange = (preset, startDate, endDate) => {
  const today = dateInBusinessZone();
  if (preset === 'custom') return { startDate, endDate };
  if (preset === 'today') return { startDate: today, endDate: today };
  if (preset === 'yesterday') return { startDate: shiftDate(today, -1), endDate: shiftDate(today, -1) };
  if (preset === 'week') return { startDate: shiftDate(today, -((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7)), endDate: today };
  if (preset === 'last30') return { startDate: shiftDate(today, -29), endDate: today };
  if (preset === 'month') return { startDate: `${today.slice(0, 8)}01`, endDate: today };
  const firstOfMonth = `${today.slice(0, 8)}01`;
  const lastMonthEnd = shiftDate(firstOfMonth, -1);
  return { startDate: `${lastMonthEnd.slice(0, 8)}01`, endDate: lastMonthEnd };
};

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${String(value).slice(0, 10)}T00:00:00Z`))
  : '—';

const formatMoney = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(Number(value || 0));

const formatChange = (comparison) => {
  if (!comparison || comparison.percentageChange === null) return 'No previous period data';
  const change = Number(comparison.percentageChange);
  return `${change > 0 ? '+' : ''}${change}% vs previous period`;
};

function Metric({ label, value, detail, icon: Icon, to }) {
  const content = (
    <>
      <span className="grid size-10 shrink-0 place-items-center bg-[#f1f2ef] text-[#6132DA]"><Icon size={17} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-[#59615e]">{label}</span>
        <span className="mt-1 block text-2xl font-semibold tabular-nums text-[#252a29]">{value ?? '—'}</span>
        {detail && <span className="mt-1 block text-xs text-[#59615e]">{detail}</span>}
      </span>
      {to && <ArrowUpRight size={15} className="shrink-0 text-[#8b928e]" />}
    </>
  );
  return to
    ? <Link to={to} className="flex min-h-28 items-start gap-3 border border-[#e6e8e4] bg-white p-4 transition hover:border-[#D8CCF5] hover:bg-[#fdfcff]">{content}</Link>
    : <div className="flex min-h-28 items-start gap-3 border border-[#e6e8e4] bg-white p-4">{content}</div>;
}

function Section({ title, description, loading, error, onRetry, children }) {
  return (
    <section className="min-w-0 border border-[#e6e8e4] bg-white">
      <header className="flex items-start justify-between gap-3 border-b border-[#e8eae7] px-4 py-3 sm:px-5">
        <div><h2 className="text-sm font-semibold text-[#252a29]">{title}</h2>{description && <p className="mt-1 text-xs text-[#59615e]">{description}</p>}</div>
        {error && <button type="button" onClick={onRetry} className="text-xs font-semibold text-[#6132DA] underline underline-offset-2">Retry</button>}
      </header>
      <div className="p-4 sm:p-5">
        {loading ? <p className="py-5 text-sm text-[#59615e]">Loading {title.toLowerCase()}…</p>
          : error ? <p role="alert" className="text-sm text-rose-800">Unable to load this section.</p>
            : children}
      </div>
    </section>
  );
}

Metric.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  detail: PropTypes.string,
  icon: PropTypes.elementType.isRequired,
  to: PropTypes.string,
};

Section.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  loading: PropTypes.bool,
  error: PropTypes.string,
  onRetry: PropTypes.func,
  children: PropTypes.node,
};

function TrendList({ rows, valueKey, label }) {
  if (!rows?.length) return <p className="text-sm text-[#59615e]">No data for this period.</p>;
  const max = Math.max(...rows.map((row) => Number(row[valueKey] || 0)), 1);
  return (
    <div role="img" aria-label={`${label} by date`}>
      <p className="sr-only">{label} for the selected date range</p>
      <div className="space-y-3" aria-hidden="true">
        {rows.slice(-8).map((row) => (
          <div key={row.period} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 text-xs">
            <span className="text-[#59615e]">{formatDate(row.period)}</span>
            <span className="h-2 bg-[#f1f2ef]"><span className="block h-2 bg-[#6132DA]" style={{ width: `${Math.max((Number(row[valueKey] || 0) / max) * 100, 2)}%` }} /></span>
            <span className="min-w-8 text-right font-semibold tabular-nums text-[#252a29]">{valueKey === 'total' ? formatMoney(row[valueKey]) : row[valueKey]}</span>
          </div>
        ))}
      </div>
      <table className="sr-only"><caption>{label} data</caption><thead><tr><th>Date</th><th>{label}</th></tr></thead><tbody>{rows.map((row) => <tr key={row.period}><td>{row.period}</td><td>{row[valueKey]}</td></tr>)}</tbody></table>
    </div>
  );
}

TrendList.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.object),
  valueKey: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
};

function DashboardPage() {
  const { user, shop, roles } = useAuth();
  const [preset, setPreset] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const canViewFinancials = roles.includes('OWNER') || roles.includes('ADMIN');
  const range = getRange(preset, customStart, customEnd);
  const rangeStartDate = range.startDate;
  const rangeEndDate = range.endDate;
  const readyForRange = Boolean(range.startDate && range.endDate);
  const quickLinks = [
    { label: 'New booking', to: '/bookings/new', icon: CalendarDays },
    { label: 'Add customer', to: '/customers/new', icon: Users },
    { label: 'Add inventory', to: '/inventory/new', icon: Boxes },
    { label: 'Add product', to: '/products/new', icon: Package },
  ];

  useEffect(() => {
    if (!readyForRange) return undefined;
    let active = true;
    const requests = {
      summary: () => dashboardService.getSummary({ startDate: rangeStartDate, endDate: rangeEndDate }),
      operations: () => dashboardService.getOperations(),
      attention: () => dashboardService.getAttention(),
      activity: () => dashboardService.getActivity(),
      bookingTrend: () => dashboardService.getBookingTrend({ startDate: rangeStartDate, endDate: rangeEndDate, groupBy: 'day' }),
      topProducts: () => dashboardService.getTopProducts({ startDate: rangeStartDate, endDate: rangeEndDate, limit: 5 }),
      ...(canViewFinancials ? { payments: () => dashboardService.getPaymentReport({ startDate: rangeStartDate, endDate: rangeEndDate, groupBy: 'day' }) } : {}),
    };
    setLoading(Object.fromEntries(Object.keys(requests).map((key) => [key, true])));
    setErrors({});
    Promise.all(Object.entries(requests).map(async ([key, request]) => {
      try {
        const response = await request();
        if (active) setData((previous) => ({ ...previous, [key]: response.data.data }));
      } catch (error) {
        if (active) setErrors((previous) => ({ ...previous, [key]: error.response?.data?.message || 'Request failed' }));
      } finally {
        if (active) setLoading((previous) => ({ ...previous, [key]: false }));
      }
    }));
    return () => { active = false; };
  }, [rangeStartDate, rangeEndDate, readyForRange, canViewFinancials, refreshKey]);

  const retry = () => setRefreshKey((value) => value + 1);
  const summary = data.summary || {};
  const operations = data.operations || {};
  const attention = data.attention || {};
  const today = dateInBusinessZone();

  return (
    <main className="min-h-full bg-[#f8f9f6] px-4 py-7 text-[#252a29] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px] space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#e8eae7] pb-5">
        <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8060D9]">{shop?.name || 'Rental workspace'}</p><h1 className="mt-1 text-3xl font-semibold">Operations dashboard</h1><p className="mt-1 text-sm text-[#59615e]">Today is {formatDate(today)}. Signed in as {user?.name || 'Team member'}.</p></div>
        <Link to="/reports" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[#dfe3df] bg-white px-4 text-sm font-semibold text-[#414846] transition hover:border-[#6132DA] hover:text-[#6132DA]"><Activity size={16} /> Reports</Link>
      </header>

      <div className="flex flex-col gap-4 border border-[#e6e8e4] bg-white p-4 sm:p-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div>
          <label htmlFor="dashboard-range" className="mb-1.5 block text-xs font-semibold text-[#414846]">Reporting period</label>
          <select id="dashboard-range" value={preset} onChange={(event) => setPreset(event.target.value)} className="min-h-10 min-w-48 rounded-md border border-[#dfe3df] bg-white px-3 text-sm text-[#252a29] outline-none transition focus:border-[#7046E8] focus:ring-2 focus:ring-[#7046E8]/10">
            <option value="today">Today</option><option value="yesterday">Yesterday</option><option value="week">This week</option><option value="month">This month</option><option value="lastMonth">Last month</option><option value="last30">Last 30 days</option><option value="custom">Custom range</option>
          </select>
          </div>
          {preset === 'custom' && <div className="grid gap-3 sm:grid-cols-2"><div><label htmlFor="dashboard-start" className="mb-1.5 block text-xs font-semibold text-[#414846]">Start date</label><input id="dashboard-start" type="date" value={customStart} max={customEnd || undefined} onChange={(event) => setCustomStart(event.target.value)} className="min-h-10 w-full rounded-md border border-[#dfe3df] bg-white px-3 text-sm outline-none transition focus:border-[#7046E8] focus:ring-2 focus:ring-[#7046E8]/10" /></div><div><label htmlFor="dashboard-end" className="mb-1.5 block text-xs font-semibold text-[#414846]">End date</label><input id="dashboard-end" type="date" value={customEnd} min={customStart || undefined} onChange={(event) => setCustomEnd(event.target.value)} className="min-h-10 w-full rounded-md border border-[#dfe3df] bg-white px-3 text-sm outline-none transition focus:border-[#7046E8] focus:ring-2 focus:ring-[#7046E8]/10" /></div></div>}
        </div>
        <nav aria-label="Quick actions" className="flex flex-wrap gap-2">{quickLinks.map(({ label, to, icon: Icon }, index) => <Link key={to} to={to} className={`inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#6132DA]/20 ${index === 0 ? 'bg-[#6132DA] text-white hover:bg-[#4D25B5]' : 'border border-[#dfe3df] bg-white text-[#414846] hover:border-[#6132DA] hover:text-[#6132DA]'}`}><Icon size={14} />{label}</Link>)}</nav>
      </div>
      {preset === 'custom' && !readyForRange && <p role="status" className="text-sm text-[#59615e]">Choose both dates to load the dashboard.</p>}

      <section aria-label="Key metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Metric label="Bookings" value={summary.bookings?.total} detail={formatChange(summary.comparison?.bookings)} icon={CalendarDays} to="/bookings" />
        <Metric label="Active rentals" value={operations.counts?.active_rentals} icon={Activity} to="/bookings?status=ACTIVE" />
        <Metric label="Available inventory" value={summary.inventory?.available} detail={`${summary.inventory?.usable ?? '—'} usable items`} icon={Boxes} to="/inventory" />
        <Metric label="New customers" value={summary.customers?.new} detail={formatChange(summary.comparison?.newCustomers)} icon={Users} to="/customers" />
        {canViewFinancials && <Metric label="Payments collected" value={formatMoney(summary.payments?.collected)} detail={formatChange(summary.comparison?.paymentsCollected)} icon={CreditCard} to="/payments" />}
        {canViewFinancials && <Metric label="Outstanding balance" value={formatMoney(summary.payments?.outstanding)} detail={formatChange(summary.comparison?.outstanding)} icon={CreditCard} to="/payments" />}
      </section>

      <Section title="Today’s operations" description="Pickup and return workload, with the next seven days in view." loading={loading.operations} error={errors.operations} onRetry={retry}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Pickups today" value={operations.counts?.pickups_today} icon={CalendarDays} to="/bookings?status=TODAY" />
          <Metric label="Returns due today" value={operations.counts?.returns_today} icon={RotateCcw} to="/bookings?status=ACTIVE" />
          <Metric label="Active rentals" value={operations.counts?.active_rentals} icon={Activity} to="/bookings?status=ACTIVE" />
          <Metric label="Overdue returns" value={operations.counts?.overdue_returns} icon={Clock3} to="/bookings?status=ACTIVE" />
        </div>
        <div className="mt-4 flex justify-end">
          <Link to="/bookings" className="text-xs font-semibold text-[#6132DA] underline underline-offset-2">All bookings</Link>
        </div>
      </Section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Section title="Upcoming pickups" description="Next seven days" loading={loading.operations} error={errors.operations} onRetry={retry}>
          {operations.upcomingPickups?.length ? <ul className="divide-y divide-[#eef0ed]">{operations.upcomingPickups.map((booking) => <li key={booking.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><Link to={`/bookings/${booking.id}`} className="font-mono text-sm font-semibold text-[#6132DA]">{booking.booking_number}</Link><p className="mt-1 truncate text-sm font-medium">{booking.first_name} {booking.last_name || ''}</p></div><div className="shrink-0 text-right"><p className="text-sm">{formatDate(booking.rental_start_date)}</p><p className="mt-1 text-xs text-[#59615e]">{booking.item_count} items · {booking.status}</p></div></li>)}</ul> : <p className="text-sm text-[#59615e]">No upcoming pickups.</p>}
        </Section>
        <Section title="Upcoming returns" description="Next seven days" loading={loading.operations} error={errors.operations} onRetry={retry}>
          {operations.upcomingReturns?.length ? <ul className="divide-y divide-[#eef0ed]">{operations.upcomingReturns.map((booking) => <li key={booking.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><Link to={`/bookings/${booking.id}`} className="font-mono text-sm font-semibold text-[#6132DA]">{booking.booking_number}</Link><p className="mt-1 truncate text-sm font-medium">{booking.first_name} {booking.last_name || ''}</p></div><div className="shrink-0 text-right"><p className="text-sm">{formatDate(booking.expected_return_date)}</p><p className="mt-1 text-xs text-[#59615e]">{booking.item_count} items · {booking.status}</p></div></li>)}</ul> : <p className="text-sm text-[#59615e]">No upcoming returns.</p>}
        </Section>
      </section>

      <Section title="Attention required" description="Current operational conditions" loading={loading.attention} error={errors.attention} onRetry={retry}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Link to="/bookings?status=ACTIVE" className="flex items-center gap-3 border border-[#e6e8e4] p-3"><AlertTriangle size={17} className="text-[#8060D9]" /><span><span className="block text-lg font-semibold tabular-nums">{operations.counts?.overdue_returns ?? '—'}</span><span className="text-xs text-[#59615e]">Overdue returns</span></span></Link>
          <Link to="/inventory" className="flex items-center gap-3 border border-[#e6e8e4] p-3"><Boxes size={17} className="text-[#8060D9]" /><span><span className="block text-lg font-semibold tabular-nums">{attention.damagedOrLostInventory ?? '—'}</span><span className="text-xs text-[#59615e]">Damaged or lost items</span></span></Link>
          <Link to="/inventory" className="flex items-center gap-3 border border-[#e6e8e4] p-3"><RotateCcw size={17} className="text-[#8060D9]" /><span><span className="block text-lg font-semibold tabular-nums">{attention.inventoryInMaintenance ?? '—'}</span><span className="text-xs text-[#59615e]">Items in service</span></span></Link>
          {canViewFinancials && <Link to="/payments" className="flex items-center gap-3 border border-[#e6e8e4] p-3"><CreditCard size={17} className="text-[#8060D9]" /><span><span className="block text-lg font-semibold tabular-nums">{attention.bookingsWithBalance ?? '—'}</span><span className="text-xs text-[#59615e]">Bookings with a balance</span></span></Link>}
        </div>
      </Section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Section title="Booking trend" description="Bookings created during the selected period" loading={loading.bookingTrend} error={errors.bookingTrend} onRetry={retry}><TrendList rows={data.bookingTrend} valueKey="bookings" label="Bookings" /></Section>
        {canViewFinancials && <Section title="Payments collected" description="Net successful collections; deposits remain payment collections, not revenue" loading={loading.payments} error={errors.payments} onRetry={retry}><TrendList rows={data.payments?.trend} valueKey="total" label="Payments collected" /></Section>}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Section title="Inventory status" description="Physical units, not catalog products" loading={loading.summary} error={errors.summary} onRetry={retry}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">{[['Available', 'available'], ['Reserved', 'reserved'], ['Rented', 'rented'], ['Cleaning', 'cleaning'], ['Repair', 'repair'], ['Damaged', 'damaged'], ['Lost', 'lost'], ['Retired', 'retired']].map(([label, key]) => <div key={key} className="flex items-center justify-between gap-2 border-b border-[#eef0ed] py-2 text-sm"><span className="text-[#59615e]">{label}</span><span className="font-semibold tabular-nums">{summary.inventory?.[key] ?? 0}</span></div>)}</div>
          <p className="mt-4 text-xs text-[#59615e]">Utilization of usable units: <strong className="text-[#252a29]">{summary.inventory?.utilization ?? 0}%</strong></p>
        </Section>
        <Section title="Most rented products" description="Booking-item quantities for the selected period" loading={loading.topProducts} error={errors.topProducts} onRetry={retry}>
          {data.topProducts?.length ? <ol className="divide-y divide-[#eef0ed]">{data.topProducts.map((product, index) => <li key={product.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><span className="grid size-7 shrink-0 place-items-center bg-[#f8f9f6] text-xs font-semibold text-[#6132DA]">{index + 1}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{product.name}</span><span className="mt-1 block text-xs text-[#59615e]">{product.sku} · {product.booking_count} bookings</span></span><span className="shrink-0 text-sm font-semibold tabular-nums">{product.quantity_rented}</span></li>)}</ol> : <p className="text-sm text-[#59615e]">No bookings for these dates.</p>}
        </Section>
      </section>

      <Section title="Recent activity" description="Latest audit events for this shop" loading={loading.activity} error={errors.activity} onRetry={retry}>
        {data.activity?.length ? <ol className="grid gap-3 sm:grid-cols-2">{data.activity.map((event, index) => <li key={`${event.entity_type}-${event.entity_id}-${event.created_at}-${index}`} className="flex items-start gap-3 border-b border-[#eef0ed] pb-3"><Activity size={15} className="mt-0.5 shrink-0 text-[#8060D9]" /><span className="min-w-0"><span className="block text-sm font-medium">{String(event.action).replaceAll('_', ' ')}</span><span className="mt-1 block text-xs text-[#59615e]">{event.entity_type} #{event.entity_id} · {new Date(event.created_at).toLocaleString('en-IN')}</span></span></li>)}</ol> : <p className="text-sm text-[#59615e]">No recorded activity yet.</p>}
      </Section>
      </div>
    </main>
  );
}

export default DashboardPage;
