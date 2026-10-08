import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import BookingStatusBadge from '../components/BookingStatusBadge';
import { bookingStatuses } from '../utils/bookingStatus';
import { bookingService } from '../services/booking.service';

const bookingQuickFilters = [
  { key: 'all', label: 'All Bookings', value: '' },
  { key: 'upcoming', label: 'Upcoming', value: 'UPCOMING' },
  { key: 'today', label: 'Today', value: 'TODAY' },
  { key: 'active', label: 'Active', value: 'ACTIVE' },
  { key: 'pending', label: 'Pending', value: 'PENDING' },
  { key: 'completed', label: 'Completed', value: 'COMPLETED' },
];

const getPaginationItems = (currentPage, totalPages) => {
  if (totalPages <= 4) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (currentPage <= 3) return [1, 2, 3, 'right-ellipsis', totalPages];
  if (currentPage >= totalPages - 2) return [1, 'left-ellipsis', totalPages - 2, totalPages - 1, totalPages];
  return [1, 'left-ellipsis', currentPage - 1, currentPage, currentPage + 1, 'right-ellipsis', totalPages];
};

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`))
  : '—';

const formatMoney = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));

function BookingListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [bookings, setBookings] = useState([]);
  const [summary, setSummary] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalItems: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  const totalPages = Math.max(1, pagination.totalPages || 1);
  const paginationItems = getPaginationItems(page, totalPages);
  const firstRecord = pagination.totalItems ? (page - 1) * pageSize + 1 : 0;
  const lastRecord = Math.min((page - 1) * pageSize + bookings.length, pagination.totalItems);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    const loadBookings = async () => {
      setLoading(true);
      try {
        const response = await bookingService.getBookings({
          page, limit: pageSize, search: debouncedSearch, status: status || undefined,
          startDate: startDate || undefined, endDate: endDate || undefined, sortBy, sortOrder,
        });
        if (!active) return;
        setBookings(response.data.data || []);
        setSummary(response.data.summary || {});
        setPagination(response.data.pagination || { page, limit: pageSize, totalItems: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false });
        setError('');
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || 'Unable to load bookings.');
      } finally {
        if (active) setLoading(false);
      }
    };
    loadBookings();
    return () => { active = false; };
  }, [page, pageSize, debouncedSearch, status, startDate, endDate, sortBy, sortOrder, refresh]);

  const handlePageChange = (nextPage) => {
    setPage(Math.max(1, nextPage));
  };

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatus('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const renderBooking = (booking) => (
    <tr
      key={booking.id}
      role="link"
      tabIndex={0}
      aria-label={`Open booking ${booking.bookingNumber}`}
      onClick={() => navigate(`/bookings/${booking.id}`)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigate(`/bookings/${booking.id}`);
        }
      }}
      className="cursor-pointer transition hover:bg-[#f8f9f6]"
    >
      <td className="px-4 py-3">
        <Link to={`/bookings/${booking.id}`} onClick={(event) => event.stopPropagation()} className="font-mono text-sm font-semibold text-[#252a29] hover:text-[#6132DA]">{booking.bookingNumber}</Link>
        <p className="mt-1 text-xs text-[#59615e]">{booking.itemCount || 0} physical {(booking.itemCount || 0) === 1 ? 'piece' : 'pieces'}</p>
      </td>
      <td className="px-4 py-3"><p className="font-semibold text-[#252a29]">{booking.customer?.name || 'Customer'}</p><p className="mt-1 text-xs text-[#59615e]">{booking.customer?.phone || '—'}</p></td>
      <td className="px-4 py-3 text-[#414846] tabular-nums">{formatDate(booking.rentalStartDate)} <span className="text-[#8b928e]">to</span> {formatDate(booking.rentalEndDate)}</td>
      <td className="px-4 py-3 text-right font-semibold text-[#252a29] tabular-nums">{formatMoney(booking.totalAmount)}</td>
      <td className="px-4 py-3"><BookingStatusBadge status={booking.status} /></td>
      <td className="px-4 py-3 text-[#414846]">{formatDate(String(booking.createdAt || '').slice(0, 10))}</td>
    </tr>
  );

  return (
    <main className="min-h-screen bg-[#f8f9f6] px-4 py-7 text-[#252a29] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1440px]">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[#e8eae7] pb-5">
          <div>
            <h1 className="text-3xl font-semibold text-[#252a29]">Bookings</h1>
            <p className="mt-1 text-sm text-[#59615e]">Manage rental reservations and customer schedules.</p>
          </div>
          <Link to="/bookings/new" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#6132DA] px-4 text-sm font-semibold text-white transition hover:bg-[#4D25B5]">
            <Plus size={17} /> New booking
          </Link>
        </header>

        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div role="group" aria-label="Quick booking filters" className="flex flex-wrap items-center gap-2">
            {bookingQuickFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                aria-pressed={status === filter.value}
                onClick={() => { setStatus(filter.value); setPage(1); }}
                className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3.5 text-xs font-semibold transition focus:outline-none focus:ring-4 focus:ring-[#6132DA]/15 ${status === filter.value ? 'bg-[#6132DA] text-white' : 'bg-[#f1f2ef] text-[#414846] hover:bg-[#e8eae7]'}`}
              >
                {filter.label}
                <span className={`tabular-nums ${status === filter.value ? 'text-white/75' : 'text-[#59615e]'}`}>{filter.key === 'all' ? (summary.totalBookings ?? summary.upcoming ?? 0) : (summary[filter.key] ?? 0)}</span>
              </button>
            ))}
          </div>

          <label className="relative w-full lg:max-w-[320px]">
            <span className="sr-only">Search bookings</span>
            <Search size={17} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#59615e]" />
            <input
              type="search"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              placeholder="Search booking or customer"
              className="min-h-10 w-full rounded-full border border-[#dfe3df] bg-white pl-11 pr-4 text-sm text-[#252a29] outline-none transition placeholder:text-[#747b78] focus:border-[#7046E8] focus:ring-4 focus:ring-[#7046E8]/10"
            />
          </label>
        </div>


        {error && <div role="alert" className="mb-4 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}<button type="button" onClick={() => setRefresh((value) => value + 1)} className="ml-3 font-bold underline">Retry</button></div>}
        <div className="hidden overflow-x-auto border border-[#e6e8e4] bg-white md:block">
          <table className="min-w-[840px] w-full divide-y divide-[#e8eae7] text-left text-sm">
            <thead className="bg-[#f8f9f6] text-[#414846]">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold">Booking</th>
                <th className="px-4 py-3 text-xs font-semibold">Customer</th>
                <th className="px-4 py-3 text-xs font-semibold">Rental period</th>
                <th className="px-4 py-3 text-right text-xs font-semibold">Amount</th>
                <th className="px-4 py-3 text-xs font-semibold">Status</th>
                <th className="px-4 py-3 text-xs font-semibold">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef0ed] bg-white">
              {loading && <tr><td colSpan="6" className="px-4 py-10 text-center text-[#59615e]">Loading bookings...</td></tr>}
              {!loading && !bookings.length && <tr><td colSpan="6" className="px-4 py-12 text-center"><p className="font-semibold text-[#252a29]">{search || status || startDate || endDate ? 'No bookings match these filters.' : 'No bookings yet.'}</p><p className="mt-1 text-sm text-[#59615e]">{search || status || startDate || endDate ? 'Adjust your search or date range.' : 'Create a reservation to begin planning the rental schedule.'}</p>{!search && !status && !startDate && !endDate && <Link to="/bookings/new" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md bg-[#6132DA] px-4 text-sm font-semibold text-white"><Plus size={16} /> New booking</Link>}</td></tr>}
              {!loading && bookings.map(renderBooking)}
            </tbody>
          </table>
        </div>

        <div className="grid gap-px border border-[#e6e8e4] bg-[#e6e8e4] md:hidden">
          {loading && <p className="bg-white px-4 py-10 text-center text-[#59615e]">Loading bookings...</p>}
          {!loading && !bookings.length && <div className="bg-white px-4 py-12 text-center"><p className="font-semibold text-[#252a29]">{search || status || startDate || endDate ? 'No bookings match these filters.' : 'No bookings yet.'}</p><Link to="/bookings/new" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md bg-[#6132DA] px-4 text-sm font-semibold text-white"><Plus size={16} /> New booking</Link></div>}
          {!loading && bookings.map((booking) => <article
            key={booking.id}
            role="link"
            tabIndex={0}
            aria-label={`Open booking ${booking.bookingNumber}`}
            onClick={() => navigate(`/bookings/${booking.id}`)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigate(`/bookings/${booking.id}`);
              }
            }}
            className="cursor-pointer bg-white p-4 transition hover:bg-[#f8f9f6]"
          >
            <div className="flex items-start justify-between gap-3"><div><Link to={`/bookings/${booking.id}`} onClick={(event) => event.stopPropagation()} className="font-mono font-semibold text-[#252a29] hover:text-[#6132DA]">{booking.bookingNumber}</Link><p className="mt-1 font-semibold text-[#252a29]">{booking.customer?.name || 'Customer'}</p><p className="text-xs text-[#59615e]">{booking.customer?.phone || '—'}</p></div><BookingStatusBadge status={booking.status} /></div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-y border-[#eef0ed] py-3 text-sm"><div><p className="text-xs text-[#59615e]">Rental period</p><p className="mt-1 text-[#414846]">{formatDate(booking.rentalStartDate)} – {formatDate(booking.rentalEndDate)}</p></div><div><p className="text-xs text-[#59615e]">{booking.itemCount || 0} pieces</p><p className="mt-1 font-semibold text-[#252a29]">{formatMoney(booking.totalAmount)}</p></div></div>
          </article>)}
        </div>

        <div className="mt-5 flex flex-col gap-4 border-t border-[#e8eae7] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <p className="text-[#414846]">Showing <span className="font-semibold text-[#252a29]">{firstRecord} to {lastRecord}</span> of <span className="font-semibold text-[#252a29]">{pagination.totalItems || 0}</span> bookings</p>
            <label htmlFor="booking-page-size" className="inline-flex items-center gap-2 text-[#747b78]">
              Rows per page
              <select
                id="booking-page-size"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                className="h-8 rounded-sm border border-[#e6e8e4] bg-white px-2 text-xs text-[#414846] outline-none focus:border-[#7046E8] focus:ring-2 focus:ring-[#7046E8]/10"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
            <nav aria-label="Booking pagination" className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous page"
                disabled={!pagination.hasPreviousPage || loading}
                onClick={() => handlePageChange(Math.max(1, page - 1))}
                className="grid size-8 place-items-center rounded-sm bg-white text-[#6132DA] transition hover:bg-[#f8f9f6] disabled:cursor-not-allowed disabled:text-[#c6c9c6]"
              >
                <ChevronLeft size={16} />
              </button>
              {paginationItems.map((item) => (
                typeof item === 'number' ? (
                  <button
                    key={item}
                    type="button"
                    aria-label={`Page ${item}`}
                    aria-current={item === page ? 'page' : undefined}
                    disabled={loading}
                    onClick={() => handlePageChange(item)}
                    className={`grid size-8 place-items-center rounded-sm text-xs font-semibold transition disabled:cursor-wait ${item === page ? 'bg-[#6132DA] text-white' : 'bg-white text-[#414846] hover:bg-[#f8f9f6] hover:text-[#6132DA]'}`}
                  >
                    {item}
                  </button>
                ) : (
                  <span key={item} aria-hidden="true" className="grid size-7 place-items-center text-xs text-[#8b928e]">…</span>
                )
              ))}
              <button
                type="button"
                aria-label="Next page"
                disabled={!pagination.hasNextPage || loading}
                onClick={() => handlePageChange(page + 1)}
                className="grid size-8 place-items-center rounded-sm bg-white text-[#6132DA] transition hover:bg-[#f8f9f6] disabled:cursor-not-allowed disabled:text-[#c6c9c6]"
              >
                <ChevronRight size={16} />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </main>
  );
}

export default BookingListPage;