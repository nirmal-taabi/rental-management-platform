import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, ChevronDown, Clock3, Pencil, Phone, UserRound } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext.jsx';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog';
import { paymentService } from '../../payments/services/payment.service';
import PaymentStatusBadge from '../../payments/components/PaymentStatusBadge.jsx';
import RecordPaymentModal from '../../payments/components/RecordPaymentModal.jsx';
import { returnService } from '../../returns/services/return.service';
import ReturnStatusBadge from '../../returns/components/ReturnStatusBadge.jsx';
import BookingStatusBadge from '../components/BookingStatusBadge.jsx';
import { bookingTransitions } from '../utils/bookingStatus';
import { bookingService } from '../services/booking.service';

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`))
  : '—';

const formatDateTime = (value) => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const formatMoney = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));

const actionTitle = (action) => String(action || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

const getCalendarMonths = (startDate, endDate) => {
  if (!startDate || !endDate) return [];
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const months = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (cursor <= end && months.length < 3) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const dayCount = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const days = Array.from({ length: dayCount }, (_, index) => {
      const date = new Date(Date.UTC(year, month, index + 1));
      const key = date.toISOString().slice(0, 10);
      const isRental = key >= startDate && key <= endDate;
      const bufferEnd = new Date(`${endDate}T00:00:00Z`);
      bufferEnd.setUTCDate(bufferEnd.getUTCDate() + 1);
      const isBuffer = key > endDate && date <= bufferEnd;
      return { key, day: index + 1, state: isRental ? 'rental' : isBuffer ? 'buffer' : 'available' };
    });
    months.push({
      label: new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(cursor),
      offset: cursor.getUTCDay(),
      days,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
};

function BookingDetailsPage() {
  const { id } = useParams();
  const { roles } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [cancelConfirmationOpen, setCancelConfirmationOpen] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [paymentError, setPaymentError] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(true);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [returnHistory, setReturnHistory] = useState([]);
  const [returnHistoryError, setReturnHistoryError] = useState('');
  const [returnHistoryLoading, setReturnHistoryLoading] = useState(true);

  useEffect(() => {
    let active = true;
    bookingService.getBooking(id).then((response) => {
      if (active) {
        setBooking(response.data.data);
        setError('');
      }
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.message || 'Unable to load this booking.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    let active = true;
    returnService.getBookingReturns(id).then((response) => {
      if (!active) return;
      setReturnHistory(response.data.data || []);
      setReturnHistoryError('');
    }).catch((requestError) => {
      if (active) setReturnHistoryError(requestError.response?.data?.message || 'Unable to load return history.');
    }).finally(() => { if (active) setReturnHistoryLoading(false); });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    let active = true;
    paymentService.getBookingPayments(id).then((response) => {
      if (!active) return;
      setPaymentHistory(response.data.data || []);
      setPaymentSummary(response.data.paymentSummary || null);
      setPaymentError('');
    }).catch((requestError) => {
      if (active) setPaymentError(requestError.response?.data?.message || 'Unable to load payment history.');
    }).finally(() => { if (active) setPaymentLoading(false); });
    return () => { active = false; };
  }, [id]);

  const handlePaymentRecorded = (payment) => {
    setPaymentHistory((current) => [payment, ...current]);
    setPaymentSummary(payment.bookingPaymentSummary);
    setBooking((current) => ({
      ...current,
      paidAmount: payment.bookingPaymentSummary?.netPaid,
      balanceAmount: payment.bookingPaymentSummary?.balanceAmount,
    }));
  };

  const updateStatus = async (status) => {
    setUpdating(true);
    setError('');
    try {
      const response = await bookingService.updateStatus(id, status);
      setBooking((current) => ({ ...current, ...response.data.data }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update booking status.');
    } finally {
      setUpdating(false);
    }
  };

  const cancelBooking = async () => {
    setUpdating(true);
    setError('');
    try {
      const response = await bookingService.cancel(id);
      setBooking((current) => ({ ...current, ...response.data.data }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to cancel this booking.');
    } finally {
      setUpdating(false);
      setCancelConfirmationOpen(false);
    }
  };

  if (loading) return <main className="flex min-h-full items-center justify-center bg-[#f8f9f6] text-sm text-[#59615e]">Loading booking...</main>;
  if (!booking) return <main className="flex min-h-full items-center justify-center bg-[#f8f9f6] px-4"><section className="w-full max-w-lg border border-[#e6e8e4] bg-white p-6"><h1 className="text-xl font-semibold text-[#252a29]">Booking unavailable</h1><p role="alert" className="mt-2 text-sm text-[#59615e]">{error || 'This booking could not be found.'}</p><Link to="/bookings" className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-[#6132DA] underline">Return to bookings</Link></section></main>;

  const canEdit = ['DRAFT', 'PENDING', 'CONFIRMED'].includes(booking.status);
  const canCancel = canEdit && roles.some((role) => ['OWNER', 'ADMIN'].includes(String(role).toUpperCase()));
  const availableTransitions = (bookingTransitions[booking.status] || []).filter((status) => status !== 'CANCELLED');
  const calendarMonths = getCalendarMonths(booking.rentalStartDate, booking.rentalEndDate);
  const pickupStatus = booking.pickedUpAt ? 'COMPLETED' : booking.status === 'READY' ? 'READY' : 'NOT READY';
  const returnStatus = booking.status === 'COMPLETED' ? 'COMPLETED' : returnHistory.length ? 'PARTIAL' : 'NOT RETURNED';

  return (
    <main className="min-h-full bg-[#f8f9f6] px-4 py-7 text-[#252a29] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px] space-y-5">
        <Link to="/bookings" className="inline-flex items-center gap-2 text-sm font-semibold text-[#6132DA] transition hover:text-[#4D25B5]"><ArrowLeft size={16} /> All bookings</Link>
        <header className="flex flex-col gap-4 border border-[#e6e8e4] bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8060D9]">Rental booking</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
                <h1 className="font-mono text-2xl font-semibold text-[#252a29] sm:text-3xl">{booking.bookingNumber}</h1>
                <BookingStatusBadge status={booking.status} />
            </div>
            <p className="mt-2 text-sm text-[#59615e]">Created {formatDateTime(booking.createdAt)}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
              {canEdit && <Link to={`/bookings/${booking.id}/edit`} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#dfe3df] bg-white px-3 text-sm font-semibold text-[#414846] transition hover:border-[#6132DA] hover:text-[#6132DA]"><Pencil size={15} /> Edit</Link>}
              {booking.status === 'READY' && <Link to={`/bookings/${booking.id}/pickup`} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#6132DA] px-3 text-sm font-semibold text-white hover:bg-[#4D25B5]">Confirm pickup</Link>}
              {booking.status === 'ACTIVE' && <Link to={`/bookings/${booking.id}/return`} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#6132DA] px-3 text-sm font-semibold text-white hover:bg-[#4D25B5]">Process return</Link>}
              {availableTransitions.length > 0 && <label className="relative"><span className="sr-only">Change booking status</span><select disabled={updating} value="" onChange={(event) => { if (event.target.value) updateStatus(event.target.value); }} className="min-h-10 appearance-none rounded-md border border-[#dfe3df] bg-white py-2 pl-3 pr-9 text-sm font-semibold text-[#414846] outline-none focus:border-[#7046E8] focus:ring-4 focus:ring-[#7046E8]/10"><option value="">Change status</option>{availableTransitions.map((status) => <option key={status} value={status}>{status}</option>)}</select><ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#59615e]" /></label>}
              {canCancel && <button type="button" disabled={updating} onClick={() => setCancelConfirmationOpen(true)} className="min-h-10 rounded-md border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-800 hover:bg-rose-50 disabled:opacity-50">Cancel booking</button>}
          </div>
        </header>

        {error && <div role="alert" className="mb-5 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] [&_section]:border [&_section]:border-[#e6e8e4] [&_aside]:border [&_aside]:border-[#e6e8e4]">
          <div className="space-y-5">
            <section className="grid gap-px border border-[#e6e8e4] bg-[#e6e8e4] sm:grid-cols-2">
              <div className="bg-white p-5 sm:p-6"><div className="flex items-center gap-2 text-[#6132DA]"><UserRound size={17} /><h2 className="text-xs font-bold uppercase tracking-wide">Customer</h2></div><p className="mt-3 text-lg font-semibold text-[#252a29]">{booking.customer?.name}</p><p className="mt-1 text-sm text-[#59615e]">{booking.customer?.email || 'No email provided'}</p><a href={booking.customer?.phone ? `tel:${booking.customer.phone}` : undefined} className="mt-2 inline-flex items-center gap-2 text-sm text-[#414846]"><Phone size={14} />{booking.customer?.phone || 'No phone provided'}</a></div>
              <div className="bg-white p-5 sm:p-6"><div className="flex items-center gap-2 text-[#6132DA]"><CalendarDays size={17} /><h2 className="text-xs font-bold uppercase tracking-wide">Rental period</h2></div><p className="mt-3 text-lg font-semibold text-[#252a29]">{formatDate(booking.rentalStartDate)}</p><p className="mt-1 text-sm text-[#59615e]">through {formatDate(booking.rentalEndDate)} <span className="text-[#8b928e]">· inclusive</span></p><p className="mt-3 text-xs text-[#59615e]">Items remain blocked through the cleanup buffer.</p></div>
            </section>

            <section className="border-y border-stone-300 bg-white px-5 py-5 sm:px-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-[#7956CB]">Availability calendar</p><h2 className="mt-1 font-semibold">Rental and cleanup window</h2></div><div className="flex flex-wrap gap-3 text-xs text-stone-600"><span className="inline-flex items-center gap-1.5"><span className="size-2.5 bg-[#5522BB]" /> Rental</span><span className="inline-flex items-center gap-1.5"><span className="size-2.5 bg-amber-200" /> Cleanup buffer</span><span className="inline-flex items-center gap-1.5"><span className="size-2.5 border border-stone-300 bg-white" /> Unreserved</span></div></div><div className="mt-4 grid gap-5 md:grid-cols-2">{calendarMonths.map((month) => <div key={month.label}><p className="mb-2 text-sm font-semibold">{month.label}</p><div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-stone-500">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <span key={`${day}-${index}`} className="py-1">{day}</span>)}</div><div className="grid grid-cols-7 gap-1">{Array.from({ length: month.offset }, (_, index) => <span key={`blank-${index}`} aria-hidden="true" className="aspect-square" />)}{month.days.map((day) => <span key={day.key} aria-label={`${formatDate(day.key)} ${day.state}`} className={`grid aspect-square place-items-center text-xs tabular-nums ${day.state === 'rental' ? 'bg-[#5522BB] font-bold text-white' : day.state === 'buffer' ? 'bg-amber-200 font-semibold text-amber-950' : 'bg-[#FAF8FF] text-stone-600'}`}>{day.day}</span>)}</div></div>)}</div></section>

            <section className="border-y border-stone-300 bg-white"><div className="border-b border-stone-200 px-5 py-4 sm:px-6"><p className="text-xs font-bold uppercase tracking-wide text-[#7956CB]">Lifecycle</p><h2 className="mt-1 text-lg font-semibold">Pickup and return</h2></div><div className="grid gap-px bg-stone-200 sm:grid-cols-3"><div className="bg-white px-4 py-4"><p className="text-xs uppercase tracking-wide text-stone-500">Booking</p><BookingStatusBadge status={booking.status} /></div><div className="bg-white px-4 py-4"><p className="text-xs uppercase tracking-wide text-stone-500">Pickup</p><p className="mt-1 font-semibold">{pickupStatus}</p>{booking.pickedUpAt && <p className="mt-1 text-xs text-stone-500">{formatDateTime(booking.pickedUpAt)}</p>}</div><div className="bg-white px-4 py-4"><p className="text-xs uppercase tracking-wide text-stone-500">Return</p><p className="mt-1 font-semibold">{returnStatus}</p>{booking.returnedAt && <p className="mt-1 text-xs text-stone-500">{formatDateTime(booking.returnedAt)}</p>}</div></div><div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-6"><p className="text-sm text-stone-600">{booking.status === 'ACTIVE' ? `${booking.items.filter((item) => item.status === 'ACTIVE').length} item(s) remain with the customer.` : booking.status === 'COMPLETED' ? 'All booking items have been returned.' : `Expected return ${formatDate(booking.rentalEndDate)}.`}</p>{booking.status === 'READY' && <Link to={`/bookings/${booking.id}/pickup`} className="text-sm font-semibold text-[#5522BB] underline underline-offset-4">Open pickup checklist</Link>}{booking.status === 'ACTIVE' && <Link to={`/bookings/${booking.id}/return`} className="text-sm font-semibold text-[#5522BB] underline underline-offset-4">Process returned items</Link>}</div></section>

            <section className="border-y border-stone-300 bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-5 py-4 sm:px-6"><div><p className="text-xs font-bold uppercase tracking-wide text-[#7956CB]">Physical inventory</p><h2 className="mt-1 text-lg font-semibold">{booking.items?.length || 0} selected pieces</h2></div><span className="text-sm text-stone-500">Date-based availability</span></div>
              {!booking.items?.length ? <p className="px-5 py-8 text-sm text-stone-500 sm:px-6">No physical items are attached to this booking.</p> : <div className="divide-y divide-stone-200">{booking.items.map((item) => <article key={item.id} className="grid gap-4 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"><div className="min-w-0"><p className="font-semibold">{item.product?.name}</p><p className="mt-1 font-mono text-xs text-stone-500">{item.product?.sku}</p><div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"><span className="font-mono font-semibold text-[#5522BB]">{item.inventoryItem?.sku || 'Physical item unavailable'}</span><span className="text-stone-500">Size {item.inventoryItem?.size || '—'} · {item.inventoryItem?.color || '—'}</span><span className="text-stone-500">{item.inventoryItem?.condition || '—'}</span></div><p className="mt-2 text-xs text-stone-500">Current inventory status: {item.inventoryItem?.status || 'Unknown'}</p></div><div className="sm:text-right"><p className="font-semibold tabular-nums">{formatMoney(item.totalAmount)}</p><p className="mt-1 text-xs text-stone-500">Rental {formatMoney(item.rentalPrice)} · deposit {formatMoney(item.depositAmount)}</p>{Number(item.discountAmount) > 0 && <p className="mt-1 text-xs text-stone-500">Discount {formatMoney(item.discountAmount)}</p>}</div></article>)}</div>}
            </section>

            <section className="border-y border-stone-300 bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-5 py-4 sm:px-6"><div><p className="text-xs font-bold uppercase tracking-wide text-[#7956CB]">Return history</p><h2 className="mt-1 text-lg font-semibold">Items received</h2></div><Link to="/returns" className="text-sm font-semibold text-[#5522BB] underline underline-offset-4">All returns</Link></div>{returnHistoryError && <p role="alert" className="m-4 border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{returnHistoryError}</p>}{returnHistoryLoading ? <p className="px-5 py-5 text-sm text-stone-500 sm:px-6">Loading return history...</p> : returnHistory.length ? <div className="divide-y divide-stone-200">{returnHistory.map((entry) => <Link key={entry.id} to={`/returns/${entry.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-[#FAF8FF] sm:px-6"><div><p className="font-mono text-sm font-semibold text-[#5522BB]">RT-{String(entry.id).padStart(5, '0')}</p><p className="mt-1 text-xs text-stone-500">{formatDateTime(entry.returnedAt)} · {entry.itemCount || entry.items?.length || 0} item(s)</p></div><div className="flex items-center gap-2"><ReturnStatusBadge status={entry.returnStatus} />{entry.daysLate > 0 && <span className="text-xs text-amber-900">{entry.daysLate}d late</span>}</div></Link>)}</div> : <p className="px-5 py-5 text-sm text-stone-500 sm:px-6">No items have been returned yet.</p>}{booking.status === 'ACTIVE' && <div className="border-t border-stone-200 px-5 py-4 sm:px-6"><Link to={`/bookings/${booking.id}/return`} className="inline-flex min-h-10 items-center bg-[#5522BB] px-4 text-sm font-semibold text-white">Process return</Link></div>}</section>

            <section className="border-y border-stone-300 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-5 py-4 sm:px-6"><div><h2 className="text-lg font-semibold">Payments and balance</h2></div>{paymentSummary && <PaymentStatusBadge status={paymentSummary.paymentStatus} />}</div>
              {paymentError && <div role="alert" className="m-4 border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{paymentError}</div>}
              <div className="grid gap-px border-b border-stone-200 bg-stone-200 sm:grid-cols-5">{[
                ['Rental', paymentSummary?.rentalAmount ?? booking.totalAmount],
                ['Deposit', paymentSummary?.depositAmount ?? booking.depositAmount],
                ['Total payable', paymentSummary?.bookingTotal ?? Number(booking.totalAmount || 0) + Number(booking.depositAmount || 0)],
                ['Paid', paymentSummary?.netPaid ?? booking.paidAmount],
                ['Balance', paymentSummary?.balanceAmount ?? booking.balanceAmount],
              ].map(([label, value]) => <div key={label} className="bg-white px-4 py-3"><p className="text-xs text-stone-500">{label}</p><p className="mt-1 font-semibold tabular-nums">{formatMoney(value)}</p></div>)}</div>
              {paymentLoading ? <p className="px-5 py-5 text-sm text-stone-500 sm:px-6">Loading payment history...</p> : paymentHistory.length ? <div className="divide-y divide-stone-200">{paymentHistory.map((payment) => <Link key={payment.id} to={`/payments/${payment.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-[#FAF8FF] sm:px-6"><div><p className="font-mono text-sm font-semibold text-[#5522BB]">{payment.paymentReference}</p><p className="mt-1 text-xs text-stone-500">{payment.paymentType.replaceAll('_', ' ')} · {payment.paymentMethod.replaceAll('_', ' ')} · {formatDate(payment.transactionDate)}</p></div><div className="flex items-center gap-3"><span className="font-semibold tabular-nums">{formatMoney(payment.amount)}</span><PaymentStatusBadge status={payment.status} /></div></Link>)}</div> : <p className="px-5 py-5 text-sm text-stone-500 sm:px-6">No payment transactions recorded.</p>}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-5 py-4 sm:px-6"><p className="text-xs text-stone-500">Rental and refundable deposit remain separate.</p><button type="button" disabled={!paymentSummary || Number(paymentSummary.balanceAmount) <= 0} onClick={() => setRecordingPayment(true)} className="min-h-10 bg-[#5522BB] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">Record payment</button></div>
            </section>

            <section className="border-y border-stone-300 bg-white px-5 py-5 sm:px-6"><div className="flex items-center gap-2"><Clock3 size={17} className="text-[#7956CB]" /><h2 className="font-semibold">Activity</h2></div>{booking.activity?.length ? <ol className="mt-4 space-y-4 border-l border-stone-300 pl-4">{booking.activity.map((entry, index) => <li key={`${entry.createdAt}-${index}`} className="relative"><span className="absolute -left-[21px] top-1.5 size-2 border border-[#5522BB] bg-white" /><p className="text-sm font-semibold">{actionTitle(entry.action)}</p><p className="mt-1 text-xs text-stone-500">{formatDateTime(entry.createdAt)}{entry.userId ? ` · User ${entry.userId}` : ''}</p></li>)}</ol> : <p className="mt-3 text-sm text-stone-500">No activity recorded.</p>}{booking.notes && <div className="mt-5 border-t border-stone-200 pt-4"><h3 className="text-xs font-bold uppercase tracking-wide text-stone-500">Notes</h3><p className="mt-2 whitespace-pre-wrap text-sm">{booking.notes}</p></div>}</section>
          </div>

          <aside className="border-y border-stone-300 bg-white p-5 sm:p-6 lg:sticky lg:top-5"><p className="text-xs font-bold uppercase tracking-wide text-[#7956CB]">Price summary</p><h2 className="mt-1 text-lg font-semibold">Rental charges</h2><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-3"><dt className="text-stone-600">Subtotal</dt><dd className="font-medium tabular-nums">{formatMoney(booking.subtotal)}</dd></div><div className="flex justify-between gap-3"><dt className="text-stone-600">Discount</dt><dd className="font-medium tabular-nums">−{formatMoney(booking.discountAmount)}</dd></div><div className="flex justify-between gap-3"><dt className="text-stone-600">Tax</dt><dd className="font-medium tabular-nums">{formatMoney(booking.taxAmount)}</dd></div><div className="flex justify-between gap-3 border-t border-stone-200 pt-3 text-base font-semibold"><dt>Rental total</dt><dd className="tabular-nums">{formatMoney(booking.totalAmount)}</dd></div><div className="flex justify-between gap-3"><dt className="text-stone-600">Deposit</dt><dd className="font-medium tabular-nums">{formatMoney(booking.depositAmount)}</dd></div><div className="flex justify-between gap-3 border-t border-stone-300 pt-3 text-base font-semibold"><dt>Paid</dt><dd className="tabular-nums">{formatMoney(booking.paidAmount)}</dd></div><div className="flex justify-between gap-3 text-base font-semibold text-[#5522BB]"><dt>Balance due</dt><dd className="tabular-nums">{formatMoney(booking.balanceAmount)}</dd></div></dl><p className="mt-5 border-t border-stone-200 pt-4 text-xs leading-5 text-stone-500">Deposit remains held through return inspection; returns do not issue refunds.</p></aside>
        </div>
      </div>
      <ConfirmationDialog
        isOpen={cancelConfirmationOpen}
        title="Cancel booking?"
        message={`Cancel ${booking.bookingNumber}? This will release its physical items for other dates.`}
        confirmLabel="Cancel booking"
        isConfirming={updating}
        destructive
        onCancel={() => setCancelConfirmationOpen(false)}
        onConfirm={cancelBooking}
      />
      {recordingPayment && paymentSummary && <RecordPaymentModal booking={booking} summary={paymentSummary} onClose={() => setRecordingPayment(false)} onSuccess={handlePaymentRecorded} />}
    </main>
  );
}

export default BookingDetailsPage;