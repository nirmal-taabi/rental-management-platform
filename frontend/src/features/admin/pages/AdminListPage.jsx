import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { ChevronLeft, ChevronRight, Eye, RefreshCw, Search } from 'lucide-react';
import { adminService } from '../services/admin.service';
import Modal from '../../../components/common/Modal';

const configuration = {
  shops: {
    title: 'Rental shops',
    description: 'Platform shop records, owners, and lifecycle statuses.',
    statuses: ['active', 'pending', 'inactive', 'suspended'],
    sortOptions: [['createdAt', 'Date registered'], ['name', 'Shop name'], ['status', 'Status']],
    columns: [
      ['Shop', (row) => <Link className="font-semibold text-[#26252c] hover:text-[#6132DA]" to={`/admin/shops/${row.id}`}>{row.name}</Link>],
      ['Shop ID', (row) => row.id],
      ['Owner', (row) => <>{row.ownerName || '—'}<span className="mt-1 block text-xs text-[#83838c]">{row.ownerEmail || ''}</span></>],
      ['Contact', (row) => row.phone || row.email || '—'],
      ['Location', (row) => [row.city, row.state].filter(Boolean).join(', ') || '—'],
      ['Users', (row) => row.userCount ?? 0],
      ['Bookings', (row) => row.bookingCount ?? 0],
      ['Status', (row) => <StatusBadge status={row.status} />],
      ['Registered', (row) => formatDate(row.createdAt)],
      ['Details', (row, actions) => <div className="flex items-center gap-1"><Link aria-label={`View ${row.name}`} to={`/admin/shops/${row.id}`} className="inline-flex min-h-9 items-center gap-1 px-2 text-xs font-semibold text-[#6132DA] hover:bg-[#f3efff]"><Eye size={14} /> View</Link><button type="button" onClick={() => actions.onManageStatus(row)} className="min-h-9 px-2 text-xs font-semibold text-[#53535d] hover:bg-[#f8f8fa]">Status</button></div>],
    ],
  },
  users: {
    title: 'Account users',
    description: 'Owners and staff accounts. These are separate from rental end customers.',
    statuses: ['active', 'inactive', 'pending', 'locked'],
    sortOptions: [['createdAt', 'Date registered'], ['name', 'Name'], ['status', 'Status']],
    roles: ['OWNER', 'ADMIN', 'MANAGER', 'STAFF', 'SUPER_ADMIN'],
    columns: [
      ['Account', (row) => <>{row.name}<span className="mt-1 block text-xs text-[#83838c]">ID {row.id}</span></>],
      ['Email', (row) => row.email],
      ['Phone', (row) => row.phone || '—'],
      ['Shop role(s)', (row) => row.roles || '—'],
      ['Platform role', (row) => row.platformRoles || '—'],
      ['Shop(s)', (row) => row.shops || '—'],
      ['Status', (row) => row.status],
      ['Registered', (row) => formatDate(row.createdAt)],
    ],
  },
  customers: {
    title: 'End customers',
    description: 'Rental customers, shown separately from TrackinHub owner and staff accounts.',
    statuses: ['active', 'inactive', 'blacklisted'],
    sortOptions: [['createdAt', 'Date registered'], ['name', 'Name'], ['status', 'Status']],
    columns: [
      ['Customer', (row) => <>{row.name}<span className="mt-1 block text-xs text-[#83838c]">ID {row.id}</span></>],
      ['Shop', (row) => <Link className="text-[#6132DA] hover:underline" to={`/admin/shops/${row.shopId}`}>{row.shopName}</Link>],
      ['Email', (row) => row.email || '—'],
      ['Phone', (row) => row.phone || '—'],
      ['Location', (row) => [row.city, row.state].filter(Boolean).join(', ') || '—'],
      ['Status', (row) => row.status],
      ['Registered', (row) => formatDate(row.createdAt)],
    ],
  },
  bookings: {
    title: 'Platform bookings',
    description: 'Read-only booking monitoring across shops. Booking changes remain in the shop workspace.',
    statuses: ['draft', 'pending', 'confirmed', 'ready', 'active', 'completed', 'cancelled'],
    sortOptions: [['bookingDate', 'Date booked'], ['rentalStartDate', 'Rental start'], ['totalAmount', 'Amount']],
    dateFilters: true,
    columns: [
      ['Booking', (row) => <>{row.bookingNumber}<span className="mt-1 block text-xs text-[#83838c]">ID {row.id}</span></>],
      ['Shop', (row) => <Link className="text-[#6132DA] hover:underline" to={`/admin/shops/${row.shopId}`}>{row.shopName}</Link>],
      ['Customer', (row) => row.customerName],
      ['Items', (row) => row.itemSummary || '—'],
      ['Rental dates', (row) => `${formatDate(row.rentalStartDate)} – ${formatDate(row.rentalEndDate)}`],
      ['Amount', (row) => formatMoney(row.totalAmount)],
      ['Status', (row) => row.status],
      ['Booked', (row) => formatDate(row.bookingDate)],
    ],
  },
};

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
  : '—';

const formatMoney = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(Number(value || 0));

function StatusBadge({ status }) {
  const normalized = String(status || '').toLowerCase();
  const color = normalized === 'active'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : normalized === 'pending'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : normalized === 'suspended'
        ? 'border-rose-200 bg-rose-50 text-rose-800'
        : 'border-[#e7e6ec] bg-[#f8f8fa] text-[#62626c]';
  return <span className={`inline-flex border px-2 py-1 text-[10px] font-semibold ${color}`}>{normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'Unknown'}</span>;
}

StatusBadge.propTypes = {
  status: PropTypes.string,
};

const serviceMethods = {
  shops: 'getShops',
  users: 'getUsers',
  customers: 'getCustomers',
  bookings: 'getBookings',
};

function AdminListPage({ resource }) {
  const config = configuration[resource];
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [role, setRole] = useState('');
  const [sortBy, setSortBy] = useState(config.sortOptions[0][0]);
  const [sortOrder, setSortOrder] = useState('desc');
  const [shopId, setShopId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ totalItems: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [shopForStatus, setShopForStatus] = useState(null);
  const [nextShopStatus, setNextShopStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [statusUpdateError, setStatusUpdateError] = useState('');
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const requestSequence = useRef(0);
  const sortByOptions = config.sortOptions.map(([value]) => value);
  const effectiveSortBy = sortByOptions.includes(sortBy) ? sortBy : sortByOptions[0];

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadData = useCallback(async () => {
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    try {
      const filters = {
        page,
        limit: 25,
        search: debouncedSearch || undefined,
        status: status || undefined,
        sortBy: effectiveSortBy,
        sortOrder,
        role: resource === 'users' ? role || undefined : undefined,
        shopId: resource === 'customers' || resource === 'bookings' ? shopId || undefined : undefined,
        startDate: config.dateFilters ? startDate || undefined : undefined,
        endDate: config.dateFilters ? endDate || undefined : undefined,
      };
      const response = await adminService[serviceMethods[resource]](filters);
      if (requestId !== requestSequence.current) return;
      const result = response?.data?.data || {};
      setData(result.data || []);
      setPagination(result.pagination || { totalItems: 0, totalPages: 1 });
      setError('');
    } catch (requestError) {
      if (requestId === requestSequence.current) {
        setError(requestError.response?.data?.message || `Unable to load ${config.title.toLowerCase()}.`);
      }
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [config.dateFilters, config.title, debouncedSearch, effectiveSortBy, endDate, page, resource, role, shopId, sortOrder, startDate, status]);

  useEffect(() => {
    loadData();
    return () => { requestSequence.current += 1; };
  }, [loadData, refreshKey]);

  const changeFilter = (update) => {
    setPage(1);
    update();
  };

  const openShopStatus = (shop) => {
    setNextShopStatus('');
    setStatusReason('');
    setStatusUpdateError('');
    setShopForStatus(shop);
  };

  const totalPages = Math.max(1, pagination.totalPages || 1);

  return (
    <>
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[#26252c]">{config.title}</h2>
          <p className="mt-1 text-sm text-[#74747e]">{config.description}</p>
        </div>
        <button type="button" onClick={() => setRefreshKey((key) => key + 1)} className="inline-flex min-h-10 items-center gap-2 border border-[#dedee6] bg-white px-3 text-xs font-semibold text-[#53535d] hover:bg-[#f8f8fa]">
          <RefreshCw size={14} /> Refresh
        </button>
      </header>

      <div className="flex flex-wrap items-end gap-3 border border-[#e7e6ec] bg-white p-4">
        <label className="relative min-w-[220px] flex-1">
          <span className="mb-1 block text-[11px] font-semibold text-[#62626c]">Search</span>
          <Search size={15} className="absolute left-3 top-[2.25rem] text-[#8c8c95]" aria-hidden="true" />
          <input value={search} onChange={(event) => changeFilter(() => setSearch(event.target.value))} placeholder="Name, email, ID..." className="min-h-10 w-full border border-[#dedee6] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#6132DA] focus:ring-2 focus:ring-[#6132DA]/10" />
        </label>
        <label>
          <span className="mb-1 block text-[11px] font-semibold text-[#62626c]">Status</span>
          <select value={status} onChange={(event) => changeFilter(() => setStatus(event.target.value))} className="min-h-10 min-w-36 border border-[#dedee6] bg-white px-3 text-sm outline-none focus:border-[#6132DA]">
            <option value="">All statuses</option>
            {config.statuses.map((item) => <option key={item} value={item}>{item.charAt(0).toUpperCase() + item.slice(1)}</option>)}
          </select>
        </label>
        {config.roles && <label>
          <span className="mb-1 block text-[11px] font-semibold text-[#62626c]">Account or shop role</span>
          <select value={role} onChange={(event) => changeFilter(() => setRole(event.target.value))} className="min-h-10 min-w-36 border border-[#dedee6] bg-white px-3 text-sm outline-none focus:border-[#6132DA]">
            <option value="">All roles</option>
            {config.roles.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>}
        <label>
          <span className="mb-1 block text-[11px] font-semibold text-[#62626c]">Sort by</span>
          <select value={effectiveSortBy} onChange={(event) => changeFilter(() => setSortBy(event.target.value))} className="min-h-10 min-w-36 border border-[#dedee6] bg-white px-3 text-sm outline-none focus:border-[#6132DA]">
            {config.sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => changeFilter(() => setSortOrder((value) => value === 'asc' ? 'desc' : 'asc'))} aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`} className="min-h-10 border border-[#dedee6] bg-white px-3 text-xs font-semibold text-[#53535d] hover:bg-[#f8f8fa]">
          {sortOrder === 'asc' ? 'Ascending ↑' : 'Descending ↓'}
        </button>
        {(resource === 'customers' || resource === 'bookings') && <label>
          <span className="mb-1 block text-[11px] font-semibold text-[#62626c]">Shop ID</span>
          <input inputMode="numeric" value={shopId} onChange={(event) => changeFilter(() => setShopId(event.target.value.replace(/\D/g, '')))} placeholder="Any shop" className="min-h-10 w-32 border border-[#dedee6] bg-white px-3 text-sm outline-none focus:border-[#6132DA]" />
        </label>}
        {config.dateFilters && <>
          <label><span className="mb-1 block text-[11px] font-semibold text-[#62626c]">Booked from</span><input type="date" value={startDate} onChange={(event) => changeFilter(() => setStartDate(event.target.value))} className="min-h-10 border border-[#dedee6] bg-white px-2 text-sm outline-none focus:border-[#6132DA]" /></label>
          <label><span className="mb-1 block text-[11px] font-semibold text-[#62626c]">Booked to</span><input type="date" value={endDate} onChange={(event) => changeFilter(() => setEndDate(event.target.value))} className="min-h-10 border border-[#dedee6] bg-white px-2 text-sm outline-none focus:border-[#6132DA]" /></label>
        </>}
      </div>

      {error && <div role="alert" className="flex items-center justify-between border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><span>{error}</span><button type="button" onClick={() => setRefreshKey((key) => key + 1)} className="font-semibold underline">Retry</button></div>}
      <div className="border border-[#e7e6ec] bg-white">
        <div className="flex items-center justify-between border-b border-[#eeedf1] px-4 py-3 text-xs text-[#74747e]">
          <span>{loading ? 'Loading…' : `${pagination.totalItems || 0} records`}</span>
          <span>Page {page} of {totalPages}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead><tr className="border-b border-[#eeedf1] bg-[#fbfbfc] text-[11px] font-semibold uppercase tracking-wide text-[#74747e]">{config.columns.map(([label]) => <th key={label} scope="col" className="whitespace-nowrap px-4 py-3">{label}</th>)}</tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={config.columns.length} className="px-4 py-12 text-center text-sm text-[#74747e]">Loading records…</td></tr>
                : data.length ? data.map((row) => <tr key={row.id} className="border-b border-[#f0eff3] align-top last:border-0 hover:bg-[#fcfbfe]">{config.columns.map(([label, render]) => <td key={label} className="max-w-[260px] px-4 py-3 text-[#53535d]">{render(row, { onManageStatus: openShopStatus })}</td>)}</tr>)
                  : <tr><td colSpan={config.columns.length} className="px-4 py-12 text-center text-sm text-[#74747e]">{error ? 'Unable to display records.' : 'No matching records found.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <footer className="flex items-center justify-between border-t border-[#eeedf1] px-4 py-3">
          <p className="text-xs text-[#74747e]">Showing {data.length ? ((page - 1) * 25) + 1 : 0}–{((page - 1) * 25) + data.length} of {pagination.totalItems || 0}</p>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} className="inline-flex min-h-9 items-center gap-1 border border-[#dedee6] px-3 text-xs font-semibold text-[#53535d] disabled:opacity-40"><ChevronLeft size={14} /> Previous</button>
            <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="inline-flex min-h-9 items-center gap-1 border border-[#dedee6] px-3 text-xs font-semibold text-[#53535d] disabled:opacity-40">Next <ChevronRight size={14} /></button>
          </div>
        </footer>
      </div>
    </section>
    {resource === 'shops' && <Modal
      isOpen={Boolean(shopForStatus)}
      onClose={() => {
        if (!isSavingStatus) {
          setShopForStatus(null);
          setStatusReason('');
          setNextShopStatus('');
          setStatusUpdateError('');
        }
      }}
      title={`Update status — ${shopForStatus?.name || 'shop'}`}
    >
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!shopForStatus) return;
          setIsSavingStatus(true);
          try {
            await adminService.updateShopStatus(shopForStatus.id, { status: nextShopStatus, reason: statusReason });
            setShopForStatus(null);
            setStatusReason('');
            setNextShopStatus('');
            setStatusUpdateError('');
            setRefreshKey((key) => key + 1);
          } catch (requestError) {
            setStatusUpdateError(requestError.response?.data?.message || 'Unable to update this shop status.');
          } finally {
            setIsSavingStatus(false);
          }
        }}
      >
        <label className="block text-xs font-semibold text-[#414846]">
          New status
          <select required value={nextShopStatus} onChange={(event) => setNextShopStatus(event.target.value)} className="mt-1 min-h-10 w-full border border-[#dedee6] bg-white px-3 text-sm font-normal">
            <option value="">Choose status</option>
            {['active', 'inactive', 'suspended'].filter((item) => item !== shopForStatus?.status).map((item) => <option key={item} value={item}>{item.charAt(0).toUpperCase() + item.slice(1)}</option>)}
          </select>
        </label>
        <label className="block text-xs font-semibold text-[#414846]">
          Reason for change
          <textarea required minLength={5} maxLength={500} rows={3} value={statusReason} onChange={(event) => setStatusReason(event.target.value)} className="mt-1 w-full resize-y border border-[#dedee6] p-3 text-sm font-normal outline-none focus:border-[#6132DA]" placeholder="Add a short reason; it will be recorded in the audit log." />
        </label>
        {statusUpdateError && <p role="alert" className="text-xs text-rose-800">{statusUpdateError}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" disabled={isSavingStatus} onClick={() => { setShopForStatus(null); setStatusReason(''); setNextShopStatus(''); setStatusUpdateError(''); }} className="min-h-10 border border-[#dedee6] px-4 text-sm font-medium text-[#53535d] disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={isSavingStatus || !nextShopStatus || statusReason.trim().length < 5} className="min-h-10 bg-[#6132DA] px-4 text-sm font-semibold text-white disabled:opacity-50">{isSavingStatus ? 'Saving…' : 'Update status'}</button>
        </div>
      </form>
    </Modal>}
    </>
  );
}

AdminListPage.propTypes = {
  resource: PropTypes.oneOf(['shops', 'users', 'customers', 'bookings']).isRequired,
};

export default AdminListPage;
