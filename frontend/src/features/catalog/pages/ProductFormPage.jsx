import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImagePlus, PackagePlus } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import { categoryService } from '../services/category.service';
import { productService } from '../services/product.service';

const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];
const apiOrigin = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1').replace(/\/api\/v1\/?$/, '');
const resolveImageUrl = (value) => value?.startsWith('/') ? `${apiOrigin}${value}` : value;

function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { roles } = useAuth();
  const canManage = roles.some((role) => ['OWNER', 'ADMIN'].includes(String(role).toUpperCase()));
  const isEditing = Boolean(id);
  const [form, setForm] = useState({ categoryId: '', name: '', sku: '', brand: '', productType: 'GARMENT', description: '', rentalPrice: '', depositAmount: '0' });
  const [images, setImages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [isCheckingSku, setIsCheckingSku] = useState(false);
  const [skuNotice, setSkuNotice] = useState('');
  const [error, setError] = useState('');
  const previewUrls = useRef(new Set());
  const skuRequestVersion = useRef(0);

  useEffect(() => () => {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current.clear();
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [categoryResponse, productResponse] = await Promise.all([
          categoryService.getCategories({ limit: 100, sortBy: 'name' }),
          id ? productService.getProduct(id) : Promise.resolve(null),
        ]);
        if (!active) return;
        setCategories(categoryResponse.data.data || []);
        if (productResponse) {
          const product = productResponse.data.data;
          setForm({ categoryId: String(product.categoryId), name: product.name, sku: product.sku, brand: product.brand || '', productType: product.productType || 'GARMENT', description: product.description || '', rentalPrice: product.rentalPrice, depositAmount: product.depositAmount });
          setImages((product.images || []).map((image) => ({ ...image, preview: resolveImageUrl(image.imageUrl), token: `existing:${image.id}` })));
          setSkuNotice('Checking existing SKU...');
          productService.getSkuSuggestion({ categoryId: product.categoryId, excludeId: id })
            .then((skuResponse) => {
              if (!active) return;
              const suggestion = skuResponse?.data?.data || {};
              setSkuNotice(suggestion.available ? 'Existing SKU checked and available.' : 'This SKU is already in use.');
            })
            .catch(() => {
              if (active) setSkuNotice('Unable to verify the existing SKU. It will be checked again when saved.');
            });
        }
        setError('');
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load product information.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [id]);

  const handleFiles = (event) => {
    const chosen = Array.from(event.target.files || []);
    event.target.value = '';
    const available = 8 - images.length;
    if (chosen.length > available) {
      setError('A product can have at most 8 images.');
      return;
    }
    const invalid = chosen.find((file) => !acceptedTypes.includes(file.type) || file.size > 5 * 1024 * 1024);
    if (invalid) {
      setError('Use JPEG, PNG, or WEBP images no larger than 5 MB each.');
      return;
    }
    setError('');
    const newImages = chosen.map((file, index) => {
      const preview = URL.createObjectURL(file);
      previewUrls.current.add(preview);
      return { file, preview, token: `new:${crypto.randomUUID()}`, isPrimary: images.length === 0 && index === 0 };
    });
    setImages((current) => [...current, ...newImages]);
  };

  const moveImage = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    setImages((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeImage = (index) => {
    const removed = images[index];
    if (removed?.file) {
      URL.revokeObjectURL(removed.preview);
      previewUrls.current.delete(removed.preview);
    }
    setImages((current) => {
      const next = current.filter((_image, imageIndex) => imageIndex !== index);
      if (!next.some((image) => image.isPrimary) && next[0]) next[0] = { ...next[0], isPrimary: true };
      return next;
    });
  };

  const setPrimary = (token) => setImages((current) => current.map((image) => ({ ...image, isPrimary: image.token === token })));

  const handleCategoryChange = async (event) => {
    const categoryId = event.target.value;
    const requestVersion = skuRequestVersion.current + 1;
    skuRequestVersion.current = requestVersion;
    setForm((current) => ({ ...current, categoryId, sku: '' }));
    setSkuNotice(categoryId ? 'Checking SKU availability...' : '');
    setError('');

    if (!categoryId) {
      setIsCheckingSku(false);
      return;
    }

    setIsCheckingSku(true);
    try {
      const response = await productService.getSkuSuggestion({
        categoryId,
        excludeId: isEditing ? id : undefined,
      });
      if (requestVersion !== skuRequestVersion.current) return;
      const suggestion = response?.data?.data || {};
      setForm((current) => ({ ...current, categoryId, sku: suggestion.sku || '' }));
      setSkuNotice(suggestion.available ? 'SKU generated and checked for availability.' : 'The generated SKU is already in use. Please select the category again.');
    } catch (requestError) {
      if (requestVersion === skuRequestVersion.current) {
        setError(requestError.response?.data?.message || 'Unable to generate a SKU for this category.');
      }
    } finally {
      if (requestVersion === skuRequestVersion.current) setIsCheckingSku(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const payload = new FormData();
    payload.append('categoryId', form.categoryId);
    payload.append('name', form.name.trim());
    payload.append('sku', form.sku.trim().toUpperCase());
    payload.append('brand', form.brand.trim());
    payload.append('productType', form.productType);
    payload.append('description', form.description.trim());
    payload.append('rentalPrice', form.rentalPrice);
    payload.append('depositAmount', form.depositAmount || '0');
    const uploadedImages = [];
    const manifest = images.map((image) => {
      if (!image.file) return image.token;
      const index = uploadedImages.push(image.file) - 1;
      return `new:${index}`;
    });
    uploadedImages.forEach((file) => payload.append('images', file));
    payload.append('imageManifest', JSON.stringify(manifest));
    payload.append('primaryImageToken', images.find((image) => image.isPrimary)?.file ? `new:${uploadedImages.indexOf(images.find((image) => image.isPrimary).file)}` : images.find((image) => image.isPrimary)?.token || '');

    try {
      if (isEditing) {
        await productService.updateProduct(id, payload);
        navigate(`/products/${id}`);
      } else {
        const response = await productService.createProduct(payload);
        navigate(`/products/${response.data.data.id}`);
      }
    } catch (requestError) {
      const details = requestError.response?.data?.error?.details || [];
      setError(details.length ? details.map((item) => item.message).join(' ') : requestError.response?.data?.message || 'Unable to save product.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <main className="flex min-h-full items-center justify-center bg-[#f8f9f6] text-sm text-[#59615e]">Loading product...</main>;
  if (!canManage) return <main className="flex min-h-full items-center justify-center bg-[#f8f9f6] px-4"><section className="w-full max-w-lg border border-[#e6e8e4] bg-white p-6"><h1 className="text-xl font-semibold text-[#252a29]">Product management access required</h1><p className="mt-2 text-sm text-[#59615e]">Your role can view the catalog but cannot create or edit products.</p><Link to="/products" className="mt-4 inline-flex min-h-10 items-center rounded-md bg-[#68404b] px-4 text-sm font-semibold text-white transition hover:bg-[#54333d]">Back to products</Link></section></main>;

  const fieldClassName = 'min-h-11 w-full rounded-md border border-[#dfe3df] bg-white px-3.5 text-sm text-[#252a29] outline-none transition focus:border-[#805361] focus:ring-4 focus:ring-[#805361]/10';
  const labelClassName = 'mb-2 block text-xs font-semibold text-[#252a29]';

  return (
    <main className="min-h-full bg-[#f8f9f6] px-4 py-7 text-[#252a29] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1120px]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <header className="flex flex-col gap-5 border-b border-[#e8eae7] pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-col items-start gap-2">
              <Link to="/products" className="inline-flex items-center gap-2 text-sm font-semibold text-[#68404b] transition hover:text-[#54333d]"><ArrowLeft size={16} /> Products</Link>
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold text-[#252a29]">{isEditing ? 'Edit product' : 'Add product'}</h1>
                <p className="mt-2 text-sm text-[#59615e]">Product details, pricing, and catalog images.</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link to="/products" className="inline-flex min-h-10 items-center rounded-md border border-[#dfe3df] bg-white px-4 text-sm font-medium text-[#414846] transition hover:bg-[#f8f9f6]">Cancel</Link>
              <button type="submit" disabled={saving || isCheckingSku} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#68404b] px-4 text-sm font-semibold text-white transition hover:bg-[#54333d] disabled:cursor-not-allowed disabled:opacity-60">
                <PackagePlus size={15} />
                {saving ? 'Saving...' : isEditing ? 'Save changes' : 'Create product'}
              </button>
            </div>
          </header>

          {error && <div role="alert" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

          <section className="border border-[#e6e8e4] bg-white p-5 sm:p-6">
            <header className="mb-5 flex items-start gap-3 border-b border-[#e8eae7] pb-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-[#f1e9eb] text-xs font-bold text-[#68404b]">01</span>
              <div><h2 className="text-base font-semibold text-[#252a29]">Product information</h2><p className="mt-1 text-xs text-[#59615e]">Catalog name, category, and description.</p></div>
            </header>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2"><label htmlFor="product-name" className={labelClassName}>Product name</label><input id="product-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={180} required className={fieldClassName} /></div>
              <div><label htmlFor="product-category" className={labelClassName}>Category</label><select id="product-category" value={form.categoryId} onChange={handleCategoryChange} required className={fieldClassName}><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id} disabled={category.status !== 'ACTIVE'}>{category.name}{category.status === 'INACTIVE' ? ' (inactive)' : ''}</option>)}</select></div>
              <div><label htmlFor="product-sku" className={labelClassName}>SKU</label><input id="product-sku" value={form.sku} readOnly placeholder={form.categoryId ? (isCheckingSku ? 'Checking availability...' : 'Generated from category') : 'Select a category first'} maxLength={100} required className={`${fieldClassName} bg-[#f8f9f6] font-mono uppercase read-only:cursor-not-allowed`} /><p aria-live="polite" className="mt-1.5 text-xs text-[#59615e]">{skuNotice || (isCheckingSku ? 'Checking this SKU against your shop products...' : 'Generated from the selected category and checked against existing products.')}</p></div>
              <div><label htmlFor="product-brand" className={labelClassName}>Brand</label><input id="product-brand" value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} maxLength={120} className={fieldClassName} /></div>
              <div><label htmlFor="product-type" className={labelClassName}>Product type</label><select id="product-type" value={form.productType} onChange={(event) => setForm({ ...form, productType: event.target.value })} className={fieldClassName}><option value="GARMENT">Garment</option><option value="EQUIPMENT">Equipment</option><option value="ACCESSORY">Accessory</option><option value="OTHER">Other</option></select></div>
              <div className="sm:col-span-2"><label htmlFor="product-description" className={labelClassName}>Description</label><textarea id="product-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} maxLength={5000} className={`${fieldClassName} resize-y py-3`} /></div>
            </div>
          </section>

          <section className="border border-[#e6e8e4] bg-white p-5 sm:p-6">
            <header className="mb-5 flex items-start gap-3 border-b border-[#e8eae7] pb-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-[#f8f9f6] text-xs font-bold text-[#68404b]">02</span>
              <div><h2 className="text-base font-semibold text-[#252a29]">Rental pricing</h2><p className="mt-1 text-xs text-[#59615e]">Set the rental price and security deposit.</p></div>
            </header>
            <div className="grid gap-5 sm:grid-cols-2">
              <div><label htmlFor="rental-price" className={labelClassName}>Rental price (INR)</label><input id="rental-price" type="number" min="0" step="0.01" value={form.rentalPrice} onChange={(event) => setForm({ ...form, rentalPrice: event.target.value })} required className={fieldClassName} /></div>
              <div><label htmlFor="deposit-amount" className={labelClassName}>Security deposit (INR)</label><input id="deposit-amount" type="number" min="0" step="0.01" value={form.depositAmount} onChange={(event) => setForm({ ...form, depositAmount: event.target.value })} className={fieldClassName} /></div>
            </div>
          </section>

          <section className="border border-[#e6e8e4] bg-white p-5 sm:p-6">
            <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e8eae7] pb-4">
              <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-sm bg-[#f8f9f6] text-xs font-bold text-[#68404b]">03</span><div><h2 className="text-base font-semibold text-[#252a29]">Product images</h2><p className="mt-1 text-sm text-[#59615e]">JPEG, PNG, or WEBP. Up to 8 images, 5 MB each.</p></div></div>
              <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-[#dfe3df] bg-white px-3.5 text-sm font-semibold text-[#414846] transition hover:bg-[#f8f9f6]"><ImagePlus size={16} /> Add images<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFiles} className="sr-only" /></label>
            </header>
            {!images.length && <p className="mt-5 border border-dashed border-[#dfe3df] px-4 py-8 text-center text-sm text-[#59615e]">No images selected.</p>}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {images.map((image, index) => (
                <div key={image.token} className="overflow-hidden border border-[#e6e8e4] bg-[#f8f9f6]">
                  <img src={image.preview} alt={`${form.name || 'Product'} image ${index + 1}`} className="aspect-square w-full object-cover" />
                  <div className="space-y-2 p-2"><button type="button" onClick={() => setPrimary(image.token)} aria-pressed={Boolean(image.isPrimary)} className={`w-full rounded-md px-2 py-1.5 text-xs font-semibold ${image.isPrimary ? 'bg-[#68404b] text-white' : 'border border-[#dfe3df] bg-white text-[#414846]'}`}>{image.isPrimary ? 'Primary image' : 'Set primary'}</button><div className="flex justify-between gap-1"><button type="button" disabled={index === 0} onClick={() => moveImage(index, -1)} aria-label={`Move image ${index + 1} earlier`} className="rounded-md border border-[#dfe3df] px-2 py-1 text-xs text-[#414846] disabled:opacity-40">Move up</button><button type="button" disabled={index === images.length - 1} onClick={() => moveImage(index, 1)} aria-label={`Move image ${index + 1} later`} className="rounded-md border border-[#dfe3df] px-2 py-1 text-xs text-[#414846] disabled:opacity-40">Move down</button><button type="button" onClick={() => removeImage(index)} aria-label={`Remove image ${index + 1}`} className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-800">Remove</button></div></div>
                </div>
              ))}
            </div>
          </section>

          <footer className="flex justify-end gap-3 border-t border-[#e8eae7] pt-4"><Link to="/products" className="inline-flex min-h-10 items-center rounded-md border border-[#dfe3df] bg-white px-4 text-sm font-semibold text-[#414846] transition hover:bg-[#f8f9f6]">Cancel</Link><button type="submit" disabled={saving || isCheckingSku} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#68404b] px-5 text-sm font-semibold text-white transition hover:bg-[#54333d] disabled:opacity-50"><PackagePlus size={15} />{saving ? 'Saving...' : isEditing ? 'Save changes' : 'Create product'}</button></footer>
        </form>
      </div>
    </main>
  );
}

export default ProductFormPage;