import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import PaymentStatusBadge from '../components/PaymentStatusBadge.jsx';
import { paymentService } from '../services/payment.service';

const summaryCards = [
  { key: 'totalCollected', label: 'Collected' },
  { key: 'todayCollected', label: "Today's collection" },
  { key: 'outstanding', label: 'Outstanding' },
  { key: 'paymentCount', label: 'Successful payments' },
  { key: 'pendingCount', label: 'Unresolved' },
];

const paymentQuickFilters = [
  { value: '', label: 'All Payments' },
  { value: 'SUCCESS', label: 'Successful', countKey: 'successfulCount' },
  { value: 'PENDING', label: 'Pending', countKey: 'pendingCount' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'PARTIALLY_REFUNDED', label: 'Partially Refunded' },
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

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(`${String(value).slice(0, 10)}T00:00:00Z`))
    : '—';

const formatMoney = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

function PaymentListPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({});
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
  const lastRecord = Math.min((page - 1) * pageSize + payments.length, pagination.totalItems);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const response = await paymentService.getPayments({
          page,
          limit: pageSize,
          search: debouncedSearch,
          status: status || undefined,
        });
        if (!active) return;
        setPayments(response.data.data || []);
        setSummary(response.data.summary || {});
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
        if (active) setError(requestError.response?.data?.message || 'Unable to load payments.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [
    page,
    pageSize,
    debouncedSearch,
    status,
    refresh,
  ]);

  const handlePageChange = (nextPage) => {
    setPage(Math.max(1, nextPage));
  };

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatus('');
    setPage(1);
  };

  const renderPayment = (payment) => (
    <tr key={payment.id} className="transition hover:bg-[#f8f9f6]">
      <td className="px-4 py-3">
        <Link
          to={`/payments/${payment.id}`}
          className="font-mono text-sm font-semibold text-[#252a29] hover:text-[#68404b]"
        >
          {payment.paymentReference}
        </Link>
        <p className="mt-1 text-xs text-[#59615e]">{payment.paymentMethod.replaceAll('_', ' ')}</p>
      </td>
      <td className="px-4 py-3">
        <Link
          to={`/bookings/${payment.bookingId}`}
          className="font-mono text-sm font-semibold text-[#414846] hover:text-[#68404b]"
        >
          {payment.bookingNumber || 'Legacy payment'}
        </Link>
      </td>
      <td className="px-4 py-3">
        <p className="font-semibold text-[#252a29]">{payment.customer?.name || 'Customer'}</p>
        <p className="mt-1 text-xs text-[#59615e]">{payment.customer?.phone || '—'}</p>
      </td>
      <td className="px-4 py-3 text-right font-semibold text-[#252a29] tabular-nums">
        {formatMoney(payment.amount)}
      </td>
      <td className="px-4 py-3 text-xs font-semibold text-[#414846]">
        {payment.paymentType.replaceAll('_', ' ')}
      </td>
      <td className="px-4 py-3">
        <PaymentStatusBadge status={payment.status} />
      </td>
      <td className="px-4 py-3 text-[#414846]">{formatDate(payment.transactionDate)}</td>
      <td className="px-4 py-3 text-right">
        <Link
          to={`/payments/${payment.id}`}
          className="inline-flex min-h-8 items-center rounded-md border border-[#e6e8e4] bg-[#f8f9f6] px-2.5 py-1.5 text-xs font-medium text-[#68404b] transition hover:bg-[#e8eae7]"
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
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a5360]">
              Payment ledger
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-[#252a29]">Payments</h1>
            <p className="mt-1 text-sm text-[#59615e]">
              Track rental payments, deposits and outstanding balances.
            </p>
          </div>
          <Link
            to="/bookings"
            className="inline-flex min-h-10 items-center rounded-md border border-[#dfe3df] bg-white px-4 text-sm font-semibold text-[#414846] transition hover:border-[#68404b] hover:text-[#68404b]"
          >
            Open bookings
          </Link>
        </header>

        <section
          aria-label="Payment summary"
          className="mb-6 grid grid-cols-2 gap-px border border-[#e6e8e4] bg-[#e6e8e4] sm:grid-cols-3 lg:grid-cols-5"
        >
          {summaryCards.map((card) => (
            <div key={card.key} className="bg-white px-4 py-4">
              <p className="text-xs font-medium text-[#59615e]">{card.label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[#252a29]">
                {card.key.includes('Count')
                  ? (summary[card.key] ?? 0)
                  : formatMoney(summary[card.key])}
              </p>
            </div>
          ))}
        </section>

        <section aria-label="Payment filters" className="mb-5 space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div
              role="group"
              aria-label="Filter payments by status"
              className="flex flex-wrap items-center gap-2"
            >
              {paymentQuickFilters.map((filter) => (
                <button
                  key={filter.value || 'all'}
                  type="button"
                  aria-pressed={status === filter.value}
                  onClick={() => {
                    setStatus(filter.value);
                    setPage(1);
                  }}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3.5 text-xs font-semibold transition focus:outline-none focus:ring-4 focus:ring-[#68404b]/15 ${status === filter.value ? 'bg-[#68404b] text-white' : 'bg-[#f1f2ef] text-[#414846] hover:bg-[#e8eae7]'}`}
                >
                  {filter.label}
                  {filter.countKey && (
                    <span className={status === filter.value ? 'text-white/75' : 'text-[#59615e]'}>
                      {summary[filter.countKey] ?? 0}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <label className="relative w-full lg:max-w-[320px]">
              <span className="sr-only">Search payments</span>
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
                placeholder="Search reference, booking or customer"
                className="min-h-10 w-full rounded-full border border-[#dfe3df] bg-white pl-11 pr-4 text-sm text-[#252a29] outline-none transition placeholder:text-[#747b78] focus:border-[#805361] focus:ring-4 focus:ring-[#805361]/10"
              />
            </label>
          </div>
          {(search || status) && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-[#68404b] underline underline-offset-4"
            >
              Clear filters
            </button>
          )}
        </section>

        {error && (
          <div
            role="alert"
            className="mb-4 border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800"
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
          <table className="min-w-[1040px] w-full divide-y divide-[#e8eae7] text-left text-sm">
            <thead className="bg-[#f8f9f6] text-[#414846]">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold">Payment</th>
                <th className="px-4 py-3 text-xs font-semibold">Booking</th>
                <th className="px-4 py-3 text-xs font-semibold">Customer</th>
                <th className="px-4 py-3 text-right text-xs font-semibold">Amount</th>
                <th className="px-4 py-3 text-xs font-semibold">Type</th>
                <th className="px-4 py-3 text-xs font-semibold">Status</th>
                <th className="px-4 py-3 text-xs font-semibold">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef0ed] bg-white">
              {loading && (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-[#59615e]">
                    Loading payments...
                  </td>
                </tr>
              )}
              {!loading && !payments.length && (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center">
                    <p className="font-semibold text-[#252a29]">
                      {search || status
                        ? 'No payments match these filters.'
                        : 'No payment transactions yet.'}
                    </p>
                    <p className="mt-1 text-sm text-[#59615e]">
                      Payments recorded against bookings will appear here.
                    </p>
                  </td>
                </tr>
              )}
              {!loading && payments.map(renderPayment)}
            </tbody>
          </table>
        </div>

        <div className="grid gap-px border border-[#e6e8e4] bg-[#e6e8e4] md:hidden">
          {loading && (
            <p className="bg-white px-4 py-10 text-center text-[#59615e]">Loading payments...</p>
          )}
          {!loading && !payments.length && (
            <p className="bg-white px-4 py-12 text-center text-sm text-[#59615e]">
              {search || status
                ? 'No payments match these filters.'
                : 'No payment transactions yet.'}
            </p>
          )}
          {!loading &&
            payments.map((payment) => (
              <article key={payment.id} className="bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      to={`/payments/${payment.id}`}
                      className="font-mono font-semibold text-[#252a29] hover:text-[#68404b]"
                    >
                      {payment.paymentReference}
                    </Link>
                    <p className="mt-1 text-sm text-[#414846]">
                      {payment.bookingNumber || 'Legacy payment'}
                    </p>
                  </div>
                  <PaymentStatusBadge status={payment.status} />
                </div>
                <p className="mt-3 font-semibold text-[#252a29]">
                  {payment.customer?.name || 'Customer'}{' '}
                  <span className="font-normal text-[#59615e]">
                    · {payment.customer?.phone || '—'}
                  </span>
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-[#eef0ed] pt-3 text-sm">
                  <span className="text-[#414846]">
                    {payment.paymentType.replaceAll('_', ' ')} ·{' '}
                    {payment.paymentMethod.replaceAll('_', ' ')} ·{' '}
                    {formatDate(payment.transactionDate)}
                  </span>
                  <strong className="tabular-nums text-[#252a29]">
                    {formatMoney(payment.amount)}
                  </strong>
                </div>
                <Link
                  to={`/payments/${payment.id}`}
                  className="mt-3 inline-flex text-sm font-semibold text-[#68404b] underline underline-offset-4"
                >
                  View receipt
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
              payments
            </p>
            <label
              htmlFor="payment-page-size"
              className="inline-flex items-center gap-2 text-[#747b78]"
            >
              Rows per page
              <select
                id="payment-page-size"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                className="h-8 rounded-sm border border-[#e6e8e4] bg-white px-2 text-xs text-[#414846] outline-none focus:border-[#805361] focus:ring-2 focus:ring-[#805361]/10"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>
          <nav aria-label="Payment pagination" className="flex items-center gap-1 sm:justify-end">
            <button
              type="button"
              aria-label="Previous page"
              disabled={!pagination.hasPreviousPage || loading}
              onClick={() => handlePageChange(page - 1)}
              className="grid size-8 place-items-center rounded-sm bg-white text-[#68404b] transition hover:bg-[#f8f9f6] disabled:cursor-not-allowed disabled:text-[#c6c9c6]"
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
                  className={`grid size-8 place-items-center rounded-sm text-xs font-semibold transition disabled:cursor-wait ${item === page ? 'bg-[#68404b] text-white' : 'bg-white text-[#414846] hover:bg-[#f8f9f6] hover:text-[#68404b]'}`}
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
              className="grid size-8 place-items-center rounded-sm bg-white text-[#68404b] transition hover:bg-[#f8f9f6] disabled:cursor-not-allowed disabled:text-[#c6c9c6]"
            >
              <ChevronRight size={16} />
            </button>
          </nav>
        </footer>
      </div>
    </main>
  );
}

export default PaymentListPage;
