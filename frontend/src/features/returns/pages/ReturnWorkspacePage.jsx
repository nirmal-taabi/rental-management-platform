import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, LoaderCircle, Printer } from 'lucide-react';
import { bookingService } from '../../bookings/services/booking.service';
import { returnConditions, returnDamageStatuses } from '../utils/returnStatus';
import { getReturnStatus, toUtcTimestamp } from '../utils/returnDate';
import { returnService } from '../services/return.service';
import ReturnStatusBadge from '../components/ReturnStatusBadge';

const localNow = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
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

const formatDateTime = (value) =>
  value
    ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value),
      )
    : '—';
const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

function ReturnWorkspacePage() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [returnItems, setReturnItems] = useState({});
  const [returnedAt, setReturnedAt] = useState(localNow());
  const [notes, setNotes] = useState('');
  const [savedReturn, setSavedReturn] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    bookingService
      .getBooking(id)
      .then((response) => {
        if (!active) return;
        const nextBooking = response.data.data;
        setBooking(nextBooking);
        const outstanding = (nextBooking.items || []).filter((item) => item.status === 'ACTIVE');
        setReturnItems(
          Object.fromEntries(
            outstanding.map((item) => [
              String(item.id),
              {
                returned: true,
                condition: 'GOOD',
                damageStatus: 'NONE',
                notes: '',
              },
            ]),
          ),
        );
        setError('');
      })
      .catch((requestError) => {
        if (active)
          setError(requestError.response?.data?.message || 'Unable to load this booking.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const outstandingItems = (booking?.items || []).filter((item) => item.status === 'ACTIVE');
  const selectedItems = outstandingItems.filter((item) => returnItems[String(item.id)]?.returned);
  const remainingCount = outstandingItems.length - selectedItems.length;
  const dateStatus = useMemo(
    () =>
      booking && returnedAt
        ? getReturnStatus(booking.rentalEndDate, toUtcTimestamp(returnedAt))
        : { status: 'ON_TIME', daysLate: 0 },
    [booking, returnedAt],
  );

  const updateItem = (itemId, field, value) =>
    setReturnItems((current) => ({
      ...current,
      [String(itemId)]: { ...current[String(itemId)], [field]: value },
    }));

  const submitReturn = async () => {
    if (!selectedItems.length || !booking) return;
    setSaving(true);
    setError('');
    try {
      const response = await returnService.recordReturn(booking.id, {
        returnedAt: toUtcTimestamp(returnedAt),
        notes,
        items: selectedItems.map((item) => ({
          bookingItemId: item.id,
          inventoryItemId: item.inventoryItemId,
          condition: returnItems[String(item.id)].condition,
          damageStatus: returnItems[String(item.id)].damageStatus,
          notes: returnItems[String(item.id)].notes,
        })),
      });
      setSavedReturn(response.data.data);
      setConfirming(false);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          'Return could not be recorded. Refresh the booking and retry.',
      );
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <main className="flex min-h-full items-center justify-center bg-[#f8f9f6] text-sm text-[#59615e]">
        Loading return workspace...
      </main>
    );
  if (!booking)
    return (
      <main className="flex min-h-full items-center justify-center bg-[#f8f9f6] px-4">
        <section className="w-full max-w-lg border border-[#e6e8e4] bg-white p-6">
          <h1 className="text-xl font-semibold text-[#252a29]">Booking unavailable</h1>
          <p className="mt-2 text-sm text-[#59615e]">{error}</p>
          <Link
            to="/bookings"
            className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-[#6132DA] underline"
          >
            Back to bookings
          </Link>
        </section>
      </main>
    );

  if (savedReturn)
    return (
      <main className="min-h-full bg-[#f8f9f6] px-4 py-8 text-[#252a29] sm:px-6 print:bg-white print:px-0 print:py-0">
        <article className="mx-auto max-w-[1200px] border border-[#e6e8e4] bg-white print:border-0">
          <header className="border-b border-[#e8eae7] px-5 py-5 sm:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
              Return recorded
            </p>
            <h1 className="mt-2 font-mono text-2xl font-semibold text-[#252a29]">
              {booking.bookingNumber}
            </h1>
            <p className="mt-1 text-sm text-[#59615e]">
              {savedReturn.status === 'COMPLETED'
                ? 'All items returned. Booking completed.'
                : `${savedReturn.items.length} item(s) returned. ${remainingCount} item(s) remain with the customer.`}
            </p>
          </header>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8eae7] px-5 py-4 sm:px-8">
            <div>
              <p className="text-xs font-medium text-[#59615e]">Return status</p>
              <div className="mt-1">
                <ReturnStatusBadge status={savedReturn.returnStatus} />
                {savedReturn.daysLate > 0 && (
                  <span className="ml-2 text-xs text-amber-900">
                    {savedReturn.daysLate} days late
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-[#59615e]">Actual return</p>
              <p className="mt-1 text-sm font-semibold text-[#252a29]">
                {formatDateTime(savedReturn.returnedAt)}
              </p>
            </div>
          </div>
          <div className="divide-y divide-[#eef0ed] px-5 sm:px-8">
            {savedReturn.items.map((item) => (
              <div key={item.id} className="flex flex-wrap justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-semibold text-[#252a29]">{item.productName}</p>
                  <p className="mt-1 font-mono text-xs text-[#59615e]">{item.inventorySku}</p>
                </div>
                <span>
                  {item.condition} · {item.damageStatus}
                </span>
              </div>
            ))}
          </div>
          <footer className="flex flex-wrap justify-end gap-2 border-t border-[#e8eae7] px-5 py-4 print:hidden sm:px-8">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#dfe3df] bg-white px-4 text-sm font-semibold text-[#414846] transition hover:bg-[#f8f9f6]"
            >
              <Printer size={16} /> Print return receipt
            </button>
            <Link
              to={`/returns/${savedReturn.id}`}
              className="inline-flex min-h-10 items-center rounded-md border border-[#dfe3df] bg-white px-4 text-sm font-semibold text-[#414846] transition hover:bg-[#f8f9f6]"
            >
              View return
            </Link>
            <Link
              to={`/bookings/${booking.id}`}
              className="inline-flex min-h-10 items-center rounded-md bg-[#6132DA] px-4 text-sm font-semibold text-white transition hover:bg-[#4D25B5]"
            >
              View booking
            </Link>
          </footer>
        </article>
      </main>
    );

  if (booking.status !== 'ACTIVE' || !outstandingItems.length)
    return (
      <main className="flex min-h-full items-center justify-center bg-[#f8f9f6] px-4">
        <section className="w-full max-w-lg border border-[#e6e8e4] bg-white p-6">
          <h1 className="text-xl font-semibold text-[#252a29]">No outstanding rental items</h1>
          <p className="mt-2 text-sm text-[#59615e]">
            Only active bookings with rented items can be returned.
          </p>
          <Link
            to={`/bookings/${booking.id}`}
            className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-[#6132DA] underline"
          >
            View booking
          </Link>
        </section>
      </main>
    );

  return (
    <main className="min-h-full bg-[#f8f9f6] px-4 py-7 text-[#252a29] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-4 border border-[#e6e8e4] bg-white p-5 sm:p-6">
          <div>
            <Link
              to={`/bookings/${booking.id}`}
              className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#6132DA] transition hover:text-[#4D25B5]"
            >
              <ArrowLeft size={16} /> Booking details
            </Link>
            <h1 className="text-3xl font-semibold text-[#252a29]">Process return</h1>
          </div>
          <span className="font-mono text-sm font-semibold text-[#414846]">
            {booking.bookingNumber}
          </span>
        </header>
        {error && (
          <div
            role="alert"
            className="mb-5 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            {error}
          </div>
        )}
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="border border-[#e6e8e4] bg-white">
            <header className="border-b border-[#e8eae7] px-5 py-4">
              <h2 className="font-semibold text-[#252a29]">Items with customer</h2>
              <p className="mt-1 text-sm text-[#59615e]">
                Select the pieces physically received. Unselected items remain RENTED.
              </p>
            </header>
            <div className="divide-y divide-[#eef0ed]">
              {outstandingItems.map((item) => {
                const state = returnItems[String(item.id)] || {
                  returned: false,
                  condition: 'GOOD',
                  damageStatus: 'NONE',
                  notes: '',
                };
                return (
                  <article key={item.id} className="p-4 sm:p-5">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={state.returned}
                        onChange={(event) => updateItem(item.id, 'returned', event.target.checked)}
                        className="mt-1 size-4 accent-[#6132DA]"
                      />
                      <span>
                        <span className="block font-semibold text-[#252a29]">
                          {item.product?.name}
                        </span>
                        <span className="mt-1 block font-mono text-xs text-[#6132DA]">
                          {item.inventoryItem?.sku}
                        </span>
                        <span className="mt-1 block text-xs text-[#59615e]">
                          Size {item.inventoryItem?.size || '—'} ·{' '}
                          {item.inventoryItem?.color || '—'} · Current inventory:{' '}
                          {item.inventoryItem?.status}
                        </span>
                      </span>
                    </label>
                    {state.returned && (
                      <div className="mt-4 grid gap-3 pl-7 sm:grid-cols-2">
                        <label className="text-xs font-semibold text-[#414846]">
                          Condition
                          <select
                            value={state.condition}
                            onChange={(event) =>
                              updateItem(item.id, 'condition', event.target.value)
                            }
                            className="mt-1 min-h-10 w-full rounded-md border border-[#dfe3df] bg-white px-3 text-sm font-normal text-[#414846] outline-none focus:border-[#7046E8] focus:ring-2 focus:ring-[#7046E8]/10"
                          >
                            {returnConditions.map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs font-semibold text-[#414846]">
                          Damage status
                          <select
                            value={state.damageStatus}
                            onChange={(event) =>
                              updateItem(item.id, 'damageStatus', event.target.value)
                            }
                            className="mt-1 min-h-10 w-full rounded-md border border-[#dfe3df] bg-white px-3 text-sm font-normal text-[#414846] outline-none focus:border-[#7046E8] focus:ring-2 focus:ring-[#7046E8]/10"
                          >
                            {returnDamageStatuses.map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs font-semibold text-[#414846] sm:col-span-2">
                          Item notes
                          <textarea
                            value={state.notes}
                            onChange={(event) => updateItem(item.id, 'notes', event.target.value)}
                            rows={2}
                            maxLength={2000}
                            className="mt-1 w-full rounded-md border border-[#dfe3df] bg-white px-3 py-2 text-sm font-normal text-[#414846] outline-none focus:border-[#7046E8] focus:ring-2 focus:ring-[#7046E8]/10"
                          />
                        </label>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="border border-[#e6e8e4] bg-white p-5 xl:sticky xl:top-5">
            <p className="text-xs font-bold uppercase tracking-wide text-[#8060D9]">
              Return summary
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[#252a29]">{booking.customer?.name}</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-[#59615e]">Expected return</dt>
                <dd className="font-semibold text-[#252a29]">
                  {formatDate(booking.rentalEndDate)}
                </dd>
              </div>
              <label className="block text-[#414846]">
                Actual return date/time
                <input
                  required
                  type="datetime-local"
                  value={returnedAt}
                  onChange={(event) => setReturnedAt(event.target.value)}
                  className="mt-1 min-h-10 w-full rounded-md border border-[#dfe3df] bg-white px-3 text-sm text-[#414846] outline-none focus:border-[#7046E8] focus:ring-2 focus:ring-[#7046E8]/10"
                />
              </label>
              <div className="flex justify-between gap-3">
                <dt className="text-[#59615e]">Return status</dt>
                <dd>
                  <ReturnStatusBadge status={dateStatus.status} />
                </dd>
              </div>
              {dateStatus.daysLate > 0 && (
                <div className="flex justify-between gap-3 text-amber-900">
                  <dt>Days late</dt>
                  <dd className="font-semibold">{dateStatus.daysLate}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3 border-t border-[#e8eae7] pt-3">
                <dt className="text-[#59615e]">Items returned</dt>
                <dd className="font-semibold text-[#252a29]">
                  {selectedItems.length} / {outstandingItems.length}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#59615e]">Still with customer</dt>
                <dd className="font-semibold text-[#252a29]">{remainingCount}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#59615e]">Deposit held</dt>
                <dd className="font-semibold text-[#252a29] tabular-nums">
                  {money(booking.depositAmount)}
                </dd>
              </div>
            </dl>
            <p className="mt-4 border-t border-[#e8eae7] pt-3 text-xs leading-5 text-[#59615e]">
              Returned pieces move to inspection. Damage and late fees are recorded as zero; no
              deposit is refunded here.
            </p>
            <label className="mt-4 block text-sm font-semibold text-[#414846]">
              Return notes
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={2}
                maxLength={5000}
                className="mt-1 w-full rounded-md border border-[#dfe3df] bg-white px-3 py-2 text-sm font-normal text-[#414846] outline-none focus:border-[#7046E8] focus:ring-2 focus:ring-[#7046E8]/10"
              />
            </label>
            <button
              type="button"
              disabled={!selectedItems.length || saving}
              onClick={() => setConfirming(true)}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#6132DA] px-4 text-sm font-semibold text-white transition hover:bg-[#4D25B5] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}
              {remainingCount > 0 ? 'Save partial return' : 'Complete return'}
            </button>
          </aside>
        </div>
        {confirming && (
          <div
            className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-0 sm:place-items-center sm:p-5"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !saving) setConfirming(false);
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-return-title"
              className="w-full rounded-sm border border-[#e6e8e4] bg-white p-5 sm:max-w-lg"
            >
              <h2 id="confirm-return-title" className="text-lg font-semibold">
                Confirm return?
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#59615e]">
                {remainingCount > 0
                  ? `${selectedItems.length} items will be recorded. ${remainingCount} items remain with the customer; the booking stays ACTIVE.`
                  : 'All outstanding items will be recorded and moved to inspection. The booking will become COMPLETED.'}
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setConfirming(false)}
                  className="min-h-10 rounded-md border border-[#dfe3df] bg-white px-4 text-sm font-semibold text-[#414846] transition hover:bg-[#f8f9f6]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={submitReturn}
                  className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#6132DA] px-4 text-sm font-semibold text-white transition hover:bg-[#4D25B5] disabled:opacity-50"
                >
                  {saving ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  Confirm return
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

export default ReturnWorkspacePage;
