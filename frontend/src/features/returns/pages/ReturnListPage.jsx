import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import ReturnStatusBadge from '../components/ReturnStatusBadge';
import { returnDamageStatuses } from '../utils/returnStatus';
import { returnService } from '../services/return.service';

const formatDateTime = (value) =>
  value
    ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value),
      )
    : '—';

const returnQuickFilters = [
  { value: '', label: 'All Returns' },
  { value: 'ON_TIME', label: 'On Time' },
  { value: 'LATE', label: 'Late' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'COMPLETED', label: 'Completed' },
];

const getPaginationItems = (currentPage, totalPages) => {
  if (totalPages <= 4) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (currentPage <= 3) return [1, 2, 3, 'right-ellipsis', totalPages];
  if (currentPage >= totalPages - 2)
    return [1, 'left-ellipsis', totalPages - 2, totalPages - 1, totalPages];
  return [
    1,
    'left-ellipsis',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    'right-ellipsis',
    totalPages,
  ];
};

function ReturnListPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [damageStatus, setDamageStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sort, setSort] = useState('returnDate:desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [returns, setReturns] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  const totalPages = Math.max(1, pagination.totalPages || 1);
  const paginationItems = getPaginationItems(page, totalPages);
  const firstRecord = pagination.totalItems ? (page - 1) * pageSize + 1 : 0;
  const lastRecord = Math.min((page - 1) * pageSize + returns.length, pagination.totalItems);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [sortBy, sortOrder] = sort.split(':');
        const response = await returnService.getReturns({
          page,
          limit: pageSize,
          search: debouncedSearch,
          status: status || undefined,
          damageStatus: damageStatus || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          sortBy,
          sortOrder,
        });
        if (!active) return;
        setReturns(response.data.data || []);
        setPagination(
          response.data.pagination || {
            page,
            limit: pageSize,
            totalItems: 0,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        );
        setError('');
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || 'Unable to load returns.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [page, pageSize, debouncedSearch, status, damageStatus, startDate, endDate, sort, refresh]);

  const handlePageChange = (nextPage) => {
    setPage(Math.max(1, nextPage));
  };

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatus('');
    setDamageStatus('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const row = (entry) => (
    <tr key={entry.id} className="transition hover:bg-[#f8f9f6]">
      <td className="px-4 py-3">
        <Link
          to={`/returns/${entry.id}`}
          className="font-mono text-sm font-semibold text-[#252a29] underline-offset-4 hover:text-[#6132DA] hover:underline"
        >
          RT-{String(entry.id).padStart(5, '0')}
        </Link>
        <p className="mt-1 text-xs text-[#59615e]">{entry.itemCount || 0} pieces</p>
      </td>
      <td className="px-4 py-3">
        <Link
          to={`/bookings/${entry.bookingId}`}
          className="font-mono text-sm font-semibold text-[#414846] hover:text-[#6132DA]"
        >
          {entry.bookingNumber}
        </Link>
      </td>
      <td className="px-4 py-3">
        <p className="font-semibold text-[#252a29]">{entry.customer?.name}</p>
        <p className="mt-1 text-xs text-[#59615e]">{entry.customer?.phone || '—'}</p>
      </td>
      <td className="px-4 py-3 text-[#414846]">{formatDateTime(entry.returnedAt)}</td>
      <td className="px-4 py-3">
        <ReturnStatusBadge status={entry.returnStatus} />
        {entry.daysLate > 0 && (
          <p className="mt-1 text-xs text-amber-800">{entry.daysLate} days late</p>
        )}
      </td>
      <td className="px-4 py-3 text-[#414846]">{entry.issueCount || 0}</td>
      <td className="px-4 py-3 text-right">
        <Link
          to={`/returns/${entry.id}`}
          className="inline-flex min-h-8 items-center rounded-md border border-[#e6e8e4] bg-[#f8f9f6] px-2.5 py-1.5 text-xs font-medium text-[#6132DA] transition hover:bg-[#e8eae7]"
        >
          Receipt
        </Link>
      </td>
    </tr>
  );

  return (
    <main className="min-h-full bg-[#f8f9f6] px-4 py-7 text-[#252a29] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1440px]">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[#e8eae7] pb-5">
          <div>
            <h1 className="text-3xl font-semibold text-[#252a29]">Returns</h1>
            <p className="mt-1 text-sm text-[#59615e]">
              Return history and item condition records.
            </p>
          </div>
          <Link
            to="/bookings"
            className="inline-flex min-h-10 items-center rounded-md border border-[#dfe3df] bg-white px-4 text-sm font-semibold text-[#414846] transition hover:border-[#6132DA] hover:text-[#6132DA]"
          >
            Open bookings
          </Link>
        </header>

        <section aria-label="Return filters" className="mb-5 space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div
              role="group"
              aria-label="Filter returns by status"
              className="flex flex-wrap items-center gap-2"
            >
              {returnQuickFilters.map((filter) => (
                <button
                  key={filter.value || 'all'}
                  type="button"
                  aria-pressed={status === filter.value}
                  onClick={() => {
                    setStatus(filter.value);
                    setPage(1);
                  }}
                  className={`inline-flex min-h-10 items-center rounded-md px-3.5 text-xs font-semibold transition focus:outline-none focus:ring-4 focus:ring-[#6132DA]/15 ${status === filter.value ? 'bg-[#6132DA] text-white' : 'bg-[#f1f2ef] text-[#414846] hover:bg-[#e8eae7]'}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <label className="relative w-full lg:max-w-[320px]">
              <span className="sr-only">Search returns</span>
              <Search
                size={17}
                className="absolute left-5 top-1/2 -translate-y-1/2 text-[#59615e]"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search return, booking or customer"
                className="min-h-10 w-full rounded-full border border-[#dfe3df] bg-white pl-11 pr-4 text-sm text-[#252a29] outline-none transition placeholder:text-[#747b78] focus:border-[#7046E8] focus:ring-4 focus:ring-[#7046E8]/10"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter damage status"
              value={damageStatus}
              onChange={(event) => {
                setDamageStatus(event.target.value);
                setPage(1);
              }}
              className="min-h-9 rounded-md border border-[#dfe3df] bg-white px-3 text-xs text-[#414846] outline-none focus:border-[#7046E8] focus:ring-2 focus:ring-[#7046E8]/10"
            >
              <option value="">All damage statuses</option>
              {returnDamageStatuses.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select
              aria-label="Sort returns"
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);
                setPage(1);
              }}
              className="min-h-9 rounded-md border border-[#dfe3df] bg-white px-3 text-xs text-[#414846] outline-none focus:border-[#7046E8] focus:ring-2 focus:ring-[#7046E8]/10"
            >
              <option value="returnDate:desc">Latest return</option>
              <option value="returnDate:asc">Oldest return</option>
              <option value="createdAt:desc">Recently recorded</option>
            </select>
            <label className="flex min-h-9 items-center gap-2 rounded-md border border-[#dfe3df] bg-white px-3">
              <CalendarDays size={15} className="text-[#59615e]" />
              <input
                aria-label="Returns from date"
                type="date"
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  setPage(1);
                }}
                className="min-w-0 flex-1 text-xs text-[#414846] outline-none"
              />
            </label>
            <label className="flex min-h-9 items-center gap-2 rounded-md border border-[#dfe3df] bg-white px-3">
              <CalendarDays size={15} className="text-[#59615e]" />
              <input
                aria-label="Returns through date"
                type="date"
                value={endDate}
                onChange={(event) => {
                  setEndDate(event.target.value);
                  setPage(1);
                }}
                className="min-w-0 flex-1 text-xs text-[#414846] outline-none"
              />
            </label>
          </div>
          {(search || status || damageStatus || startDate || endDate) && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-[#6132DA] underline underline-offset-4"
            >
              Clear filters
            </button>
          )}
        </section>

        {error && (
          <div
            role="alert"
            className="mb-4 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            {error}
            <button
              type="button"
              onClick={() => setRefresh((value) => value + 1)}
              className="ml-3 font-bold underline"
            >
              Retry
            </button>
          </div>
        )}
        <div className="hidden overflow-x-auto border border-[#e6e8e4] bg-white md:block">
          <table className="min-w-[900px] w-full divide-y divide-[#e8eae7] text-left text-sm">
            <thead className="bg-[#f8f9f6] text-[#414846]">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold">Return</th>
                <th className="px-4 py-3 text-xs font-semibold">Booking</th>
                <th className="px-4 py-3 text-xs font-semibold">Customer</th>
                <th className="px-4 py-3 text-xs font-semibold">Returned at</th>
                <th className="px-4 py-3 text-xs font-semibold">Timing</th>
                <th className="px-4 py-3 text-xs font-semibold">Issues</th>
                <th className="px-4 py-3 text-right text-xs font-semibold">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef0ed] bg-white">
              {loading && (
                <tr>
                  <td colSpan="7" className="px-4 py-10 text-center text-[#59615e]">
                    Loading returns...
                  </td>
                </tr>
              )}
              {!loading && !returns.length && (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center">
                    <p className="font-semibold text-[#252a29]">
                      {search || status || damageStatus || startDate || endDate
                        ? 'No returns match these filters.'
                        : 'No returns recorded yet.'}
                    </p>
                    <p className="mt-1 text-sm text-[#59615e]">
                      Return records appear here after a booking item is received.
                    </p>
                  </td>
                </tr>
              )}
              {!loading && returns.map(row)}
            </tbody>
          </table>
        </div>
        <div className="grid gap-px border border-[#e6e8e4] bg-[#e6e8e4] md:hidden">
          {loading && (
            <p className="bg-white px-4 py-10 text-center text-[#59615e]">Loading returns...</p>
          )}
          {!loading && !returns.length && (
            <p className="bg-white px-4 py-12 text-center text-sm text-[#59615e]">
              No returns recorded yet.
            </p>
          )}
          {!loading &&
            returns.map((entry) => (
              <article key={entry.id} className="bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      to={`/returns/${entry.id}`}
                      className="font-mono font-semibold text-[#252a29] hover:text-[#6132DA]"
                    >
                      RT-{String(entry.id).padStart(5, '0')}
                    </Link>
                    <p className="mt-1 font-semibold text-[#252a29]">{entry.customer?.name}</p>
                  </div>
                  <ReturnStatusBadge status={entry.returnStatus} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 border-y border-[#eef0ed] py-3 text-sm">
                  <div>
                    <p className="text-xs text-[#59615e]">Booking</p>
                    <Link
                      to={`/bookings/${entry.bookingId}`}
                      className="mt-1 inline-flex font-mono text-[#6132DA]"
                    >
                      {entry.bookingNumber}
                    </Link>
                  </div>
                  <div>
                    <p className="text-xs text-[#59615e]">Returned</p>
                    <p className="mt-1 text-[#414846]">{formatDateTime(entry.returnedAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#59615e]">Items / issues</p>
                    <p className="mt-1 text-[#414846]">
                      {entry.itemCount || 0} / {entry.issueCount || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#59615e]">Timing</p>
                    <p className="mt-1 text-[#414846]">
                      {entry.daysLate > 0 ? `${entry.daysLate} days late` : 'On time'}
                    </p>
                  </div>
                </div>
                <Link
                  to={`/returns/${entry.id}`}
                  className="mt-3 inline-flex text-sm font-semibold text-[#6132DA] underline underline-offset-4"
                >
                  View return
                </Link>
              </article>
            ))}
        </div>
        <footer className="mt-5 flex flex-col gap-4 border-t border-[#e8eae7] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <p className="text-[#414846]">
              Showing{' '}
              <span className="font-semibold text-[#252a29]">
                {firstRecord} to {lastRecord}
              </span>{' '}
              of <span className="font-semibold text-[#252a29]">{pagination.totalItems || 0}</span>{' '}
              returns
            </p>
            <label
              htmlFor="return-page-size"
              className="inline-flex items-center gap-2 text-[#747b78]"
            >
              Rows per page
              <select
                id="return-page-size"
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
          <nav aria-label="Return pagination" className="flex items-center gap-1 sm:justify-end">
            <button
              type="button"
              aria-label="Previous page"
              disabled={!pagination.hasPreviousPage || loading}
              onClick={() => handlePageChange(page - 1)}
              className="grid size-8 place-items-center rounded-sm bg-white text-[#6132DA] transition hover:bg-[#f8f9f6] disabled:cursor-not-allowed disabled:text-[#c6c9c6]"
            >
              <ChevronLeft size={16} />
            </button>
            {paginationItems.map((item) =>
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
                <span
                  key={item}
                  aria-hidden="true"
                  className="grid size-7 place-items-center text-xs text-[#8b928e]"
                >
                  …
                </span>
              ),
            )}
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
        </footer>
      </div>
    </main>
  );
}

export default ReturnListPage;
