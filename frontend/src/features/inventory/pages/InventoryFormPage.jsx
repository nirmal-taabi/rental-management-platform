import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Boxes } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import { productService } from '../../catalog/services/product.service';
import { inventoryService } from '../services/inventory.service';
import { dateOnly, inventoryConditions } from '../utils/inventoryStatus';

const apiOrigin = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1').replace(/\/api\/v1\/?$/, '');
const resolveImageUrl = (value) => value?.startsWith('/') ? `${apiOrigin}${value}` : value;
const emptyInventory = { sku: '', barcode: '', qrCode: '', size: '', color: '', condition: 'GOOD', purchaseDate: '', notes: '' };

function InventoryFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { roles } = useAuth();
  const isEditing = Boolean(id);
  const canCreate = roles.some((role) => ['OWNER', 'ADMIN'].includes(String(role).toUpperCase()));
  const [form, setForm] = useState(emptyInventory);
  const [product, setProduct] = useState(null);
  const [skuSuffix, setSkuSuffix] = useState('001');
  const [productSearch, setProductSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [showProductResults, setShowProductResults] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(productSearch.trim()), 350);
    return () => clearTimeout(timer);
  }, [productSearch]);

  useEffect(() => {
    if (isEditing || !showProductResults) return;
    let active = true;
    productService.getProducts({ search: debouncedSearch, status: 'ACTIVE', page: 1, limit: 20, sortBy: 'name', sortOrder: 'asc' })
      .then((response) => { if (active) setProducts(response.data.data || []); })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || 'Unable to search products.'); });
    return () => { active = false; };
  }, [debouncedSearch, isEditing, showProductResults]);

  useEffect(() => {
    if (!id) return undefined;
    let active = true;
    inventoryService.getInventoryItem(id)
      .then((response) => {
        if (!active) return;
        const item = response.data.data;
        setProduct(item.product);
        setForm({ sku: item.sku, barcode: item.barcode || '', qrCode: item.qrCode || '', size: item.size || '', color: item.color || '', condition: item.condition, purchaseDate: dateOnly(item.purchaseDate), notes: item.notes || '' });
      })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || 'Unable to load inventory item.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!isEditing && !product) {
      setError('Select a product before creating an inventory item.');
      return;
    }
    setSaving(true);
    const sku = (isEditing ? form.sku.trim() : `${product.sku}-${skuSuffix.trim()}`).toUpperCase();
    const payload = { ...form, sku, barcode: form.barcode.trim(), qrCode: form.qrCode.trim(), size: form.size.trim(), color: form.color.trim(), notes: form.notes.trim(), purchaseDate: form.purchaseDate || null };
    try {
      if (isEditing) {
        await inventoryService.updateInventoryItem(id, payload);
        navigate(`/inventory/${id}`);
      } else {
        const response = await inventoryService.createInventoryItem({ ...payload, productId: product.id });
        navigate(`/inventory/${response.data.data.id}`);
      }
    } catch (requestError) {
      const details = requestError.response?.data?.error?.details || [];
      setError(details.length ? details.map((item) => item.message).join(' ') : requestError.response?.data?.message || 'Unable to save inventory item.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <main className="flex min-h-full items-center justify-center bg-[#f8f9f6] text-sm text-[#59615e]">Loading inventory item...</main>;
  if (!isEditing && !canCreate) return <main className="flex min-h-full items-center justify-center bg-[#f8f9f6] px-4"><section className="w-full max-w-lg border border-[#e6e8e4] bg-white p-6"><h1 className="text-xl font-semibold text-[#252a29]">Inventory creation access required</h1><p className="mt-2 text-sm text-[#59615e]">Your role can view and update inventory metadata but cannot create stock items.</p><Link to="/inventory" className="mt-4 inline-flex min-h-10 items-center rounded-md bg-[#6132DA] px-4 text-sm font-semibold text-white">Back to inventory</Link></section></main>;

  const fieldClassName = 'min-h-11 w-full rounded-md border border-[#dfe3df] bg-white px-3.5 text-sm text-[#252a29] outline-none transition focus:border-[#7046E8] focus:ring-4 focus:ring-[#7046E8]/10';
  const labelClassName = 'mb-2 block text-xs font-semibold text-[#252a29]';

  return (
    <main className="min-h-full bg-[#f8f9f6] px-4 py-7 text-[#252a29] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1120px]">
        {error && <div role="alert" className="mb-5 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <header className="flex flex-col gap-5 border-b border-[#e8eae7] pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-col items-start gap-2">
              <Link to="/inventory" className="inline-flex items-center gap-2 text-sm font-semibold text-[#6132DA] transition hover:text-[#4D25B5]"><ArrowLeft size={16} /> Inventory</Link>
              <div><h1 className="text-3xl font-semibold text-[#252a29]">{isEditing ? 'Edit physical item' : 'Add physical item'}</h1><p className="mt-2 text-sm text-[#59615e]">Register and maintain individual rental stock.</p></div>
            </div>
            <div className="flex gap-2"><Link to="/inventory" className="inline-flex min-h-10 items-center rounded-md border border-[#dfe3df] bg-white px-4 text-sm font-medium text-[#414846] transition hover:bg-[#f8f9f6]">Cancel</Link><button type="submit" disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#6132DA] px-4 text-sm font-semibold text-white transition hover:bg-[#4D25B5] disabled:opacity-50"><Boxes size={15} />{saving ? 'Saving...' : isEditing ? 'Save changes' : 'Add inventory item'}</button></div>
          </header>

          <section className="border border-[#e6e8e4] bg-white p-5 sm:p-6">
            <header className="mb-4 flex items-start gap-3 border-b border-[#e8eae7] pb-4"><span className="grid size-9 shrink-0 place-items-center rounded-sm bg-[#F1ECFC] text-xs font-bold text-[#6132DA]">01</span><div><h2 className="text-base font-semibold text-[#252a29]">Product</h2><p className="mt-1 text-xs text-[#59615e]">Connect this physical piece to a catalog product.</p></div></header>
            {isEditing ? (
              <div className="flex items-center gap-4 border border-[#e6e8e4] bg-[#f8f9f6] p-3">
                <div className="h-16 w-16 shrink-0 bg-[#f1f2ef]">{product?.imageUrl && <img crossOrigin="use-credentials" src={resolveImageUrl(product.imageUrl)} alt={product.name} className="h-full w-full object-cover" />}</div>
                <div><p className="font-semibold text-[#252a29]">{product?.name}</p><p className="mt-1 font-mono text-sm text-[#414846]">{product?.sku}</p><p className="text-sm text-[#59615e]">{product?.category || '—'}</p></div>
              </div>
            ) : (
              <div className="relative">
                <label htmlFor="product-search" className={labelClassName}>Choose an active product *</label>
                {product ? (
                  <div className="flex items-center justify-between gap-3 border border-[#D8CCF5] bg-[#f8f9f6] p-3">
                    <div className="flex min-w-0 items-center gap-3"><div className="h-14 w-14 shrink-0 bg-white">{product.primaryImage && <img crossOrigin="use-credentials" src={resolveImageUrl(product.primaryImage)} alt={product.name} className="h-full w-full object-cover" />}</div><div className="min-w-0"><p className="truncate font-semibold text-[#252a29]">{product.name}</p><p className="font-mono text-sm text-[#414846]">{product.sku}</p><p className="text-xs text-[#59615e]">{product.categoryName || '—'}</p></div></div>
                    <button type="button" onClick={() => { setProduct(null); setSkuSuffix('001'); setProductSearch(''); setShowProductResults(true); }} className="min-h-9 shrink-0 rounded-md border border-[#dfe3df] bg-white px-3 text-sm font-semibold text-[#414846] transition hover:bg-[#f1f2ef]">Change</button>
                  </div>
                ) : (
                  <>
                    <input id="product-search" role="combobox" aria-expanded={showProductResults} aria-controls="product-options" aria-autocomplete="list" value={productSearch} onFocus={() => setShowProductResults(true)} onChange={(event) => { setProductSearch(event.target.value); setShowProductResults(true); }} placeholder="Search product name or SKU" className={fieldClassName} />
                    {showProductResults && <div id="product-options" role="listbox" className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto border border-[#dfe3df] bg-white shadow-lg">{products.map((item) => <button type="button" role="option" aria-selected="false" key={item.id} onClick={() => { setProduct(item); setSkuSuffix('001'); setShowProductResults(false); setProductSearch(''); setError(''); }} className="flex w-full items-center gap-3 border-b border-[#eef0ed] px-3 py-3 text-left transition hover:bg-[#f8f9f6]"><div className="h-12 w-12 shrink-0 bg-[#f1f2ef]">{item.primaryImage && <img crossOrigin="use-credentials" src={resolveImageUrl(item.primaryImage)} alt="" className="h-full w-full object-cover" />}</div><span className="min-w-0"><span className="block truncate font-semibold text-[#252a29]">{item.name}</span><span className="font-mono text-xs text-[#414846]">{item.sku}</span><span className="ml-2 text-xs text-[#59615e]">{item.categoryName || ''}</span></span></button>)}{!products.length && <p className="px-4 py-6 text-center text-sm text-[#59615e]">No active products found.</p>}</div>}
                  </>
                )}
              </div>
            )}
          </section>

          <section className="border border-[#e6e8e4] bg-white p-5 sm:p-6">
            <header className="mb-5 flex items-start gap-3 border-b border-[#e8eae7] pb-4"><span className="grid size-9 shrink-0 place-items-center rounded-sm bg-[#f8f9f6] text-xs font-bold text-[#6132DA]">02</span><div><h2 className="text-base font-semibold text-[#252a29]">Physical item details</h2><p className="mt-1 text-xs text-[#59615e]">Identification, size, condition, and purchase record.</p></div></header>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="inventory-sku" className={labelClassName}>Inventory SKU *</label>
                {isEditing ? (
                  <input id="inventory-sku" value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} maxLength={80} pattern="[A-Za-z0-9][A-Za-z0-9._-]{1,79}" required className={`${fieldClassName} font-mono`} />
                ) : (
                  <div className="flex min-h-11 w-full overflow-hidden rounded-md border border-[#dfe3df] bg-white font-mono text-sm focus-within:border-[#7046E8] focus-within:ring-4 focus-within:ring-[#7046E8]/10">
                    <span className="inline-flex shrink-0 items-center bg-[#f8f9f6] px-3.5 text-[#59615e]">{product ? `${product.sku}-` : 'Select a product-'}</span>
                    <input id="inventory-sku" aria-label="Inventory SKU suffix" value={skuSuffix} onChange={(event) => setSkuSuffix(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} maxLength={Math.max(0, 80 - (product?.sku.length || 0) - 1)} pattern="[A-Z0-9]+" required disabled={!product} className="min-w-0 flex-1 bg-transparent px-3 uppercase outline-none disabled:cursor-not-allowed disabled:bg-[#f8f9f6]" />
                  </div>
                )}
                <p className="mt-1.5 text-xs text-[#59615e]">{isEditing ? 'Unique in your shop. You can edit the item code.' : 'Product SKU is added automatically. Edit the final segment, such as 001 or S.'}</p>
              </div>
              <div><label htmlFor="inventory-barcode" className={labelClassName}>Barcode</label><input id="inventory-barcode" value={form.barcode} onChange={(event) => setForm({ ...form, barcode: event.target.value })} maxLength={100} className={fieldClassName} /></div>
              <div><label htmlFor="inventory-qr" className={labelClassName}>QR reference</label><input id="inventory-qr" value={form.qrCode} onChange={(event) => setForm({ ...form, qrCode: event.target.value })} maxLength={500} className={fieldClassName} /></div>
              <div><label htmlFor="inventory-size" className={labelClassName}>Size</label><input id="inventory-size" value={form.size} onChange={(event) => setForm({ ...form, size: event.target.value })} maxLength={50} className={fieldClassName} /></div>
              <div><label htmlFor="inventory-color" className={labelClassName}>Color</label><input id="inventory-color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} maxLength={50} className={fieldClassName} /></div>
              <div><label htmlFor="inventory-condition" className={labelClassName}>Physical condition</label><select id="inventory-condition" value={form.condition} onChange={(event) => setForm({ ...form, condition: event.target.value })} className={fieldClassName}>{inventoryConditions.map((condition) => <option key={condition} value={condition}>{condition}</option>)}</select></div>
              <div><label htmlFor="purchase-date" className={labelClassName}>Purchase date</label><input id="purchase-date" type="date" value={form.purchaseDate} onChange={(event) => setForm({ ...form, purchaseDate: event.target.value })} className={fieldClassName} /></div>
              <div className="sm:col-span-2"><label htmlFor="inventory-notes" className={labelClassName}>Notes</label><textarea id="inventory-notes" rows={4} maxLength={5000} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={`${fieldClassName} resize-y py-3`} /></div>
            </div>
          </section>

          {!isEditing && <p className="text-sm text-[#59615e]">New physical items start with status AVAILABLE.</p>}
          <footer className="flex justify-end gap-3 border-t border-[#e8eae7] pt-4"><Link to="/inventory" className="inline-flex min-h-10 items-center rounded-md border border-[#dfe3df] bg-white px-4 text-sm font-semibold text-[#414846] transition hover:bg-[#f8f9f6]">Cancel</Link><button type="submit" disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#6132DA] px-5 text-sm font-semibold text-white transition hover:bg-[#4D25B5] disabled:opacity-50"><Boxes size={15} />{saving ? 'Saving...' : isEditing ? 'Save changes' : 'Add inventory item'}</button></footer>
        </form>
      </div>
    </main>
  );
}

export default InventoryFormPage;