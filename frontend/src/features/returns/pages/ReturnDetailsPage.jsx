import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext.jsx';
import { bookingService } from '../../bookings/services/booking.service';
import ReturnStatusBadge from '../components/ReturnStatusBadge.jsx';
import { returnService } from '../services/return.service';

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'long',
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

function ReturnDetailsPage() {
  const { id } = useParams();
  const { shop } = useAuth();
  const [returnRecord, setReturnRecord] = useState(null);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    returnService
      .getReturn(id)
      .then(async (response) => {
        if (!active) return;
        const record = response.data.data;
        setReturnRecord(record);
        try {
          const bookingResponse = await bookingService.getBooking(record.bookingId);
          if (active) setBooking(bookingResponse.data.data);
        } catch {
          if (active) setBooking(null);
        }
        setError('');
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load this return.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading)
    return (
      <main className="flex min-h-full items-center justify-center bg-[#f8f9f6] text-sm text-[#59615e]">
        Loading return receipt...
      </main>
    );
  if (!returnRecord)
    return (
      <main className="flex min-h-full items-center justify-center bg-[#f8f9f6] px-4">
        <section className="w-full max-w-lg border border-[#e6e8e4] bg-white p-6">
          <h1 className="text-xl font-semibold text-[#252a29]">Return unavailable</h1>
          <p className="mt-2 text-sm text-[#59615e]">{error}</p>
          <Link
            to="/returns"
            className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-[#68404b] underline"
          >
            Back to returns
          </Link>
        </section>
      </main>
    );

  return (
    <main className="min-h-full bg-[#f8f9f6] px-4 py-7 text-[#252a29] sm:px-6 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-[1200px] space-y-5">
        <header className="flex flex-col gap-4 border border-[#e6e8e4] bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 print:hidden">
          <div>
            <Link
              to="/returns"
              className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#68404b] transition hover:text-[#54333d]"
            >
              <ArrowLeft size={16} /> Returns
            </Link>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a5360]">
              Return receipt
            </p>
            <h1 className="mt-1 font-mono text-2xl font-semibold text-[#252a29]">
              RT-{String(returnRecord.id).padStart(5, '0')}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#dfe3df] bg-white px-4 text-sm font-semibold text-[#414846] transition hover:bg-[#f8f9f6]"
          >
            <Printer size={16} /> Print return receipt
          </button>
        </header>
        {error && (
          <div
            role="alert"
            className="mb-4 border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 print:hidden"
          >
            {error}
          </div>
        )}
        <article className="border border-[#e6e8e4] bg-white print:border-0">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e8eae7] px-5 py-5 sm:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a5360]">
                {shop?.name || 'Rental shop'}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#252a29]">Return receipt</h2>
              <Link
                to={`/bookings/${returnRecord.bookingId}`}
                className="mt-1 inline-flex font-mono text-sm font-semibold text-[#68404b] underline underline-offset-4"
              >
                {returnRecord.bookingNumber}
              </Link>
            </div>
            <div className="text-right">
              <ReturnStatusBadge status={returnRecord.returnStatus} />
              <p className="mt-2 text-xs text-[#59615e]">
                {returnRecord.daysLate > 0
                  ? `${returnRecord.daysLate} days late`
                  : 'Returned on time'}
              </p>
            </div>
          </header>
          <div className="grid gap-px border-b border-[#e8eae7] bg-[#e6e8e4] sm:grid-cols-2">
            <section className="bg-white px-5 py-4 sm:px-8">
              <p className="text-xs font-medium text-[#59615e]">Customer</p>
              <p className="mt-1 font-semibold text-[#252a29]">{returnRecord.customer?.name}</p>
              <p className="mt-1 text-sm text-[#59615e]">{returnRecord.customer?.phone || '—'}</p>
            </section>
            <section className="bg-white px-5 py-4 sm:px-8">
              <p className="text-xs font-medium text-[#59615e]">Received at</p>
              <p className="mt-1 font-semibold text-[#252a29]">
                {formatDateTime(returnRecord.returnedAt)}
              </p>
              <p className="mt-1 text-xs text-[#59615e]">
                Received by user {returnRecord.receivedBy || '—'}
              </p>
            </section>
          </div>
          <div className="grid gap-px border-b border-[#e8eae7] bg-[#e6e8e4] sm:grid-cols-2">
            <div className="bg-white px-5 py-4 sm:px-8">
              <p className="text-xs font-medium text-[#59615e]">Expected return</p>
              <p className="mt-1 font-semibold text-[#252a29]">
                {formatDate(returnRecord.expectedReturnDate)}
              </p>
            </div>
            <div className="bg-white px-5 py-4 sm:px-8">
              <p className="text-xs font-medium text-[#59615e]">Booking progress</p>
              <p className="mt-1 font-semibold text-[#252a29]">
                {returnRecord.status === 'COMPLETED'
                  ? 'All booking items returned'
                  : `${returnRecord.items.length} items received; booking remains active`}
              </p>
            </div>
          </div>
          <section className="px-5 py-4 sm:px-8">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[#59615e]">
              Items received
            </h3>
            <div className="mt-3 divide-y divide-[#eef0ed]">
              {returnRecord.items.map((item) => (
                <article
                  key={item.id}
                  className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <div>
                    <p className="font-semibold text-[#252a29]">{item.productName}</p>
                    <p className="mt-1 font-mono text-xs text-[#68404b]">{item.inventorySku}</p>
                    <p className="mt-1 text-xs text-[#59615e]">
                      Size {item.size || '—'} · {item.color || '—'} ·{' '}
                      {formatDateTime(item.actualReturnedAt)}
                    </p>
                    {item.notes && <p className="mt-2 text-sm text-[#414846]">{item.notes}</p>}
                  </div>
                  <div className="sm:text-right">
                    <p className="text-sm font-semibold text-[#252a29]">{item.condition}</p>
                    <p className="mt-1 text-xs text-[#414846]">
                      {item.damageStatus.replaceAll('_', ' ')} damage
                    </p>
                    <p className="mt-1 text-xs text-[#59615e]">Inventory: {item.inventoryStatus}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <dl className="grid gap-3 border-t border-[#e8eae7] bg-[#f8f9f6] px-5 py-4 text-sm sm:grid-cols-3 sm:px-8">
            <div>
              <dt className="text-xs font-medium text-[#59615e]">Late fee</dt>
              <dd className="mt-1 font-semibold text-[#252a29] tabular-nums">
                {money(returnRecord.lateFeeAmount)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[#59615e]">Damage amount</dt>
              <dd className="mt-1 font-semibold text-[#252a29] tabular-nums">
                {money(returnRecord.damageAmount)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[#59615e]">Deposit held</dt>
              <dd className="mt-1 font-semibold text-[#252a29] tabular-nums">
                {money(booking?.depositAmount)}
              </dd>
            </div>
          </dl>
          {returnRecord.notes && (
            <p className="border-t border-[#e8eae7] px-5 py-4 text-sm text-[#414846] sm:px-8">
              {returnRecord.notes}
            </p>
          )}
        </article>
      </div>
    </main>
  );
}

export default ReturnDetailsPage;
