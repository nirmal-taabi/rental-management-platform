import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Mail, MapPin, Pencil, Phone } from 'lucide-react';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog';
import { useAuth } from '../../auth/context/AuthContext.jsx';
import { paymentService } from '../../payments/services/payment.service';
import PaymentStatusBadge from '../../payments/components/PaymentStatusBadge.jsx';
import { bookingService } from '../../bookings/services/booking.service';
import { returnService } from '../../returns/services/return.service';
import { customerService } from '../services/customer.service';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

function CustomerDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { roles } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeactivateConfirmationOpen, setIsDeactivateConfirmationOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [paymentData, setPaymentData] = useState({ data: [], summary: null, loading: true, error: '' });
  const [rentalData, setRentalData] = useState({ active: [], returns: [], loading: true, error: '' });

  useEffect(() => {
    let active = true;
    customerService.getCustomer(id).then((response) => {
      if (!active) return;
      setCustomer(response?.data?.data || null);
      setError('');
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.message || 'Unable to load customer details.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    let active = true;
    Promise.all([
      bookingService.getBookings({ page: 1, limit: 5, customerId: id, status: 'ACTIVE', sortBy: 'rentalStartDate', sortOrder: 'asc' }),
      returnService.getReturns({ page: 1, limit: 5, customerId: id, sortBy: 'returnDate', sortOrder: 'desc' }),
    ]).then(([bookingsResponse, returnsResponse]) => {
      if (active) setRentalData({ active: bookingsResponse.data.data || [], returns: returnsResponse.data.data || [], loading: false, error: '' });
    }).catch((requestError) => {
      if (active) setRentalData((current) => ({ ...current, loading: false, error: requestError.response?.data?.message || 'Unable to load rental activity.' }));
    });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    let active = true;
    paymentService.getCustomerPayments(id, { page: 1, limit: 5 }).then((response) => {
      if (active) setPaymentData({ data: response.data.data || [], summary: response.data.summary || null, loading: false, error: '' });
    }).catch((requestError) => {
      if (active) setPaymentData((current) => ({ ...current, loading: false, error: requestError.response?.data?.message || 'Unable to load payment history.' }));
    });
    return () => { active = false; };
  }, [id]);

  const handleStatusToggle = async () => {
    if (!customer) return;
    if (customer.status === 'ACTIVE') {
      setIsDeactivateConfirmationOpen(true);
      return;
    }

    try {
      await customerService.updateCustomerStatus(customer.id, 'ACTIVE');
      const response = await customerService.getCustomer(customer.id);
      setCustomer(response?.data?.data || null);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update customer status.');
    }
  };

  const confirmDeactivateCustomer = async () => {
    if (!customer) return;
    setIsUpdatingStatus(true);
    try {
      await customerService.updateCustomerStatus(customer.id, 'INACTIVE');
      const response = await customerService.getCustomer(customer.id);
      setCustomer(response?.data?.data || null);
      setIsDeactivateConfirmationOpen(false);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update customer status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (loading || (customer && String(customer.id) !== String(id))) {
    return <main className="flex min-h-full items-center justify-center bg-[#f8f9f6] px-4 py-12 text-sm text-[#59615e]">Loading customer profile...</main>;
  }

  if (error) {
    return (
      <main className="flex min-h-full items-center justify-center bg-[#f8f9f6] px-4 py-12">
        <div className="w-full max-w-md border border-[#e6e8e4] bg-white p-6">
          <p className="text-lg font-semibold text-[#252a29]">Unable to load customer</p>
          <p className="mt-2 text-sm text-[#59615e]">{error}</p>
          <button type="button" onClick={() => navigate('/customers')} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md bg-[#6132DA] px-4 text-sm font-semibold text-white transition hover:bg-[#4D25B5]">
            <ArrowLeft size={15} /> Back to customers
          </button>
        </div>
      </main>
    );
  }

  if (!customer) return null;

  const canToggleStatus = roles.some((role) => ['OWNER', 'ADMIN'].includes(String(role).toUpperCase()));
  const customerInitials = `${customer.firstName?.trim()?.charAt(0) || ''}${customer.lastName?.trim()?.charAt(0) || ''}`.toUpperCase();
  const customerLocation = [customer.city, customer.state].filter(Boolean).join(', ');

  return (
    <>
    <main className="min-h-full bg-[#f8f9f6] px-4 py-7 text-[#252a29] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px] space-y-6">
        <Link to="/customers" className="inline-flex items-center gap-2 text-sm font-semibold text-[#6132DA] transition hover:text-[#4D25B5]">
          <ArrowLeft size={16} /> Customers
        </Link>

        <section className="border border-[#e6e8e4] bg-white">
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex min-w-0 items-center gap-4 sm:gap-5">
              <span aria-hidden="true" className="grid size-20 shrink-0 place-items-center rounded-md bg-[#6132DA] text-2xl font-semibold text-white ring-4 ring-[#F1ECFC] sm:size-24 sm:text-3xl">
                {customerInitials || '?'}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-semibold text-[#252a29] sm:text-3xl">{customer.firstName} {customer.lastName}</h1>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${customer.status === 'ACTIVE' ? 'bg-[#edf3ef] text-[#35634c]' : 'bg-[#f1f2ef] text-[#59615e]'}`}>
                    {customer.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-[#59615e]">
                  {customer.createdAt && <span>Registered {new Date(customer.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                  {customerLocation && <><span aria-hidden="true" className="hidden size-1 rounded-full bg-[#D8CCF5] sm:block" /><span className="inline-flex items-center gap-1.5"><MapPin size={14} />{customerLocation}</span></>}
                  {customer.phone && <><span aria-hidden="true" className="hidden size-1 rounded-full bg-[#D8CCF5] sm:block" /><span className="inline-flex items-center gap-1.5"><Phone size={14} />{customer.phone}</span></>}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
              <Link to={`/customers/${customer.id}/edit`} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#6132DA] px-4 text-sm font-semibold text-white transition hover:bg-[#4D25B5] focus:outline-none focus:ring-4 focus:ring-[#6132DA]/20">
                <Pencil size={15} /> Edit profile
              </Link>
              {canToggleStatus && (
                <button type="button" onClick={handleStatusToggle} className="inline-flex min-h-10 items-center rounded-md border border-[#dfe3df] bg-white px-4 text-sm font-medium text-[#414846] transition hover:bg-[#f1f2ef]">
                  {customer.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="space-y-5">
          <section className="border border-[#e6e8e4] bg-white">
            <header className="border-b border-[#e8eae7] px-5 py-4 sm:px-6">
              <h2 className="text-base font-semibold text-[#252a29]">Personal information</h2>
              <p className="mt-1 text-xs text-[#59615e]">Contact details and residence</p>
            </header>
            <dl className="grid gap-x-8 px-5 sm:grid-cols-2 sm:px-6">
              <div className="border-b border-[#eef0ed] py-4">
                <dt className="flex items-center gap-2 text-xs font-medium text-[#59615e]"><Phone size={14} /> Primary phone</dt>
                <dd className="mt-2 text-sm font-semibold text-[#252a29]">{customer.phone || '—'}</dd>
              </div>
              <div className="border-b border-[#eef0ed] py-4">
                <dt className="flex items-center gap-2 text-xs font-medium text-[#59615e]"><Phone size={14} /> Alternate phone</dt>
                <dd className="mt-2 text-sm font-semibold text-[#252a29]">{customer.alternatePhone || '—'}</dd>
              </div>
              <div className="border-b border-[#eef0ed] py-4 sm:col-span-2">
                <dt className="flex items-center gap-2 text-xs font-medium text-[#59615e]"><Mail size={14} /> Email address</dt>
                <dd className="mt-2 break-words text-sm font-semibold text-[#252a29]">{customer.email || '—'}</dd>
              </div>
              <div className="border-b border-[#eef0ed] py-4 sm:col-span-2">
                <dt className="flex items-center gap-2 text-xs font-medium text-[#59615e]"><MapPin size={14} /> Address</dt>
                <dd className="mt-2 text-sm font-semibold text-[#252a29]">{customer.address || '—'}{customer.city ? `, ${customer.city}` : ''}{customer.state ? `, ${customer.state}` : ''}{customer.pincode ? `, ${customer.pincode}` : ''}</dd>
              </div>
              <div className="py-4 sm:col-span-2">
                <dt className="text-xs font-medium text-[#59615e]">Notes</dt>
                <dd className="mt-2 whitespace-pre-wrap text-sm text-[#414846]">{customer.notes || 'No notes provided.'}</dd>
              </div>
            </dl>
          </section>

        </div>

        <section className="border border-[#e6e8e4] bg-white">
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e8eae7] px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-[#252a29]">Rental activity</h2>
              <p className="mt-1 text-xs text-[#59615e]">Active rentals and recent returns</p>
            </div>
            <Link to="/bookings" className="inline-flex items-center gap-1 text-sm font-semibold text-[#6132DA] hover:text-[#4D25B5]">All bookings <ArrowUpRight size={15} /></Link>
          </header>
          {rentalData.error && <p role="alert" className="mx-5 mt-4 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:mx-6">{rentalData.error}</p>}
          {rentalData.loading ? <p className="px-5 py-5 text-sm text-[#59615e] sm:px-6">Loading rental activity...</p> : (
            <div className="grid gap-5 px-5 py-5 md:grid-cols-2 sm:px-6">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-[#414846]">Active rentals</h3>
                {rentalData.active.length ? (
                  <div className="mt-3 grid gap-3">
                    {rentalData.active.map((booking) => (
                      <Link key={booking.id} to={`/bookings/${booking.id}`} className="block border border-[#e6e8e4] bg-[#f8f9f6] p-4 transition hover:border-[#D8CCF5] hover:bg-white">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#59615e]">Booking</p>
                            <p className="mt-1 font-mono text-sm font-semibold text-[#6132DA]">{booking.bookingNumber}</p>
                          </div>
                          <span className="inline-flex rounded-full bg-[#edf3ef] px-2.5 py-1 text-[10px] font-semibold text-[#35634c]">ACTIVE</span>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#e6e8e4] pt-3">
                          <div>
                            <p className="text-[10px] font-medium uppercase tracking-wide text-[#59615e]">Rental dates</p>
                            <p className="mt-1 text-xs font-medium text-[#252a29]">{booking.rentalStartDate} to {booking.rentalEndDate}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-medium uppercase tracking-wide text-[#59615e]">Items</p>
                            <p className="mt-1 text-xs font-medium text-[#252a29]">{booking.itemCount || 0}</p>
                          </div>
                        </div>
                        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#6132DA]">View booking <ArrowUpRight size={13} /></span>
                      </Link>
                    ))}
                  </div>
                ) : <p className="mt-2 text-sm text-[#59615e]">No active rentals.</p>}
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-[#414846]">Recent returns</h3>
                {rentalData.returns.length ? <div className="mt-2 divide-y divide-[#eef0ed]">{rentalData.returns.map((entry) => <Link key={entry.id} to={`/returns/${entry.id}`} className="flex items-center justify-between gap-3 py-3"><span><span className="block font-mono text-sm font-semibold text-[#6132DA]">RT-{String(entry.id).padStart(5, '0')} · {entry.bookingNumber}</span><span className="mt-1 block text-xs text-[#59615e]">{formatDate(entry.returnedAt)}</span></span><span className={`text-xs font-semibold ${entry.returnStatus === 'LATE' ? 'text-amber-800' : 'text-[#35634c]'}`}>{entry.returnStatus}{entry.daysLate ? ` · ${entry.daysLate}d` : ''}</span></Link>)}</div> : <p className="mt-2 text-sm text-[#59615e]">No returns recorded.</p>}
              </div>
            </div>
          )}
        </section>

        <section className="border border-[#e6e8e4] bg-white">
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e8eae7] px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-[#252a29]">Payment history</h2>
              <p className="mt-1 text-xs text-[#59615e]">Booking-linked payments recorded for this customer</p>
            </div>
            <Link to="/payments" className="inline-flex items-center gap-1 text-sm font-semibold text-[#6132DA] hover:text-[#4D25B5]">All payments <ArrowUpRight size={15} /></Link>
          </header>
          {paymentData.error && <p role="alert" className="mx-5 mt-4 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:mx-6">{paymentData.error}</p>}
          {paymentData.loading ? <p className="px-5 py-5 text-sm text-[#59615e] sm:px-6">Loading payment history...</p> : paymentData.summary && (
            <div className="grid grid-cols-3 gap-px border-b border-[#e6e8e4] bg-[#e6e8e4]">
              <div className="bg-white px-4 py-4"><p className="text-xs font-medium text-[#59615e]">Bookings</p><p className="mt-1 text-lg font-semibold tabular-nums text-[#252a29]">{paymentData.summary.totalBookings}</p></div>
              <div className="bg-white px-4 py-4"><p className="text-xs font-medium text-[#59615e]">Net paid</p><p className="mt-1 text-lg font-semibold tabular-nums text-[#252a29]">₹{Number(paymentData.summary.totalPaid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p></div>
              <div className="bg-white px-4 py-4"><p className="text-xs font-medium text-[#59615e]">Outstanding</p><p className="mt-1 text-lg font-semibold tabular-nums text-[#252a29]">₹{Number(paymentData.summary.outstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p></div>
            </div>
          )}
          {!paymentData.loading && paymentData.data.length > 0 && <div className="divide-y divide-[#eef0ed] px-5 sm:px-6">{paymentData.data.map((payment) => <Link key={payment.id} to={`/payments/${payment.id}`} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-mono text-sm font-semibold text-[#6132DA]">{payment.paymentReference}</p><p className="mt-1 text-xs text-[#59615e]">{payment.bookingNumber || 'Legacy'} · {payment.paymentMethod.replaceAll('_', ' ')} · {payment.transactionDate}</p></div><div className="flex items-center gap-3"><span className="text-sm font-semibold tabular-nums text-[#252a29]">₹{Number(payment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span><PaymentStatusBadge status={payment.status} /></div></Link>)}</div>}
          {!paymentData.loading && !paymentData.error && !paymentData.data.length && <p className="px-5 py-5 text-sm text-[#59615e] sm:px-6">No payment transactions recorded.</p>}
        </section>
      </div>
    </main>
      <ConfirmationDialog
        isOpen={isDeactivateConfirmationOpen}
        title="Deactivate customer?"
        message={`Deactivate ${customer.firstName} ${customer.lastName || ''}? They will remain in your records but won’t be treated as an active customer.`}
        confirmLabel="Deactivate"
        isConfirming={isUpdatingStatus}
        destructive
        onCancel={() => setIsDeactivateConfirmationOpen(false)}
        onConfirm={confirmDeactivateCustomer}
      />
    </>
  );
}

export default CustomerDetailsPage;
