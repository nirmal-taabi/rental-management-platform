import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, LoaderCircle, Printer, X } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext.jsx';
import PaymentStatusBadge from '../components/PaymentStatusBadge.jsx';
import { paymentService } from '../services/payment.service';

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

function PaymentDetailsPage() {
  const { id } = useParams();
  const { roles } = useAuth();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    paymentService
      .getPayment(id)
      .then((response) => {
        if (active) {
          setPayment(response.data.data);
          setError('');
        }
      })
      .catch((requestError) => {
        if (active)
          setError(requestError.response?.data?.message || 'Unable to load this payment.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const cancelPayment = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await paymentService.cancelPayment(id, reason);
      setPayment(response.data.data);
      setCancelOpen(false);
      setReason('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to cancel this payment.');
    } finally {
      setSaving(false);
    }
  };

  const updatePendingStatus = async (status) => {
    setSaving(true);
    setError('');
    try {
      const response = await paymentService.updateStatus(id, status);
      setPayment(response.data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update payment status.');
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <main className="flex min-h-full items-center justify-center bg-[#f8f9f6] text-sm text-[#59615e]">
        Loading receipt...
      </main>
    );
  if (!payment)
    return (
      <main className="flex min-h-full items-center justify-center bg-[#f8f9f6] px-4">
        <section className="w-full max-w-lg border border-[#e6e8e4] bg-white p-6">
          <h1 className="text-xl font-semibold text-[#252a29]">Payment unavailable</h1>
          <p className="mt-2 text-sm text-[#59615e]">
            {error || 'This payment could not be found.'}
          </p>
          <Link
            to="/payments"
            className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-[#68404b] underline"
          >
            Return to payments
          </Link>
        </section>
      </main>
    );

  const canManage = roles.some((role) => ['OWNER', 'ADMIN'].includes(String(role).toUpperCase()));
  const canCancel = canManage && ['SUCCESS', 'PENDING'].includes(payment.status);

  return (
    <main className="min-h-full bg-[#f8f9f6] px-4 py-7 text-[#252a29] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px] space-y-5">
        <header className="flex flex-col gap-4 border border-[#e6e8e4] bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 print:hidden">
          <div>
            <Link
              to="/payments"
              className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#68404b] transition hover:text-[#54333d]"
            >
              <ArrowLeft size={16} /> Payments
            </Link>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a5360]">
              Payment receipt
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="font-mono text-2xl font-semibold text-[#252a29]">
                {payment.paymentReference}
              </h1>
              <PaymentStatusBadge status={payment.status} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#dfe3df] bg-white px-3 text-sm font-semibold text-[#414846] transition hover:bg-[#f8f9f6]"
            >
              <Printer size={16} /> Print receipt
            </button>
            {payment.status === 'PENDING' && canManage && (
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => updatePendingStatus('SUCCESS')}
                  className="min-h-10 rounded-md border border-emerald-300 bg-white px-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
                >
                  Mark successful
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => updatePendingStatus('FAILED')}
                  className="min-h-10 rounded-md border border-rose-300 bg-white px-3 text-sm font-semibold text-rose-800 transition hover:bg-rose-50"
                >
                  Mark failed
                </button>
              </div>
            )}
            {canCancel && (
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                className="min-h-10 rounded-md border border-rose-300 bg-white px-3 text-sm font-semibold text-rose-800 transition hover:bg-rose-50"
              >
                Cancel payment
              </button>
            )}
          </div>
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
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e8eae7] px-5 py-5 sm:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#8a5360]">
                Rental management
              </p>
              <h2 className="mt-2 text-xl font-semibold">Payment receipt</h2>
              <p className="mt-1 text-sm text-[#59615e]">{payment.paymentReference}</p>
            </div>
            <div className="text-right">
              <PaymentStatusBadge status={payment.status} />
              <p className="mt-3 text-2xl font-semibold text-[#252a29] tabular-nums">
                {money(payment.amount)}
              </p>
              <p className="mt-1 text-xs text-[#59615e]">
                {payment.paymentType.replaceAll('_', ' ')}
              </p>
            </div>
          </div>
          <div className="grid gap-px border-b border-[#e8eae7] bg-[#e6e8e4] sm:grid-cols-2">
            <section className="bg-white px-5 py-5 sm:px-8">
              <h3 className="text-xs font-bold uppercase tracking-wide text-[#59615e]">Customer</h3>
              <p className="mt-2 font-semibold text-[#252a29]">
                {payment.customer?.name || 'Customer'}
              </p>
              <p className="mt-1 text-sm text-[#59615e]">{payment.customer?.phone || '—'}</p>
              <p className="text-sm text-[#59615e]">{payment.customer?.email || ''}</p>
            </section>
            <section className="bg-white px-5 py-5 sm:px-8">
              <h3 className="text-xs font-bold uppercase tracking-wide text-[#59615e]">Booking</h3>
              {payment.bookingId ? (
                <Link
                  to={`/bookings/${payment.bookingId}`}
                  className="mt-2 inline-flex font-mono font-semibold text-[#68404b] underline underline-offset-4"
                >
                  {payment.bookingNumber}
                </Link>
              ) : (
                <p className="mt-2 text-sm text-[#59615e]">Legacy unlinked payment</p>
              )}
              <p className="mt-2 text-sm text-[#59615e]">
                Method: {payment.paymentMethod.replaceAll('_', ' ')}
              </p>
            </section>
          </div>
          <dl className="grid gap-x-8 gap-y-5 px-5 py-5 sm:grid-cols-2 sm:px-8">
            <div>
              <dt className="text-xs font-medium text-[#59615e]">Transaction date</dt>
              <dd className="mt-1 text-sm font-semibold text-[#252a29]">
                {formatDate(payment.transactionDate)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[#59615e]">Recorded at</dt>
              <dd className="mt-1 text-sm font-semibold text-[#252a29]">
                {formatDateTime(payment.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[#59615e]">Recorded by</dt>
              <dd className="mt-1 text-sm font-semibold text-[#252a29]">
                {payment.createdBy ? `User ${payment.createdBy}` : 'System'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[#59615e]">Payment type</dt>
              <dd className="mt-1 text-sm font-semibold text-[#252a29]">
                {payment.paymentType.replaceAll('_', ' ')}
              </dd>
            </div>
            {payment.notes && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-[#59615e]">Notes</dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-[#414846]">{payment.notes}</dd>
              </div>
            )}
            {payment.cancellationReason && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-bold uppercase tracking-wide text-rose-700">
                  Cancellation reason
                </dt>
                <dd className="mt-1 text-sm text-[#414846]">{payment.cancellationReason}</dd>
              </div>
            )}
          </dl>
          {payment.bookingPaymentSummary && (
            <footer className="border-t border-[#e8eae7] bg-[#f8f9f6] px-5 py-4 sm:px-8">
              <div className="flex flex-wrap justify-between gap-3 text-sm">
                <span className="text-[#59615e]">Booking paid to date</span>
                <strong className="text-[#252a29] tabular-nums">
                  {money(payment.bookingPaymentSummary.netPaid)}
                </strong>
                <span className="text-[#59615e]">Remaining balance</span>
                <strong className="text-[#252a29] tabular-nums">
                  {money(payment.bookingPaymentSummary.balanceAmount)}
                </strong>
              </div>
            </footer>
          )}
        </article>
      </div>

      {cancelOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-0 sm:place-items-center sm:p-5 print:hidden"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) setCancelOpen(false);
          }}
        >
          <form
            onSubmit={cancelPayment}
            className="w-full rounded-sm border border-[#e6e8e4] bg-white p-5 sm:max-w-lg"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-rose-700">
                  Financial reversal
                </p>
                <h2 className="mt-1 text-lg font-semibold">Cancel payment</h2>
              </div>
              <button
                type="button"
                onClick={() => setCancelOpen(false)}
                aria-label="Close cancellation dialog"
                className="grid size-9 place-items-center rounded-md border border-[#dfe3df] text-[#414846] transition hover:bg-[#f8f9f6]"
              >
                <X size={17} />
              </button>
            </div>
            <p className="mt-3 text-sm text-[#59615e]">
              This preserves the transaction and recalculates the booking balance.
            </p>
            <label className="mt-4 block text-sm font-semibold">
              Reason
              <textarea
                required
                minLength={3}
                maxLength={500}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-[#dfe3df] bg-white px-3 py-2 font-normal text-[#252a29] outline-none focus:border-[#805361] focus:ring-2 focus:ring-[#805361]/10"
              />
            </label>
            {error && (
              <p role="alert" className="mt-3 text-sm text-rose-800">
                {error}
              </p>
            )}
            <footer className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setCancelOpen(false)}
                className="min-h-10 rounded-md border border-[#dfe3df] bg-white px-4 text-sm font-semibold text-[#414846] transition hover:bg-[#f8f9f6]"
              >
                Keep payment
              </button>
              <button
                type="submit"
                disabled={saving || reason.trim().length < 3}
                className="inline-flex min-h-10 items-center gap-2 rounded-md bg-rose-800 px-4 text-sm font-semibold text-white transition hover:bg-rose-900 disabled:opacity-45"
              >
                {saving ? <LoaderCircle size={16} className="animate-spin" /> : <X size={16} />}
                Confirm cancellation
              </button>
            </footer>
          </form>
        </div>
      )}
    </main>
  );
}

export default PaymentDetailsPage;
