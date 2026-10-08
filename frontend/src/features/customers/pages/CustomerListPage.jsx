import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Download, FileText, Search, UserRoundPlus } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog';
import { customerService } from '../services/customer.service';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const csvValue = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

const getPaginationItems = (currentPage, totalPages) => {
  if (totalPages <= 4) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (currentPage <= 3) return [1, 2, 3, 'right-ellipsis', totalPages];
  if (currentPage >= totalPages - 2) return [1, 'left-ellipsis', totalPages - 2, totalPages - 1, totalPages];
  return [1, 'left-ellipsis', currentPage - 1, currentPage, currentPage + 1, 'right-ellipsis', totalPages];
};

const customerQuickFilters = [
  { id: 'ALL', label: 'All Customers', countKey: 'totalCustomers' },
  { id: 'ACTIVE_RENTALS', label: 'Active Rentals', countKey: 'activeRentals', rentalFilter: 'ACTIVE' },
  { id: 'UPCOMING_RENTALS', label: 'Upcoming Rentals', countKey: 'upcomingRentals', rentalFilter: 'UPCOMING' },
  { id: 'INACTIVE_CUSTOMERS', label: 'Inactive Customers', countKey: 'inactiveCustomers', status: 'INACTIVE' },
];

const emptySummary = {
  totalCustomers: 0,
  activeCustomers: 0,
  inactiveCustomers: 0,
  activeRentals: 0,
  upcomingRentals: 0,
};

function CustomerListPage() {
  const navigate = useNavigate();
  const { roles } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, totalItems: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false });
  const [summary, setSummary] = useState(emptySummary);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [customerToDeactivate, setCustomerToDeactivate] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const totalPages = Math.max(1, pagination.totalPages || 1);
  const paginationItems = getPaginationItems(page, totalPages);
  const firstRecord = pagination.totalItems ? (page - 1) * pageSize + 1 : 0;
  const lastRecord = Math.min((page - 1) * pageSize + customers.length, pagination.totalItems);

  const canToggleStatus = useMemo(() => roles.some((role) => ['OWNER', 'ADMIN'].includes(String(role).toUpperCase())), [roles]);

  const fetchCustomers = useCallback(async ({ nextPage, nextSearch, nextQuickFilter, nextLimit }) => {
    try {
      setLoading(true);
      const activeFilter = customerQuickFilters.find((filter) => filter.id === nextQuickFilter) || customerQuickFilters[0];
      const response = await customerService.getCustomers({
        page: nextPage,
        limit: nextLimit,
        search: nextSearch,
        status: activeFilter.status,
        rentalFilter: activeFilter.rentalFilter,
      });

      setCustomers(response?.data?.data || []);
      setPagination(response?.data?.pagination || { page: nextPage, limit: nextLimit, totalItems: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false });
      setSummary(response?.data?.summary || emptySummary);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load customers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers({ nextPage: 1, nextSearch: search, nextQuickFilter: quickFilter, nextLimit: pageSize });
    }, 350);

    return () => clearTimeout(timer);
  }, [search, quickFilter, pageSize, fetchCustomers]);

  const handleQuickFilterChange = (filterId) => {
    setQuickFilter(filterId);
    setPage(1);
  };

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
    fetchCustomers({ nextPage, nextSearch: search, nextQuickFilter: quickFilter, nextLimit: pageSize });
  };

  const updateCustomerStatus = async (customer, nextStatus) => {
    try {
      await customerService.updateCustomerStatus(customer.id, nextStatus);
      fetchCustomers({ nextPage: page, nextSearch: search, nextQuickFilter: quickFilter, nextLimit: pageSize });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update customer status.');
    }
  };

  const handleStatusToggle = (event, customer) => {
    event.stopPropagation();
    if (customer.status === 'ACTIVE') {
      setCustomerToDeactivate(customer);
      return;
    }
    updateCustomerStatus(customer, 'ACTIVE');
  };

  const confirmDeactivateCustomer = async () => {
    if (!customerToDeactivate) return;
    setIsUpdatingStatus(true);
    await updateCustomerStatus(customerToDeactivate, 'INACTIVE');
    setIsUpdatingStatus(false);
    setCustomerToDeactivate(null);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setError('');

    try {
      const allCustomers = [];
      let exportPage = 1;
      let totalPages = 1;
      const activeFilter = customerQuickFilters.find((filter) => filter.id === quickFilter) || customerQuickFilters[0];

      do {
        const response = await customerService.getCustomers({
          page: exportPage,
          limit: 100,
          search,
          status: activeFilter.status,
          rentalFilter: activeFilter.rentalFilter,
        });
        allCustomers.push(...(response?.data?.data || []));
        totalPages = response?.data?.pagination?.totalPages || 1;
        exportPage += 1;
      } while (exportPage <= totalPages);

      const columns = [
        ['First name', 'firstName'],
        ['Last name', 'lastName'],
        ['Phone', 'phone'],
        ['Alternate phone', 'alternatePhone'],
        ['Email', 'email'],
        ['Address', 'address'],
        ['City', 'city'],
        ['State', 'state'],
        ['Pincode', 'pincode'],
        ['Status', 'status'],
        ['Created', 'createdAt'],
      ];
      const csvRows = [
        columns.map(([label]) => csvValue(label)).join(','),
        ...allCustomers.map((customer) => columns.map(([, key]) => csvValue(customer[key])).join(',')),
      ];
      const blob = new Blob([`\uFEFF${csvRows.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
      const downloadUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = `customers_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to export customers.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
    <div className="min-h-full bg-[#f8f9f6] px-4 py-7 text-[#252a29] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-6 flex flex-col gap-4 border-b border-[#e8eae7] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-[#252a29]">Customers</h1>
            <p className="mt-1 text-sm text-[#747b78]">Manage client relationships, bridal booking history, sizing profiles, and security deposits.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link to="/customers/drafts" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#dfe3df] bg-white px-3.5 text-xs font-medium text-[#414846] transition hover:bg-[#f8f9f6]">
              <FileText size={15} />
              Drafts
            </Link>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#f1f2ef] px-3.5 text-xs font-medium text-[#414846] transition hover:bg-[#e8eae7] focus:outline-none focus:ring-4 focus:ring-[#6132DA]/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download size={15} />
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </button>
            <Link to="/customers/new" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#6132DA] px-3.5 text-xs font-semibold text-white transition hover:bg-[#4D25B5] focus:outline-none focus:ring-4 focus:ring-[#6132DA]/20">
              <UserRoundPlus size={15} />
              Add Customer
            </Link>
          </div>
        </div>

        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div role="group" aria-label="Quick customer filters" className="flex flex-wrap items-center gap-2">
            {customerQuickFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                aria-pressed={quickFilter === filter.id}
                onClick={() => handleQuickFilterChange(filter.id)}
                className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3.5 text-xs font-semibold transition focus:outline-none focus:ring-4 focus:ring-[#6132DA]/15 ${quickFilter === filter.id ? 'bg-[#6132DA] text-white' : 'bg-[#f1f2ef] text-[#414846] hover:bg-[#e8eae7]'}`}
              >
                {filter.label}
                <span className={`tabular-nums ${quickFilter === filter.id ? 'text-white/75' : 'text-[#8b928e]'}`}>
                  {summary[filter.countKey] || 0}
                </span>
              </button>
            ))}
          </div>

          <label className="relative w-full lg:max-w-[300px]">
              <span className="sr-only">Search customers</span>
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a1a6a2]" />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, phone or email"
                className="min-h-10 w-full rounded-full border border-[#dfe3df] bg-white pl-10 pr-4 text-sm text-[#252a29] outline-none transition placeholder:text-[#b5bbb8] focus:border-[#7046E8] focus:ring-4 focus:ring-[#7046E8]/10"
              />
          </label>
        </div>

        {error && <div role="alert" className="mb-4 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

        <div className="overflow-hidden border border-[#e6e8e4] bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#e8eae7] text-left text-sm">
              <thead className="bg-[#f8f9f6] text-[#747b78]">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold">Customer</th>
                  <th className="px-4 py-3 text-xs font-semibold">Phone</th>
                  <th className="px-4 py-3 text-xs font-semibold">Email</th>
                  <th className="px-4 py-3 text-xs font-semibold">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold">Created</th>
                  <th className="px-4 py-3 text-xs font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef0ed] bg-white">
                {!loading && customers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-[#747b78]">
                      No customers found for this shop.
                    </td>
                  </tr>
                )}

                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    role="link"
                    tabIndex={0}
                    aria-label={`Open ${customer.firstName} ${customer.lastName || ''} customer profile`}
                    onClick={() => navigate(`/customers/${customer.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/customers/${customer.id}`);
                      }
                    }}
                    className="cursor-pointer transition hover:bg-[#f8f9f6]"
                  >
                    <td className="px-4 py-3">
                      <Link to={`/customers/${customer.id}`} onClick={(event) => event.stopPropagation()} className="font-semibold text-[#252a29] hover:text-[#6132DA]">
                        {customer.firstName} {customer.lastName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#414846]">{customer.phone || '—'}</td>
                    <td className="px-4 py-3 text-[#414846]">{customer.email || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${customer.status === 'ACTIVE' ? 'bg-[#edf3ef] text-[#4f7965]' : 'bg-[#f1f2ef] text-[#747b78]'}`}>
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#414846]">{formatDate(customer.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link to={`/customers/${customer.id}/edit`} onClick={(event) => event.stopPropagation()} className="rounded-md border border-[#e6e8e4] bg-[#f8f9f6] px-2.5 py-1.5 text-xs font-medium text-[#6132DA] transition hover:bg-[#e8eae7]">
                          Edit
                        </Link>
                        {canToggleStatus && (
                          <button type="button" onClick={(event) => handleStatusToggle(event, customer)} className="rounded-md border border-[#dfe3df] px-2.5 py-1.5 text-xs font-medium text-[#414846] transition hover:bg-[#f8f9f6]">
                            {customer.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4 border-t border-[#e8eae7] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <p className="text-[#414846]">Showing <span className="font-semibold text-[#252a29]">{firstRecord} to {lastRecord}</span> of <span className="font-semibold text-[#252a29]">{pagination.totalItems || 0}</span> customers</p>
            <label htmlFor="customer-page-size" className="inline-flex items-center gap-2 text-[#747b78]">
              Rows per page
              <select
                id="customer-page-size"
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
            <nav aria-label="Customer pagination" className="flex items-center gap-1">
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
    </div>
      <ConfirmationDialog
        isOpen={Boolean(customerToDeactivate)}
        title="Deactivate customer?"
        message={customerToDeactivate ? `Deactivate ${customerToDeactivate.firstName} ${customerToDeactivate.lastName || ''}? They will remain in your records but won’t be treated as an active customer.` : ''}
        confirmLabel="Deactivate"
        isConfirming={isUpdatingStatus}
        destructive
        onCancel={() => setCustomerToDeactivate(null)}
        onConfirm={confirmDeactivateCustomer}
      />
    </>
  );
}

export default CustomerListPage;
