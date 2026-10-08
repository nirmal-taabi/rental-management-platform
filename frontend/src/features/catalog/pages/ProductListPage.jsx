import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, PackagePlus, Search } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog';
import { productService } from '../services/product.service';

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));

const productQuickFilters = [
  { label: 'All Products', status: '', countKey: 'all' },
  { label: 'Active Products', status: 'ACTIVE', countKey: 'active' },
  { label: 'Draft Products', status: 'DRAFT', countKey: 'draft' },
  { label: 'Inactive Products', status: 'INACTIVE', countKey: 'inactive' },
];

const getPaginationItems = (currentPage, totalPages) => {
  if (totalPages <= 4) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (currentPage <= 3) return [1, 2, 3, 'right-ellipsis', totalPages];
  if (currentPage >= totalPages - 2) return [1, 'left-ellipsis', totalPages - 2, totalPages - 1, totalPages];
  return [1, 'left-ellipsis', currentPage - 1, currentPage, currentPage + 1, 'right-ellipsis', totalPages];
};

function ProductListPage() {
  const navigate = useNavigate();
  const { roles } = useAuth();
  const canManage = roles.some((role) => ['OWNER', 'ADMIN'].includes(String(role).toUpperCase()));
  const [products, setProducts] = useState([]);
  const [productCounts, setProductCounts] = useState({ all: 0, active: 0, draft: 0, inactive: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalItems: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [productToDeactivate, setProductToDeactivate] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const totalPages = Math.max(1, pagination.totalPages || 1);
  const paginationItems = getPaginationItems(page, totalPages);
  const firstRecord = pagination.totalItems ? (page - 1) * pageSize + 1 : 0;
  const lastRecord = Math.min((page - 1) * pageSize + products.length, pagination.totalItems);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    Promise.all(productQuickFilters.map((filter) => productService.getProducts({
      page: 1,
      limit: 1,
      search: debouncedSearch,
      status: filter.status || undefined,
    })))
      .then((responses) => {
        if (!active) return;
        setProductCounts({
          all: responses[0].data.pagination?.totalItems || 0,
          active: responses[1].data.pagination?.totalItems || 0,
          draft: responses[2].data.pagination?.totalItems || 0,
          inactive: responses[3].data.pagination?.totalItems || 0,
        });
      })
      .catch(() => {
        if (active) setProductCounts({ all: 0, active: 0, draft: 0, inactive: 0 });
      });

    return () => { active = false; };
  }, [debouncedSearch, refreshKey]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const response = await productService.getProducts({ page, limit: pageSize, search: debouncedSearch, status: status || undefined });
        if (!active) return;
        setProducts(response.data.data || []);
        setPagination(response.data.pagination || { page, limit: pageSize, totalItems: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false });
        setError('');
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || 'Unable to load products.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [page, pageSize, debouncedSearch, status, refreshKey]);

  const updateProductStatus = async (product, nextStatus) => {
    try {
      await productService.updateProductStatus(product.id, nextStatus);
      setError('');
      setRefreshKey((value) => value + 1);
      return true;
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update product status.');
      return false;
    }
  };

  const handleStatus = (event, product) => {
    event.stopPropagation();
    if (product.status === 'ACTIVE') {
      setProductToDeactivate(product);
      return;
    }
    updateProductStatus(product, 'ACTIVE');
  };

  const confirmDeactivateProduct = async () => {
    if (!productToDeactivate) return;
    setIsUpdatingStatus(true);
    const updated = await updateProductStatus(productToDeactivate, 'INACTIVE');
    setIsUpdatingStatus(false);
    if (updated) setProductToDeactivate(null);
  };

  const handlePageChange = (nextPage) => setPage(nextPage);

  return (
    <main className="min-h-full bg-[#f8f9f6] px-4 py-7 text-[#252a29] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1440px]">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[#e8eae7] pb-5">
          <div>
            <h1 className="text-3xl font-semibold text-[#252a29]">Products</h1>
            <p className="mt-1 text-sm text-[#59615e]">Manage rental designs, pricing, and product images.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/settings/categories" className="inline-flex min-h-10 items-center rounded-md border border-[#dfe3df] bg-white px-3.5 text-sm font-medium text-[#414846] transition hover:bg-[#f8f9f6]">Categories</Link>
            {canManage && <Link to="/products/new" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#6132DA] px-4 text-sm font-semibold text-white transition hover:bg-[#4D25B5]"><PackagePlus size={16} /> Add product</Link>}
          </div>
        </header>

        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div role="group" aria-label="Quick product filters" className="flex flex-wrap items-center gap-2">
            {productQuickFilters.map((filter) => (
              <button
                key={filter.countKey}
                type="button"
                aria-pressed={status === filter.status}
                onClick={() => { setStatus(filter.status); setPage(1); }}
                className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3.5 text-xs font-semibold transition focus:outline-none focus:ring-4 focus:ring-[#6132DA]/15 ${status === filter.status ? 'bg-[#6132DA] text-white' : 'bg-[#f1f2ef] text-[#414846] hover:bg-[#e8eae7]'}`}
              >
                {filter.label}
                <span className={`tabular-nums ${status === filter.status ? 'text-white/75' : 'text-[#59615e]'}`}>{productCounts[filter.countKey]}</span>
              </button>
            ))}
          </div>

          <label className="relative w-full lg:max-w-[320px]">
            <span className="sr-only">Search product name, SKU or description</span>
            <Search size={17} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#59615e]" />
            <input id="product-search" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name or SKU" className="min-h-10 w-full rounded-full border border-[#dfe3df] bg-white pl-11 pr-4 text-sm text-[#252a29] outline-none transition placeholder:text-[#747b78] focus:border-[#7046E8] focus:ring-4 focus:ring-[#7046E8]/10" />
          </label>
        </div>

        {error && <div role="alert" className="mb-4 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

        <div className="overflow-x-auto border border-[#e6e8e4] bg-white">
          <table className="min-w-[900px] w-full divide-y divide-[#e8eae7] text-left text-sm">
            <thead className="bg-[#f8f9f6] text-[#414846]"><tr><th className="px-4 py-3 text-xs font-semibold">Product</th><th className="px-4 py-3 text-xs font-semibold">SKU</th><th className="px-4 py-3 text-xs font-semibold">Category</th><th className="px-4 py-3 text-xs font-semibold">Rental price</th><th className="px-4 py-3 text-xs font-semibold">Deposit</th><th className="px-4 py-3 text-xs font-semibold">Status</th><th className="px-4 py-3 text-xs font-semibold">Actions</th></tr></thead>
            <tbody className="divide-y divide-[#eef0ed]">
              {loading && <tr><td colSpan="7" className="px-4 py-10 text-center text-[#59615e]">Loading products...</td></tr>}
              {!loading && !products.length && <tr><td colSpan="7" className="px-4 py-12 text-center text-sm text-[#59615e]">No products match these filters.</td></tr>}
              {!loading && products.map((product) => (
                <tr
                  key={product.id}
                  role="link"
                  tabIndex={0}
                  aria-label={`Open ${product.name} product details`}
                  onClick={() => navigate(`/products/${product.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(`/products/${product.id}`);
                    }
                  }}
                  className="cursor-pointer transition hover:bg-[#f8f9f6]"
                >
                  <td className="px-4 py-3"><Link to={`/products/${product.id}`} onClick={(event) => event.stopPropagation()} className="font-semibold text-[#252a29] hover:text-[#6132DA]">{product.name}</Link></td>
                  <td className="px-4 py-3 font-mono text-xs text-[#414846]">{product.sku}</td><td className="px-4 py-3 text-[#414846]">{product.categoryName || '—'}</td><td className="px-4 py-3 text-[#252a29]">{money(product.rentalPrice)}</td><td className="px-4 py-3 text-[#252a29]">{money(product.depositAmount)}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${product.status === 'ACTIVE' ? 'bg-[#edf3ef] text-[#35634c]' : 'bg-[#f1f2ef] text-[#59615e]'}`}>{product.status}</span></td>
                  <td className="px-4 py-3"><div className="flex gap-2">{canManage && <><Link to={`/products/${product.id}/edit`} onClick={(event) => event.stopPropagation()} className="rounded-md border border-[#e6e8e4] bg-[#f8f9f6] px-2.5 py-1.5 text-xs font-medium text-[#6132DA] transition hover:bg-[#e8eae7]">Edit</Link><button type="button" onClick={(event) => handleStatus(event, product)} className="rounded-md border border-[#dfe3df] px-2.5 py-1.5 text-xs font-medium text-[#414846] transition hover:bg-[#f8f9f6]">{product.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button></>}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-col gap-4 border-t border-[#e8eae7] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            <p className="text-[#414846]">Showing <span className="font-semibold text-[#252a29]">{firstRecord} to {lastRecord}</span> of <span className="font-semibold text-[#252a29]">{pagination.totalItems || 0}</span> products</p>
            <label htmlFor="product-page-size" className="inline-flex items-center gap-2 text-[#59615e]">
              Rows per page
              <select id="product-page-size" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="h-8 rounded-sm border border-[#e6e8e4] bg-white px-2 text-xs text-[#414846] outline-none focus:border-[#7046E8] focus:ring-2 focus:ring-[#7046E8]/10">
                <option value={20}>20</option><option value={50}>50</option><option value={100}>100</option>
              </select>
            </label>
          </div>
          <nav aria-label="Product pagination" className="flex flex-wrap items-center gap-1 sm:justify-end">
            <button type="button" aria-label="Previous page" disabled={!pagination.hasPreviousPage || loading} onClick={() => handlePageChange(Math.max(1, page - 1))} className="grid size-8 place-items-center rounded-sm bg-white text-[#6132DA] transition hover:bg-[#f8f9f6] disabled:cursor-not-allowed disabled:text-[#c6c9c6]"><ChevronLeft size={16} /></button>
            {paginationItems.map((item) => (
              typeof item === 'number' ? (
                <button key={item} type="button" aria-label={`Page ${item}`} aria-current={item === page ? 'page' : undefined} disabled={loading} onClick={() => handlePageChange(item)} className={`grid size-8 place-items-center rounded-sm text-xs font-semibold transition disabled:cursor-wait ${item === page ? 'bg-[#6132DA] text-white' : 'bg-white text-[#414846] hover:bg-[#f8f9f6] hover:text-[#6132DA]'}`}>{item}</button>
              ) : <span key={item} aria-hidden="true" className="grid size-7 place-items-center text-xs text-[#59615e]">…</span>
            ))}
            <button type="button" aria-label="Next page" disabled={!pagination.hasNextPage || loading} onClick={() => handlePageChange(page + 1)} className="grid size-8 place-items-center rounded-sm bg-white text-[#6132DA] transition hover:bg-[#f8f9f6] disabled:cursor-not-allowed disabled:text-[#c6c9c6]"><ChevronRight size={16} /></button>
          </nav>
        </div>
      </div>
      <ConfirmationDialog
        isOpen={Boolean(productToDeactivate)}
        title="Deactivate product?"
        message={productToDeactivate ? `${productToDeactivate.name} will no longer be available as an active catalog product.` : ''}
        confirmLabel="Deactivate"
        isConfirming={isUpdatingStatus}
        destructive
        onCancel={() => setProductToDeactivate(null)}
        onConfirm={confirmDeactivateProduct}
      />
    </main>
  );
}

export default ProductListPage;