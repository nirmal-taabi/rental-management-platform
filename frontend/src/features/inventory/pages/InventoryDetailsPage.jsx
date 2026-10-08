import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import InventoryStatusBadge from '../components/InventoryStatusBadge';
import { inventoryService } from '../services/inventory.service';
import { dateOnly, inventoryConditions } from '../utils/inventoryStatus';

const apiOrigin = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1').replace(/\/api\/v1\/?$/, '');
const imageUrl = (value) => value?.startsWith('/') ? `${apiOrigin}${value}` : value;
const formatDateTime = (value) => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const actionLabel = (action) => String(action || '').replaceAll('_', ' ').toLowerCase().replace(/^./, (character) => character.toUpperCase());

function InventoryDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { roles } = useAuth();
  const canManage = roles.some((role) => ['OWNER', 'ADMIN'].includes(String(role).toUpperCase()));
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retireConfirm, setRetireConfirm] = useState(false);

  const loadItem = async () => {
    try {
      setLoading(true);
      const response = await inventoryService.getInventoryItem(id);
      setItem(response.data.data);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load inventory item.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    inventoryService.getInventoryItem(id)
      .then((response) => {
        if (!active) return;
        setItem(response.data.data);
        setError('');
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load inventory item.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [id]);

  const updateStatus = async (status) => {
    try {
      await inventoryService.updateStatus(id, status);
      await loadItem();
      setError('');
    } catch (requestError) {
      const details = requestError.response?.data?.error?.details?.map((entry) => entry.message).join(' ');
      setError(details || requestError.response?.data?.message || 'Unable to update status.');
    }
  };

  const updateCondition = async (condition) => {
    try {
      await inventoryService.updateCondition(id, condition);
      await loadItem();
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update condition.');
    }
  };

  const retire = async () => {
    try {
      await inventoryService.retire(id);
      await loadItem();
      setRetireConfirm(false);
      setError('');
    } catch (requestError) {
      const details = requestError.response?.data?.error?.details?.map((entry) => entry.message).join(' ');
      setError(details || requestError.response?.data?.message || 'Unable to retire item.');
    }
  };

  if (loading) return <main className="flex min-h-full items-center justify-center bg-[#f8f9f6] text-sm text-[#59615e]">Loading inventory item...</main>;
  if (error && !item) return <main className="flex min-h-full items-center justify-center bg-[#f8f9f6] px-4"><section className="w-full max-w-lg border border-[#e6e8e4] bg-white p-6"><h1 className="text-xl font-semibold text-[#252a29]">Inventory item unavailable</h1><p role="alert" className="mt-2 text-sm text-[#59615e]">{error}</p><button type="button" onClick={() => navigate('/inventory')} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md bg-[#6132DA] px-4 text-sm font-semibold text-white transition hover:bg-[#4D25B5]"><ArrowLeft size={15} /> Back to inventory</button></section></main>;
  if (!item) return null;

  return (
    <main className="min-h-full bg-[#f8f9f6] px-4 py-7 text-[#252a29] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px] space-y-5">
        <Link to="/inventory" className="inline-flex items-center gap-2 text-sm font-semibold text-[#6132DA] transition hover:text-[#4D25B5]"><ArrowLeft size={16} /> Inventory</Link>
        <header className="flex flex-col gap-4 border border-[#e6e8e4] bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8060D9]">Physical item</p><h1 className="mt-1 text-2xl font-semibold text-[#252a29] sm:text-3xl">{item.product.name}</h1><p className="mt-1 font-mono text-sm text-[#414846]">{item.sku}</p></div>
          <div className="flex flex-wrap items-center gap-2"><InventoryStatusBadge status={item.status} />{roles.some((role) => ['OWNER', 'ADMIN', 'STAFF'].includes(String(role).toUpperCase())) && <Link to={`/inventory/${id}/edit`} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#6132DA] px-4 text-sm font-semibold text-white transition hover:bg-[#4D25B5]"><Pencil size={15} /> Edit item</Link>}</div>
        </header>
        {error && <div role="alert" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="border border-[#e6e8e4] bg-white p-5">
            <div className="aspect-[4/3] bg-[#f1f2ef]">{item.product.imageUrl ? <img crossOrigin="use-credentials" src={imageUrl(item.product.imageUrl)} alt={item.product.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-[#59615e]">No product image</div>}</div>
            <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#59615e]">Catalog product</p><p className="mt-1 text-lg font-semibold text-[#252a29]">{item.product.name}</p><p className="mt-1 font-mono text-sm text-[#414846]">{item.product.sku}</p><p className="mt-1 text-sm text-[#59615e]">{item.product.category || '—'}</p></div>
          </section>

          <section className="border border-[#e6e8e4] bg-white p-5 sm:p-6">
            <header className="mb-5 border-b border-[#e8eae7] pb-4"><h2 className="text-base font-semibold text-[#252a29]">Physical item details</h2><p className="mt-1 text-xs text-[#59615e]">Identifiers, condition, and purchase information</p></header>
            <dl className="grid grid-cols-2 gap-x-5 gap-y-5 text-sm">
              <div><dt className="text-xs font-medium text-[#59615e]">Inventory SKU</dt><dd className="mt-1 font-mono font-semibold text-[#252a29]">{item.sku}</dd></div>
              <div><dt className="text-xs font-medium text-[#59615e]">Product SKU</dt><dd className="mt-1 font-mono font-semibold text-[#252a29]">{item.product.sku}</dd></div>
              <div><dt className="text-xs font-medium text-[#59615e]">Barcode</dt><dd className="mt-1 font-mono text-[#252a29]">{item.barcode || 'Not assigned'}</dd></div>
              <div><dt className="text-xs font-medium text-[#59615e]">QR reference</dt><dd className="mt-1 font-mono text-[#252a29]">{item.qrCode || 'Not assigned'}</dd></div>
              <div><dt className="text-xs font-medium text-[#59615e]">Size</dt><dd className="mt-1 font-semibold text-[#252a29]">{item.size || '—'}</dd></div>
              <div><dt className="text-xs font-medium text-[#59615e]">Color</dt><dd className="mt-1 font-semibold text-[#252a29]">{item.color || '—'}</dd></div>
              <div><dt className="text-xs font-medium text-[#59615e]">Condition</dt><dd className="mt-1 font-semibold text-[#252a29]">{item.condition}</dd></div>
              <div><dt className="text-xs font-medium text-[#59615e]">Purchase date</dt><dd className="mt-1 font-semibold text-[#252a29]">{dateOnly(item.purchaseDate) || '—'}</dd></div>
              <div><dt className="text-xs font-medium text-[#59615e]">Created</dt><dd className="mt-1 text-[#414846]">{formatDateTime(item.createdAt)}</dd></div>
              <div><dt className="text-xs font-medium text-[#59615e]">Updated</dt><dd className="mt-1 text-[#414846]">{formatDateTime(item.updatedAt)}</dd></div>
              <div className="col-span-2"><dt className="text-xs font-medium text-[#59615e]">Notes</dt><dd className="mt-1 whitespace-pre-wrap text-[#414846]">{item.notes || 'No notes.'}</dd></div>
            </dl>
          </section>
        </div>

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="border border-[#e6e8e4] bg-white p-5 sm:p-6"><header className="mb-5 border-b border-[#e8eae7] pb-4"><h2 className="text-base font-semibold text-[#252a29]">Operations</h2><p className="mt-1 text-sm text-[#59615e]">These are manual item states only. Date-based booking availability is not calculated here.</p></header>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div><label htmlFor="item-condition" className="mb-2 block text-xs font-semibold text-[#252a29]">Physical condition</label><select id="item-condition" disabled={!roles.some((role) => ['OWNER', 'ADMIN', 'STAFF'].includes(String(role).toUpperCase()))} value={item.condition} onChange={(event) => updateCondition(event.target.value)} className="min-h-11 w-full rounded-md border border-[#dfe3df] bg-white px-3.5 text-sm text-[#414846] outline-none focus:border-[#7046E8] focus:ring-4 focus:ring-[#7046E8]/10 disabled:bg-[#f1f2ef]">{inventoryConditions.map((condition) => <option key={condition} value={condition}>{condition}</option>)}</select></div>
              {canManage && <div><label htmlFor="item-status" className="mb-2 block text-xs font-semibold text-[#252a29]">Change status</label><select id="item-status" value="" onChange={(event) => { if (event.target.value) updateStatus(event.target.value); }} disabled={!item.allowedStatusTransitions?.length} className="min-h-11 w-full rounded-md border border-[#dfe3df] bg-white px-3.5 text-sm text-[#414846] outline-none focus:border-[#7046E8] focus:ring-4 focus:ring-[#7046E8]/10 disabled:bg-[#f1f2ef]"><option value="">{item.allowedStatusTransitions?.length ? 'Select next status' : 'No transitions allowed'}</option>{item.allowedStatusTransitions?.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>}
            </div>
            <div className="mt-5 flex flex-wrap gap-2"><button type="button" disabled className="min-h-9 cursor-not-allowed rounded-md border border-[#dfe3df] px-3 text-sm text-[#59615e]" title="Barcode scanning is not implemented">Scan barcode · Coming soon</button><button type="button" disabled className="min-h-9 cursor-not-allowed rounded-md border border-[#dfe3df] px-3 text-sm text-[#59615e]" title="QR display workflow is not implemented">View QR · Coming soon</button>{canManage && item.status !== 'RETIRED' && <button type="button" onClick={() => setRetireConfirm(true)} className="min-h-9 rounded-md border border-rose-300 px-3 text-sm font-semibold text-rose-800">Retire item</button>}</div>
            {retireConfirm && <div role="alertdialog" aria-label="Confirm retirement" className="mt-4 border border-rose-200 bg-rose-50 p-4"><p className="font-semibold text-[#252a29]">Retire this physical item?</p><p className="mt-1 text-sm text-[#414846]">Retirement is permanent in the normal workflow. The item record will be retained.</p><div className="mt-3 flex gap-2"><button type="button" onClick={retire} className="min-h-9 rounded-md bg-rose-800 px-3 text-sm font-semibold text-white">Confirm retirement</button><button type="button" onClick={() => setRetireConfirm(false)} className="min-h-9 rounded-md border border-[#dfe3df] bg-white px-3 text-sm font-semibold text-[#414846]">Cancel</button></div></div>}
          </div>

          <div className="border border-[#e6e8e4] bg-white p-5 sm:p-6"><header className="border-b border-[#e8eae7] pb-4"><h2 className="text-base font-semibold text-[#252a29]">Activity</h2><p className="mt-1 text-xs text-[#59615e]">Status and condition history</p></header>{item.activity?.length ? <ol className="mt-4 space-y-4">{item.activity.map((entry, index) => <li key={`${entry.createdAt}-${index}`} className="border-l-2 border-[#6132DA] pl-4"><p className="font-semibold text-[#252a29]">{actionLabel(entry.action)}</p><p className="mt-1 text-xs text-[#59615e]">{formatDateTime(entry.createdAt)}{entry.userId ? ` · User ${entry.userId}` : ''}</p>{entry.oldValues?.status !== undefined && <p className="mt-1 text-sm text-[#414846]">{entry.oldValues.status} → {entry.newValues?.status}</p>}{entry.oldValues?.condition !== undefined && <p className="mt-1 text-sm text-[#414846]">{entry.oldValues.condition} → {entry.newValues?.condition}</p>}</li>)}</ol> : <p className="mt-4 text-sm text-[#59615e]">No activity has been recorded yet.</p>}</div>
        </section>
      </div>
    </main>
  );
}

export default InventoryDetailsPage;