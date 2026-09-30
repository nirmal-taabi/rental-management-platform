import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Search } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import { categoryService } from '../services/category.service';

const canManageRoles = ['OWNER', 'ADMIN'];
const fetchCategories = async (search) => {
  const response = await categoryService.getCategories({ search, limit: 100, sortBy: 'name' });
  return response.data.data || [];
};

function CategoryManagementPage() {
  const { roles } = useAuth();
  const canManage = roles.some((role) => canManageRoles.includes(String(role).toUpperCase()));
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', description: '' });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const result = await fetchCategories(search);
        if (!active) return;
        setCategories(result);
        setError('');
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || 'Unable to load categories.');
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [search]);

  const resetForm = () => {
    setForm({ name: '', description: '' });
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (editingId) {
        await categoryService.updateCategory(editingId, form);
        setNotice('Category updated.');
      } else {
        await categoryService.createCategory(form);
        setNotice('Category created.');
      }
      resetForm();
      setCategories(await fetchCategories(search));
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.response?.data?.error?.details?.map((item) => item.message).join(' ') || 'Unable to save category.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (category) => {
    try {
      const status = category.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await categoryService.updateCategoryStatus(category.id, status);
      setCategories(await fetchCategories(search));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update category status.');
    }
  };

  return (
    <main className="min-h-full bg-[#f8f9f6] px-4 py-7 text-[#252a29] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px]">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[#e8eae7] pb-5">
          <div>
            <Link to="/products" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#68404b] transition hover:text-[#54333d]"><ArrowLeft size={16} /> Products</Link>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a5360]">Catalog settings</p>
            <h1 className="mt-1 text-3xl font-semibold text-[#252a29]">Categories</h1>
            <p className="mt-2 text-sm text-[#59615e]">Organize products into shop-specific categories.</p>
          </div>
          {canManage && <p className="text-sm text-[#59615e]">Categories are private to this shop.</p>}
        </header>

        {canManage && (
          <form onSubmit={handleSubmit} className="mb-5 grid gap-4 border border-[#e6e8e4] bg-white p-4 md:grid-cols-[1fr_1.2fr_auto] md:items-end">
            <div>
              <label htmlFor="category-name" className="mb-2 block text-xs font-semibold text-[#252a29]">Category name</label>
              <input id="category-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={120} required className="min-h-11 w-full rounded-md border border-[#dfe3df] bg-white px-3.5 text-sm text-[#252a29] outline-none transition focus:border-[#805361] focus:ring-4 focus:ring-[#805361]/10" />
            </div>
            <div>
              <label htmlFor="category-description" className="mb-2 block text-xs font-semibold text-[#252a29]">Description</label>
              <input id="category-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={500} className="min-h-11 w-full rounded-md border border-[#dfe3df] bg-white px-3.5 text-sm text-[#252a29] outline-none transition focus:border-[#805361] focus:ring-4 focus:ring-[#805361]/10" />
            </div>
            <div className="flex gap-2">
              {editingId && <button type="button" onClick={resetForm} className="min-h-11 rounded-md border border-[#dfe3df] bg-white px-3.5 text-sm font-semibold text-[#414846] transition hover:bg-[#f8f9f6]">Cancel</button>}
              <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#68404b] px-4 text-sm font-semibold text-white transition hover:bg-[#54333d] disabled:opacity-50">{!saving && !editingId && <Plus size={15} />}{saving ? 'Saving...' : editingId ? 'Save changes' : 'Add category'}</button>
            </div>
          </form>
        )}

        {error && <div role="alert" className="mb-4 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
        {notice && <div role="status" className="mb-4 border border-[#dfe3df] bg-white px-4 py-3 text-sm text-[#414846]">{notice}</div>}

        <div className="mb-4 flex max-w-md items-center gap-3">
          <label htmlFor="category-search" className="sr-only">Search categories</label>
          <div className="relative w-full"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#59615e]" /><input id="category-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search categories" className="min-h-11 w-full rounded-full border border-[#dfe3df] bg-white pl-10 pr-4 text-sm text-[#252a29] outline-none transition placeholder:text-[#747b78] focus:border-[#805361] focus:ring-4 focus:ring-[#805361]/10" /></div>
        </div>

        <div className="overflow-x-auto border border-[#e6e8e4] bg-white">
          <table className="min-w-full divide-y divide-[#e8eae7] text-left text-sm">
            <thead className="bg-[#f8f9f6] text-[#414846]">
              <tr><th className="px-4 py-3 font-semibold">Category</th><th className="px-4 py-3 font-semibold">Description</th><th className="px-4 py-3 font-semibold">Status</th>{canManage && <th className="px-4 py-3 font-semibold">Actions</th>}</tr>
            </thead>
            <tbody className="divide-y divide-[#eef0ed]">
              {loading && <tr><td colSpan={canManage ? 4 : 3} className="px-4 py-10 text-center text-[#59615e]">Loading categories...</td></tr>}
              {!loading && !categories.length && <tr><td colSpan={canManage ? 4 : 3} className="px-4 py-10 text-center text-sm text-[#59615e]">No categories found.</td></tr>}
              {!loading && categories.map((category) => (
                <tr key={category.id} className="transition hover:bg-[#f8f9f6]">
                  <td className="px-4 py-3 font-semibold text-[#252a29]">{category.name}</td>
                  <td className="max-w-sm px-4 py-3 text-[#414846]">{category.description || '—'}</td>
                  <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${category.status === 'ACTIVE' ? 'bg-[#edf3ef] text-[#35634c]' : 'bg-[#f1f2ef] text-[#59615e]'}`}>{category.status}</span></td>
                  {canManage && <td className="px-4 py-3"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setEditingId(category.id); setForm({ name: category.name, description: category.description || '' }); setNotice(''); }} className="rounded-md border border-[#dfe3df] px-2.5 py-1.5 text-xs font-medium text-[#414846] transition hover:bg-[#f8f9f6]">Edit</button><button type="button" onClick={() => handleStatus(category)} className="rounded-md border border-[#dfe3df] px-2.5 py-1.5 text-xs font-medium text-[#414846] transition hover:bg-[#f8f9f6]">{category.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button></div></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

export default CategoryManagementPage;