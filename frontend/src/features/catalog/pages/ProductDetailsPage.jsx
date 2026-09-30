import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Pencil } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import { inventoryService } from '../../inventory/services/inventory.service';
import { productService } from '../services/product.service';

const apiOrigin = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1').replace(/\/api\/v1\/?$/, '');
const resolveImageUrl = (value) => value?.startsWith('/') ? `${apiOrigin}${value}` : value;
const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));
const date = (value) => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

function ProductDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { roles } = useAuth();
  const canManage = roles.some((role) => ['OWNER', 'ADMIN'].includes(String(role).toUpperCase()));
  const [product, setProduct] = useState(null);
  const [inventorySummary, setInventorySummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    productService.getProduct(id)
      .then((response) => { if (active) setProduct(response.data.data); })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || 'Unable to load product.'); })
      .finally(() => { if (active) setLoading(false); });
    inventoryService.getSummary({ productId: id })
      .then((response) => { if (active) setInventorySummary(response.data.data); })
      .catch(() => { if (active) setInventorySummary(null); });
    return () => { active = false; };
  }, [id]);

  const toggleStatus = async () => {
    try {
      const status = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const response = await productService.updateProductStatus(id, status);
      setProduct(response.data.data);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update product status.');
    }
  };

  if (loading) return <main className="flex min-h-full items-center justify-center bg-[#f8f9f6] text-sm text-[#59615e]">Loading product...</main>;
  if (error && !product) return <main className="flex min-h-full items-center justify-center bg-[#f8f9f6] px-4"><div className="w-full max-w-md border border-[#e6e8e4] bg-white p-6"><h1 className="text-xl font-semibold text-[#252a29]">Product unavailable</h1><p role="alert" className="mt-2 text-sm text-[#59615e]">{error}</p><button type="button" onClick={() => navigate('/products')} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md bg-[#68404b] px-4 text-sm font-semibold text-white transition hover:bg-[#54333d]"><ArrowLeft size={15} /> Back to products</button></div></main>;
  if (!product) return null;

  return (
    <main className="min-h-full bg-[#f8f9f6] px-4 py-7 text-[#252a29] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px] space-y-5">
        <Link to="/products" className="inline-flex items-center gap-2 text-sm font-semibold text-[#68404b] transition hover:text-[#54333d]"><ArrowLeft size={16} /> Products</Link>
        <header className="flex flex-col gap-4 border border-[#e6e8e4] bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a5360]">Product profile</p>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h1 className="truncate text-2xl font-semibold text-[#252a29] sm:text-3xl">{product.name}</h1>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${product.status === 'ACTIVE' ? 'bg-[#edf3ef] text-[#35634c]' : 'bg-[#f1f2ef] text-[#59615e]'}`}>{product.status}</span>
              </div>
              <p className="mt-1 font-mono text-xs text-[#59615e]">{product.sku}{product.categoryName ? ` · ${product.categoryName}` : ''}</p>
          </div>
          {canManage && <div className="flex flex-wrap gap-2">
            <Link to={`/products/${id}/edit`} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#68404b] px-4 text-sm font-semibold text-white transition hover:bg-[#54333d]"><Pencil size={15} /> Edit product</Link>
            <button type="button" onClick={toggleStatus} className="inline-flex min-h-10 items-center rounded-md border border-[#dfe3df] bg-white px-4 text-sm font-medium text-[#414846] transition hover:bg-[#f1f2ef]">{product.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button>
          </div>}
        </header>
        {error && <div role="alert" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="border border-[#e6e8e4] bg-white p-4 sm:p-5" aria-label="Product images">
            <header className="mb-4 border-b border-[#e8eae7] pb-3"><h2 className="text-base font-semibold text-[#252a29]">Product images</h2></header>
            {product.images?.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {product.images.map((image, index) => (
                  <img
                    crossOrigin="use-credentials"
                    key={image.id || image.imageUrl}
                    src={resolveImageUrl(image.imageUrl)}
                    alt={`${product.name}, image ${index + 1}${image.isPrimary ? ', primary' : ''}`}
                    className={`aspect-square w-full bg-[#f1f2ef] object-cover ${image.isPrimary ? 'ring-2 ring-[#68404b]' : ''}`}
                  />
                ))}
              </div>
            ) : <div className="flex aspect-[4/3] items-center justify-center bg-[#f1f2ef] text-sm text-[#59615e]">No product images</div>}
          </section>
          <section className="border border-[#e6e8e4] bg-white">
            <header className="border-b border-[#e8eae7] px-5 py-4 sm:px-6"><h2 className="text-base font-semibold text-[#252a29]">Product information</h2><p className="mt-1 text-xs text-[#59615e]">Catalog details and pricing</p></header>
            <dl className="grid grid-cols-2 gap-x-5 px-5 sm:px-6">
              <div className="border-b border-[#eef0ed] py-4"><dt className="text-xs font-medium text-[#59615e]">Category</dt><dd className="mt-1 text-sm font-semibold text-[#252a29]">{product.categoryName || '—'}</dd></div>
              <div className="border-b border-[#eef0ed] py-4"><dt className="text-xs font-medium text-[#59615e]">Brand</dt><dd className="mt-1 text-sm font-semibold text-[#252a29]">{product.brand || '—'}</dd></div>
              <div className="border-b border-[#eef0ed] py-4"><dt className="text-xs font-medium text-[#59615e]">Product type</dt><dd className="mt-1 text-sm font-semibold text-[#252a29]">{product.productType}</dd></div>
              <div className="border-b border-[#eef0ed] py-4"><dt className="text-xs font-medium text-[#59615e]">Rental price</dt><dd className="mt-1 text-sm font-semibold text-[#252a29]">{money(product.rentalPrice)}</dd></div>
              <div className="border-b border-[#eef0ed] py-4"><dt className="text-xs font-medium text-[#59615e]">Security deposit</dt><dd className="mt-1 text-sm font-semibold text-[#252a29]">{money(product.depositAmount)}</dd></div>
              <div className="col-span-2 border-b border-[#eef0ed] py-4"><dt className="text-xs font-medium text-[#59615e]">Description</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-[#414846]">{product.description || 'No description provided.'}</dd></div>
              <div className="py-4"><dt className="text-xs font-medium text-[#59615e]">Created</dt><dd className="mt-1 text-xs text-[#414846]">{date(product.createdAt)}</dd></div>
              <div className="py-4"><dt className="text-xs font-medium text-[#59615e]">Updated</dt><dd className="mt-1 text-xs text-[#414846]">{date(product.updatedAt)}</dd></div>
            </dl>
          </section>
        </div>

        <section className="border border-[#e6e8e4] bg-white p-5 sm:p-6">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8eae7] pb-4">
            <div><h2 className="text-base font-semibold text-[#252a29]">Physical inventory</h2><p className="mt-1 text-sm text-[#59615e]">Counts are informational; date-based availability is handled by booking workflows.</p></div>
            <Link to={`/inventory?productId=${product.id}`} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[#dfe3df] px-3 text-sm font-semibold text-[#414846] transition hover:bg-[#f8f9f6]">Manage items <ArrowUpRight size={15} /></Link>
          </header>
          <div className="mt-4 grid grid-cols-2 gap-px border border-[#e6e8e4] bg-[#e6e8e4] sm:grid-cols-5">{[{ key: 'total', label: 'Total items' }, { key: 'available', label: 'Available' }, { key: 'reserved', label: 'Reserved' }, { key: 'rented', label: 'Rented' }, { key: 'maintenance', label: 'Maintenance' }].map((entry) => <div key={entry.key} className="bg-white px-3 py-3"><p className="text-xs font-semibold uppercase text-[#59615e]">{entry.label}</p><p className="mt-1 text-xl font-bold text-[#252a29]">{inventorySummary?.[entry.key] ?? '—'}</p></div>)}</div>
        </section>
      </div>
    </main>
  );
}

export default ProductDetailsPage;