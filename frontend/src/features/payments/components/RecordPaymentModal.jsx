import { useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Check, LoaderCircle, X } from 'lucide-react';
import { paymentService } from '../services/payment.service';
import { paymentMethods, paymentTypes } from '../utils/paymentStatus';

const localToday = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const toCents = (value) => {
  const match = String(value || '').match(/^(\d+)(?:\.(\d{1,2}))?$/);
  return match ? Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0')) : null;
};

const fromCents = (value) => (value / 100).toFixed(2);
const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

function RecordPaymentModal({ booking, summary, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState('RENTAL');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [transactionDate, setTransactionDate] = useState(localToday());
  const [notes, setNotes] = useState('');
  const [payment, setPayment] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const enteredCents = toCents(amount);
  const remainingCents = toCents(summary.balanceAmount) ?? 0;
  const afterCents =
    enteredCents === null ? remainingCents : Math.max(remainingCents - enteredCents, 0);
  const amountValid = enteredCents !== null && enteredCents > 0 && enteredCents <= remainingCents;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!amountValid || !transactionDate) {
      setError(
        `Payment must be greater than zero and cannot exceed the remaining balance of ${money(summary.balanceAmount)}.`,
      );
      return;
    }
    setSaving(true);
    try {
      const response = await paymentService.createPayment({
        bookingId: booking.id,
        amount: fromCents(enteredCents),
        paymentType,
        paymentMethod,
        transactionDate,
        notes,
      });
      const created = response.data.data;
      setPayment(created);
      onSuccess(created);
    } catch (requestError) {
      setError(
        requestError.response?.data?.error?.details?.remainingBalance
          ? `This booking has already received a payment. Refresh the payment summary; the remaining balance is ${money(requestError.response.data.error.details.remainingBalance)}.`
          : requestError.response?.data?.message || 'Unable to record this payment.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-0 sm:place-items-center sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-payment-title"
        className="max-h-[94vh] w-full overflow-y-auto rounded-sm border border-[#e6e8e4] bg-[#f8f9f6] sm:max-w-xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#e8eae7] bg-white px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#8060D9]">
              {booking.bookingNumber}
            </p>
            <h2 id="record-payment-title" className="mt-1 text-xl font-semibold text-[#252a29]">
              {payment ? 'Payment recorded' : 'Record payment'}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close payment dialog"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-md border border-[#dfe3df] text-[#414846] transition hover:bg-[#f8f9f6]"
          >
            <X size={17} />
          </button>
        </header>

        {payment ? (
          <div className="p-5 sm:p-6">
            <div className="border border-emerald-300 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 font-semibold text-emerald-900">
                <Check size={18} /> Payment successful
              </div>
              <p className="mt-2 text-sm text-emerald-900">
                {money(payment.amount)} recorded for {booking.customer?.name}.
              </p>
            </div>
            <dl className="mt-5 grid gap-3 border-y border-[#e8eae7] py-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[#59615e]">Payment reference</dt>
                <dd className="mt-1 font-mono font-semibold text-[#252a29]">
                  {payment.paymentReference}
                </dd>
              </div>
              <div>
                <dt className="text-[#59615e]">Method</dt>
                <dd className="mt-1 font-semibold text-[#252a29]">{payment.paymentMethod}</dd>
              </div>
              <div>
                <dt className="text-[#59615e]">Booking</dt>
                <dd className="mt-1 font-mono font-semibold text-[#252a29]">
                  {booking.bookingNumber}
                </dd>
              </div>
              <div>
                <dt className="text-[#59615e]">Remaining balance</dt>
                <dd className="mt-1 font-semibold text-[#252a29] tabular-nums">
                  {money(payment.bookingPaymentSummary?.balanceAmount)}
                </dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Link
                to={`/payments/${payment.id}`}
                onClick={onClose}
                className="inline-flex min-h-10 items-center rounded-md border border-[#dfe3df] bg-white px-3 text-sm font-semibold text-[#414846] transition hover:bg-[#f8f9f6]"
              >
                View / print receipt
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="min-h-10 rounded-md bg-[#6132DA] px-4 text-sm font-semibold text-white transition hover:bg-[#4D25B5]"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="p-5 sm:p-6">
            <div className="grid grid-cols-2 gap-px border border-[#e6e8e4] bg-[#e6e8e4]">
              {[
                ['Rental', summary.rentalAmount],
                ['Deposit', summary.depositAmount],
                ['Total payable', summary.bookingTotal],
                ['Already paid', summary.netPaid],
              ].map(([label, value]) => (
                <div key={label} className="bg-white p-3">
                  <p className="text-xs text-[#59615e]">{label}</p>
                  <p className="mt-1 font-semibold text-[#252a29] tabular-nums">{money(value)}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-[#252a29]">
                Amount
                <input
                  required
                  type="number"
                  min="0.01"
                  max={summary.balanceAmount}
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="mt-1 min-h-11 w-full rounded-md border border-[#dfe3df] bg-white px-3 font-normal text-[#252a29] tabular-nums outline-none focus:border-[#7046E8] focus:ring-2 focus:ring-[#7046E8]/10"
                  placeholder="0.00"
                />
              </label>
              <label className="text-sm font-semibold text-[#252a29]">
                Payment type
                <select
                  required
                  value={paymentType}
                  onChange={(event) => setPaymentType(event.target.value)}
                  className="mt-1 min-h-11 w-full rounded-md border border-[#dfe3df] bg-white px-3 font-normal text-[#414846] outline-none focus:border-[#7046E8] focus:ring-2 focus:ring-[#7046E8]/10"
                >
                  {paymentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-[#252a29]">
                Method
                <select
                  required
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  className="mt-1 min-h-11 w-full rounded-md border border-[#dfe3df] bg-white px-3 font-normal text-[#414846] outline-none focus:border-[#7046E8] focus:ring-2 focus:ring-[#7046E8]/10"
                >
                  {paymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {method.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-[#252a29]">
                Transaction date
                <input
                  required
                  type="date"
                  value={transactionDate}
                  onChange={(event) => setTransactionDate(event.target.value)}
                  className="mt-1 min-h-11 w-full rounded-md border border-[#dfe3df] bg-white px-3 font-normal text-[#414846] outline-none focus:border-[#7046E8] focus:ring-2 focus:ring-[#7046E8]/10"
                />
              </label>
            </div>
            <label className="mt-4 block text-sm font-semibold text-[#252a29]">
              Notes <span className="font-normal text-[#59615e]">(optional)</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={2000}
                rows={2}
                className="mt-1 w-full rounded-md border border-[#dfe3df] bg-white px-3 py-2 font-normal text-[#414846] outline-none focus:border-[#7046E8] focus:ring-2 focus:ring-[#7046E8]/10"
              />
            </label>
            <div
              className={`mt-4 flex items-center justify-between border px-3 py-3 text-sm ${enteredCents !== null && enteredCents > remainingCents ? 'border-rose-300 bg-rose-50 text-rose-900' : 'border-[#e6e8e4] bg-white text-[#414846]'}`}
            >
              <span>Balance after payment</span>
              <strong className="tabular-nums">{money(fromCents(afterCents))}</strong>
            </div>
            {error && (
              <p role="alert" className="mt-3 text-sm text-rose-800">
                {error}
              </p>
            )}
            <footer className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="min-h-10 rounded-md border border-[#dfe3df] bg-white px-4 text-sm font-semibold text-[#414846] transition hover:bg-[#f8f9f6]"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={saving || !amountValid}
                className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#6132DA] px-4 text-sm font-semibold text-white transition hover:bg-[#4D25B5] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}
                {saving ? 'Recording payment...' : 'Record payment'}
              </button>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}

export default RecordPaymentModal;

RecordPaymentModal.propTypes = {
  booking: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    bookingNumber: PropTypes.string.isRequired,
    customer: PropTypes.shape({ name: PropTypes.string }),
  }).isRequired,
  summary: PropTypes.shape({
    balanceAmount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    rentalAmount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    depositAmount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    bookingTotal: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    netPaid: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
};
