import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, Rows3, Search } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { categoryService } from '../../catalog/services/category.service';
import { productService } from '../../catalog/services/product.service';
import InventoryStatusBadge from '../components/InventoryStatusBadge';
import { inventoryConditions, inventoryStatuses } from '../utils/inventoryStatus';
import { inventoryService } from '../services/inventory.service';

const apiOrigin = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1').replace(/\/api\/v1\/?$/, '');
const imageUrl = (value) => value?.startsWith('/') ? `${apiOrigin}${value}` : value;
const dateTime = (value) => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const summaryCards = [
  { key: 'total', label: 'Total items' },
  { key: 'available', label: 'Available' },
  { key: 'rented', label: 'Rented' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'damaged', label: 'Damaged' },
  { key: 'lost', label: 'Lost' },
];

const getPaginationItems = (currentPage, totalPages) => {
  if (totalPages <= 4) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (currentPage <= 3) return [1, 2, 3, 'right-ellipsis', totalPages];
  if (currentPage >= totalPages - 2) return [1, 'left-ellipsis', totalPages - 2, totalPages - 1, totalPages];
  return [1, 'left-ellipsis', currentPage - 1, currentPage, currentPage + 1, 'right-ellipsis', totalPages];
};

function InventoryListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { roles } = useAuth();
  const canManage = roles.some((role) => ['OWNER', 'ADMIN'].includes(String(role).toUpperCase()));
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalItems: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [productId, setProductId] = useState(searchParams.get('productId') || '');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [condition, setCondition] = useState('');
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [sort, setSort] = useState('createdAt:desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [view, setView] = useState('table');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const totalPages = Math.max(1, pagination.totalPages || 1);
  const paginationItems = getPaginationItems(page, totalPages);
  const firstRecord = pagination.totalItems ? (page - 1) * pageSize + 1 : 0;
  const lastRecord = Math.min((page - 1) * pageSize + items.length, pagination.totalItems);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    categoryService.getCategories({ page: 1, limit: 100, sortBy: 'name' }).then((response) => setCategories(response.data.data || [])).catch(() => setCategories([]));
    productService.getProducts({ page: 1, limit: 100, status: 'ACTIVE', sortBy: 'name', sortOrder: 'asc' }).then((response) => setProducts(response.data.data || [])).catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const [sortBy, sortOrder] = sort.split(':');
        const response = await inventoryService.getInventory({ page, limit: pageSize, search: debouncedSearch, productId: productId || undefined, categoryId: categoryId || undefined, status: status || undefined, condition: condition || undefined, size: size || undefined, color: color || undefined, sortBy, sortOrder });
        if (!active) return;
        setItems(response.data.data || []);
        setSummary(response.data.summary || {});
        setPagination(response.data.pagination || { page, limit: pageSize, totalItems: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false });
        setError('');
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || 'Unable to load physical inventory.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [page, pageSize, debouncedSearch, productId, categoryId, status, condition, size, color, sort, refreshVersion]);

  const handlePageChange = (nextPage) => setPage(nextPage);

  const resetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setProductId('');
    setCategoryId('');
    setStatus('');
    setCondition('');
    setSize('');
    setColor('');
    setPage(1);
  };

  const handleStatus = async (item, nextStatus) => {
    try {
      await inventoryService.updateStatus(item.id, nextStatus);
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: nextStatus } : entry));
      setRefreshVersion((value) => value + 1);
      setError('');
    } catch (requestError) {
      const detail = requestError.response?.data?.error?.details?.map((entry) => entry.message).join(' ');
      setError(detail || requestError.response?.data?.message || 'Unable to change inventory status.');
    }
  };

  const renderCard = (item) => (
    <article key={item.id} className="border border-[#e6e8e4] bg-white p-4">
      <div className="flex gap-3">
        <div className="h-16 w-16 shrink-0 bg-[#f1f2ef]">{item.product.imageUrl && <img crossOrigin="use-credentials" src={imageUrl(item.product.imageUrl)} alt={item.product.name} className="h-full w-full object-cover" />}</div>
        <div className="min-w-0"><p className="truncate font-semibold text-[#252a29]">{item.product.name}</p><p className="mt-1 font-mono text-xs text-[#414846]">{item.sku}</p><p className="mt-1 text-xs text-[#59615e]">{item.product.sku} · {item.product.category || '—'}</p></div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-[#59615e]">Size / color</p><p className="mt-1 font-medium text-[#252a29]">{item.size || '—'} / {item.color || '—'}</p></div><div><p className="text-xs text-[#59615e]">Condition</p><p className="mt-1 font-medium text-[#252a29]">{item.condition}</p></div><div className="col-span-2"><p className="mb-1 text-xs text-[#59615e]">Status</p><InventoryStatusBadge status={item.status} /></div><div><p className="text-xs text-[#59615e]">Barcode / QR</p><p className="mt-1 truncate font-mono text-xs text-[#252a29]">{item.barcode || item.qrCode || '—'}</p></div><div><p className="text-xs text-[#59615e]">Updated</p><p className="mt-1 text-xs text-[#252a29]">{dateTime(item.updatedAt)}</p></div></div>
      <div className="mt-4 flex gap-2 border-t border-[#e8eae7] pt-3"><Link to={`/inventory/${item.id}`} className="rounded-md border border-[#dfe3df] px-3 py-1.5 text-sm font-semibold text-[#414846] transition hover:border-[#6132DA] hover:text-[#6132DA]">View</Link><Link to={`/inventory/${item.id}/edit`} className="rounded-md border border-[#e6e8e4] bg-[#f8f9f6] px-3 py-1.5 text-sm font-semibold text-[#6132DA] transition hover:bg-[#e8eae7]">Edit</Link>{canManage && <select aria-label={`Change ${item.sku} status`} value="" onChange={(event) => { if (event.target.value) handleStatus(item, event.target.value); }} className="min-w-0 flex-1 rounded-md border border-[#dfe3df] bg-white px-2 text-sm text-[#414846] outline-none focus:border-[#7046E8] focus:ring-2 focus:ring-[#7046E8]/10"><option value="">Change status</option>{inventoryStatuses.filter((next) => next !== item.status).map((next) => <option key={next} value={next}>{next}</option>)}</select>}</div>
    </article>
  );

  return (
    <main className="min-h-full bg-[#f8f9f6] px-4 py-7 text-[#252a29] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[#e8eae7] pb-5"><div><h1 className="text-3xl font-semibold text-[#252a29]">Inventory</h1><p className="mt-1 text-sm text-[#59615e]">Manage individual rental pieces and their operational status.</p></div>{canManage && <Link to="/inventory/new" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#6132DA] px-4 text-sm font-semibold text-white transition hover:bg-[#4D25B5]"><span aria-hidden="true">+</span> Add inventory</Link>}</header>

        <section aria-label="Inventory summary" className="mb-5 grid grid-cols-2 gap-px border border-[#e6e8e4] bg-[#e6e8e4] sm:grid-cols-3 lg:grid-cols-6">{summaryCards.map((card) => <div key={card.key} className="bg-white px-4 py-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#59615e]">{card.label}</p><p className="mt-1 text-2xl font-semibold tabular-nums text-[#252a29]">{summary[card.key] ?? 0}</p></div>)}</section>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <label className="relative block w-full sm:max-w-[420px]">
            <span className="sr-only">Search inventory</span>
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8b928e]" />
            <input
              aria-label="Search inventory"
              type="search"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              placeholder="Search SKU, product, barcode..."
              className="min-h-11 w-full rounded-full border border-[#dfe3df] bg-[#f8f9f6] pl-10 pr-4 text-sm text-[#252a29] outline-none placeholder:text-[#8a8f8c] focus:border-[#7046E8] focus:ring-4 focus:ring-[#7046E8]/10"
            />
          </label>

          <div className="inline-flex items-center gap-1 rounded-full border border-[#dfe3df] bg-[#f3f4f2] p-1">
            <button
              type="button"
              aria-label="Table view"
              title="Table view"
              aria-pressed={view === 'table'}
              onClick={() => setView('table')}
              className={`grid size-9 place-items-center rounded-full transition ${view === 'table' ? 'bg-[#6132DA] text-white shadow-sm' : 'text-[#414846] hover:bg-white'}`}
            >
              <Rows3 size={16} />
            </button>
            <button
              type="button"
              aria-label="Card view"
              title="Card view"
              aria-pressed={view === 'cards'}
              onClick={() => setView('cards')}
              className={`grid size-9 place-items-center rounded-full transition ${view === 'cards' ? 'bg-[#6132DA] text-white shadow-sm' : 'text-[#414846] hover:bg-white'}`}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>

        {error && <div role="alert" className="mb-4 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

        <div className={`${view === 'table' ? 'hidden md:block' : 'hidden' } overflow-x-auto border border-[#e6e8e4] bg-white`}>
          <table className="min-w-[1050px] w-full divide-y divide-[#e8eae7] text-left text-sm"><thead className="bg-[#f8f9f6] text-[#414846]"><tr><th className="px-3 py-3 text-xs font-semibold">Item</th><th className="px-3 py-3 text-xs font-semibold">Product</th><th className="px-3 py-3 text-xs font-semibold">SKU</th><th className="px-3 py-3 text-xs font-semibold">Size</th><th className="px-3 py-3 text-xs font-semibold">Color</th><th className="px-3 py-3 text-xs font-semibold">Condition</th><th className="px-3 py-3 text-xs font-semibold">Status</th><th className="px-3 py-3 text-xs font-semibold">Barcode / QR</th><th className="px-3 py-3 text-xs font-semibold">Updated</th><th className="px-3 py-3 text-xs font-semibold">Actions</th></tr></thead><tbody className="divide-y divide-[#eef0ed]">
            {loading && <tr><td colSpan="10" className="px-4 py-10 text-center text-[#59615e]">Loading physical inventory...</td></tr>}
            {!loading && !items.length && <tr><td colSpan="10" className="px-4 py-12 text-center"><p className="font-semibold text-[#252a29]">{search || status || condition || productId || categoryId || size || color ? 'No inventory matches your filters.' : 'No physical inventory yet.'}</p><p className="mt-1 text-sm text-[#59615e]">{items.length === 0 && !search && !status && !condition && !productId && !categoryId && !size && !color ? 'Add your first physical rental piece to start tracking stock.' : 'Try clearing or changing your filters.'}</p>{canManage && !items.length && !search && !status && !condition && !productId && !categoryId && !size && !color && <Link to="/inventory/new" className="mt-4 inline-flex min-h-10 items-center rounded-md bg-[#6132DA] px-4 text-sm font-semibold text-white">Add inventory</Link>}</td></tr>}
            {!loading && items.map((item) => (
              <tr
                key={item.id}
                className="cursor-pointer transition hover:bg-[#f8f9f6]"
                onClick={() => navigate(`/inventory/${item.id}`)}
              >
                <td className="px-3 py-3"><div className="h-12 w-12 bg-[#f1f2ef]">{item.product.imageUrl && <img crossOrigin="use-credentials" src={imageUrl(item.product.imageUrl)} alt={item.product.name} className="h-full w-full object-cover" />}</div></td>
                <td className="max-w-48 px-3 py-3"><span className="font-semibold text-[#252a29] hover:text-[#6132DA]">{item.product.name}</span><p className="text-xs text-[#59615e]">{item.product.category || '—'}</p></td>
                <td className="px-3 py-3 font-mono text-xs text-[#414846]">{item.sku}</td>
                <td className="px-3 py-3 text-[#414846]">{item.size || '—'}</td>
                <td className="px-3 py-3 text-[#414846]">{item.color || '—'}</td>
                <td className="px-3 py-3 text-[#414846]">{item.condition}</td>
                <td className="px-3 py-3"><InventoryStatusBadge status={item.status} /></td>
                <td className="px-3 py-3 font-mono text-xs text-[#414846]">{item.barcode || item.qrCode || '—'}</td>
                <td className="px-3 py-3 text-xs text-[#414846]">{dateTime(item.updatedAt)}</td>
                <td className="px-3 py-3" onClick={(event) => event.stopPropagation()}>
                  <div className="flex gap-2">
                    <Link to={`/inventory/${item.id}/edit`} className="rounded-md border border-[#e6e8e4] bg-[#f8f9f6] px-2 py-1 text-xs font-semibold text-[#6132DA]">Edit</Link>
                    {canManage && <select aria-label={`Change ${item.sku} status`} value="" onChange={(event) => { if (event.target.value) handleStatus(item, event.target.value); }} className="max-w-28 rounded-md border border-[#dfe3df] bg-white px-1 py-1 text-xs text-[#414846]"><option value="">Status</option>{inventoryStatuses.filter((next) => next !== item.status).map((next) => <option key={next} value={next}>{next}</option>)}</select>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody></table>
        </div>

        <div className={`${view === 'cards' ? 'grid' : 'grid md:hidden'} gap-3`}>{loading && <div className="border border-[#e6e8e4] bg-white px-4 py-10 text-center text-[#59615e]">Loading physical inventory...</div>}{!loading && !items.length && <div className="border border-[#e6e8e4] bg-white px-4 py-10 text-center"><p className="font-semibold text-[#252a29]">{search || status || condition || productId || categoryId || size || color ? 'No inventory matches your filters.' : 'No physical inventory yet.'}</p><p className="mt-1 text-sm text-[#59615e]">Use filters or add your first physical rental piece.</p>{canManage && <Link to="/inventory/new" className="mt-4 inline-flex min-h-10 items-center rounded-md bg-[#6132DA] px-4 text-sm font-semibold text-white">Add inventory</Link>}</div>}{!loading && items.map(renderCard)}</div>

        <div className="mt-5 flex flex-col gap-4 border-t border-[#e8eae7] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <p className="text-[#414846]">Showing <span className="font-semibold text-[#252a29]">{firstRecord} to {lastRecord}</span> of <span className="font-semibold text-[#252a29]">{pagination.totalItems || 0}</span> physical items</p>
            <label htmlFor="inventory-page-size" className="inline-flex items-center gap-2 text-[#747b78]">
              Rows per page
              <select
                id="inventory-page-size"
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
            <nav aria-label="Inventory pagination" className="flex items-center gap-1">
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

export default InventoryListPage;