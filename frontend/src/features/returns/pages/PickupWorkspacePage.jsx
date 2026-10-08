import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ClipboardCheck, LoaderCircle, Printer } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext.jsx';
import { bookingService } from '../../bookings/services/booking.service';
import { returnService } from '../services/return.service';

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${String(value).slice(0, 10)}T00:00:00Z`))
  : '—';

const formatDateTime = (value) => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

function PickupWorkspacePage() {
  const { id } = useParams();
  const { shop } = useAuth();
  const [booking, setBooking] = useState(null);
  const [checked, setChecked] = useState({});
  const [pickupNotes, setPickupNotes] = useState('');
  const [pickup, setPickup] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    bookingService.getBooking(id).then((response) => {
      if (!active) return;
      const nextBooking = response.data.data;
      setBooking(nextBooking);
      setChecked(Object.fromEntries((nextBooking.items || []).map((item) => [String(item.id), true])));
      setError('');
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.message || 'Unable to load this booking.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const confirmPickup = async () => {
    if (!booking || booking.status !== 'READY' || booking.items.some((item) => !checked[String(item.id)])) return;
    setSaving(true);
    setError('');
    try {
      const response = await returnService.confirmPickup(booking.id, {
        items: booking.items.map((item) => ({ bookingItemId: item.id, inventoryItemId: item.inventoryItemId })),
        pickupNotes,
      });
      setPickup(response.data.data);
      setConfirming(false);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Pickup could not be completed. Refresh the booking and try again.');
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <main className="flex min-h-full items-center justify-center bg-[#f8f9f6] text-sm text-[#59615e]">Loading pickup checklist...</main>;
  if (!booking) return <main className="flex min-h-full items-center justify-center bg-[#f8f9f6] px-4"><section className="w-full max-w-lg border border-[#e6e8e4] bg-white p-6"><h1 className="text-xl font-semibold text-[#252a29]">Booking unavailable</h1><p role="alert" className="mt-2 text-sm text-[#59615e]">{error || 'This booking could not be found.'}</p><Link to="/bookings" className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-[#6132DA] underline">Back to bookings</Link></section></main>;

  if (pickup) return (
    <main className="min-h-full bg-[#f8f9f6] px-4 py-8 text-[#252a29] sm:px-6 print:bg-white print:px-0 print:py-0">
      <article className="mx-auto max-w-3xl border border-[#e6e8e4] bg-white print:border-0">
        <header className="border-b border-[#e8eae7] px-5 py-5 sm:px-8"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#35634c]">{shop?.name || 'Rental shop'}</p><h1 className="mt-2 font-mono text-2xl font-semibold text-[#252a29]">{pickup.bookingNumber}</h1><p className="mt-1 text-sm text-[#59615e]">Pickup confirmed. The booking is now ACTIVE.</p></header>
        <dl className="grid gap-4 border-b border-[#e8eae7] px-5 py-5 text-sm sm:grid-cols-2 sm:px-8"><div><dt className="text-xs uppercase tracking-wide text-[#59615e]">Customer</dt><dd className="mt-1 font-semibold text-[#252a29]">{pickup.customer?.name}</dd></div><div><dt className="text-xs uppercase tracking-wide text-[#59615e]">Pickup time</dt><dd className="mt-1 font-semibold text-[#252a29]">{formatDateTime(pickup.pickedUpAt)}</dd></div><div><dt className="text-xs uppercase tracking-wide text-[#59615e]">Items handed over</dt><dd className="mt-1 font-semibold text-[#252a29]">{pickup.items.length}</dd></div><div><dt className="text-xs uppercase tracking-wide text-[#59615e]">Expected return</dt><dd className="mt-1 font-semibold text-[#252a29]">{formatDate(pickup.rentalEndDate)}</dd></div></dl>
        <div className="divide-y divide-[#eef0ed] px-5 sm:px-8">{pickup.items.map((item) => <div key={item.bookingItemId} className="flex justify-between gap-4 py-3 text-sm"><div><p className="font-semibold text-[#252a29]">{item.productName}</p><p className="mt-1 font-mono text-xs text-[#59615e]">{item.inventorySku} · {item.size || '—'} · {item.color || '—'}</p></div><span className="self-center text-xs font-semibold text-[#35634c]">RENTED</span></div>)}</div>
        {pickup.pickupNotes && <p className="border-t border-[#e8eae7] px-5 py-4 text-sm text-[#414846] sm:px-8">{pickup.pickupNotes}</p>}
        <footer className="flex flex-wrap justify-end gap-2 border-t border-[#e8eae7] px-5 py-4 print:hidden sm:px-8"><button type="button" onClick={() => window.print()} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#dfe3df] bg-white px-4 text-sm font-semibold text-[#414846] transition hover:bg-[#f8f9f6]"><Printer size={16} /> Print pickup receipt</button><Link to={`/bookings/${booking.id}`} className="inline-flex min-h-10 items-center rounded-md bg-[#6132DA] px-4 text-sm font-semibold text-white transition hover:bg-[#4D25B5]">View booking</Link></footer>
      </article>
    </main>
  );

  const allChecked = booking.items.length > 0 && booking.items.every((item) => checked[String(item.id)]);
  const eligible = booking.status === 'READY';

  return (
    <main className="min-h-full bg-[#f8f9f6] px-4 py-7 text-[#252a29] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px] space-y-5">
        <Link to={`/bookings/${booking.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-[#6132DA] transition hover:text-[#4D25B5]"><ArrowLeft size={16} /> Booking details</Link>
        <header className="flex flex-col gap-4 border border-[#e6e8e4] bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8060D9]">Customer handover</p><h1 className="mt-1 text-2xl font-semibold text-[#252a29] sm:text-3xl">Pickup checklist</h1></div><span className="font-mono text-sm font-semibold text-[#414846]">{booking.bookingNumber}</span></header>
        {error && <div role="alert" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
        {!eligible && <div role="alert" className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Pickup requires a READY booking. Current status: {booking.status}.</div>}
        <section className="grid gap-px border border-[#e6e8e4] bg-[#e6e8e4] sm:grid-cols-3"><div className="bg-white px-4 py-4"><p className="text-xs font-medium text-[#59615e]">Customer</p><p className="mt-1 font-semibold text-[#252a29]">{booking.customer?.name}</p><p className="mt-1 text-xs text-[#59615e]">{booking.customer?.phone || '—'}</p></div><div className="bg-white px-4 py-4"><p className="text-xs font-medium text-[#59615e]">Rental period</p><p className="mt-1 font-semibold text-[#252a29]">{formatDate(booking.rentalStartDate)} – {formatDate(booking.rentalEndDate)}</p></div><div className="bg-white px-4 py-4"><p className="text-xs font-medium text-[#59615e]">Items to hand over</p><p className="mt-1 font-semibold text-[#252a29]">{booking.items.length} pieces</p></div></section>

        <section className="border border-[#e6e8e4] bg-white"><header className="flex items-center gap-3 border-b border-[#e8eae7] px-5 py-4"><ClipboardCheck size={19} className="text-[#6132DA]" /><div><h2 className="font-semibold text-[#252a29]">Verify every physical piece</h2><p className="mt-1 text-xs text-[#59615e]">Pickup is all-or-nothing for this booking.</p></div></header><div className="divide-y divide-[#eef0ed]">{booking.items.map((item) => <label key={item.id} className="flex cursor-pointer items-start gap-3 px-5 py-4 transition hover:bg-[#f8f9f6]"><input type="checkbox" checked={Boolean(checked[String(item.id)])} onChange={(event) => setChecked((current) => ({ ...current, [String(item.id)]: event.target.checked }))} className="mt-1 size-4 accent-[#6132DA]" /><span className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><span><span className="block font-semibold text-[#252a29]">{item.product?.name}</span><span className="mt-1 block font-mono text-xs text-[#6132DA]">{item.inventoryItem?.sku}</span><span className="mt-1 block text-xs text-[#59615e]">Size {item.inventoryItem?.size || '—'} · {item.inventoryItem?.color || '—'} · Condition {item.inventoryItem?.condition || '—'}</span></span><span className="text-xs font-semibold text-[#414846]">{item.inventoryItem?.status}</span></span></label>)}</div></section>

        <label className="block text-sm font-semibold text-[#252a29]">Pickup notes <span className="font-normal text-[#59615e]">(optional)</span><textarea value={pickupNotes} onChange={(event) => setPickupNotes(event.target.value)} maxLength={2000} rows={3} className="mt-2 w-full rounded-md border border-[#dfe3df] bg-white px-3 py-2 font-normal text-[#252a29] outline-none transition placeholder:text-[#747b78] focus:border-[#7046E8] focus:ring-4 focus:ring-[#7046E8]/10" /></label>
        <footer className="flex flex-wrap justify-end gap-3"><Link to={`/bookings/${booking.id}`} className="inline-flex min-h-10 items-center rounded-md border border-[#dfe3df] bg-white px-4 text-sm font-semibold text-[#414846] transition hover:bg-[#f1f2ef]">Cancel</Link><button type="button" disabled={!eligible || !allChecked || saving} onClick={() => setConfirming(true)} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#6132DA] px-4 text-sm font-semibold text-white transition hover:bg-[#4D25B5] disabled:cursor-not-allowed disabled:opacity-45">{saving ? <LoaderCircle size={17} className="animate-spin" /> : <Check size={17} />} Confirm pickup</button></footer>

        {confirming && <div className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-0 sm:place-items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setConfirming(false); }}><section role="dialog" aria-modal="true" aria-labelledby="confirm-pickup-title" className="w-full rounded-t-md border border-[#e6e8e4] bg-white p-5 sm:max-w-lg sm:rounded-md"><h2 id="confirm-pickup-title" className="text-lg font-semibold text-[#252a29]">Confirm pickup?</h2><p className="mt-2 text-sm leading-6 text-[#59615e]">{booking.items.length} physical item(s) will be marked RENTED and this booking will become ACTIVE.</p><div className="mt-5 flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setConfirming(false)} className="min-h-10 rounded-md border border-[#dfe3df] bg-white px-4 text-sm font-semibold text-[#414846] transition hover:bg-[#f8f9f6]">Back</button><button type="button" disabled={saving} onClick={confirmPickup} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#6132DA] px-4 text-sm font-semibold text-white transition hover:bg-[#4D25B5] disabled:opacity-50">{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}Confirm handover</button></div></section></div>}
      </div>
    </main>
  );
}

export default PickupWorkspacePage;