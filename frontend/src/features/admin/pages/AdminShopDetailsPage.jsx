import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Package, Users } from 'lucide-react';
import { adminService } from '../services/admin.service';

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
  : '—';

const formatMoney = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(Number(value || 0));

function AdminShopDetailsPage() {
  const { shopId } = useParams();
  const [requestState, setRequestState] = useState({ shopId: null, shop: null, error: '' });

  useEffect(() => {
    let active = true;
    adminService.getShop(shopId)
      .then((response) => {
        if (active) {
          setRequestState({ shopId, shop: response?.data?.data || null, error: '' });
        }
      })
      .catch((requestError) => {
        if (active) {
          setRequestState({
            shopId,
            shop: null,
            error: requestError.response?.data?.message || 'Unable to load this shop.',
          });
        }
      });
    return () => { active = false; };
  }, [shopId]);

  const isCurrentShop = requestState.shopId === shopId;
  const shop = isCurrentShop ? requestState.shop : null;
  const error = isCurrentShop ? requestState.error : '';
  const loading = !isCurrentShop;

  if (loading) return <p className="py-10 text-sm text-[#59615e]">Loading shop details…</p>;
  if (error || !shop) return <div role="alert" className="border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error || 'Shop not found.'}</div>;

  return (
    <div className="space-y-5">
      <Link to="/admin/shops" className="inline-flex min-h-9 items-center gap-2 text-xs font-semibold text-[#6132DA] hover:underline"><ArrowLeft size={15} /> Back to shops</Link>
      <section className="flex flex-wrap items-start justify-between gap-4 border border-[#e7e6ec] bg-white p-5 sm:p-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8060D9]">Shop ID {shop.id} · {shop.status}</p>
          <h2 className="mt-2 text-2xl font-semibold text-[#26252c]">{shop.name}</h2>
          <p className="mt-1 text-sm text-[#74747e]">{shop.businessName}</p>
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#62626c]"><MapPin size={14} />{[shop.address, shop.city, shop.state, shop.pincode].filter(Boolean).join(', ') || 'Location not set'}</p>
        </div>
        <div className="text-sm text-[#53535d]">
          <p className="font-semibold text-[#26252c]">Owner</p>
          <p className="mt-1">{shop.ownerName || 'No active owner found'}</p>
          <p className="mt-1">{shop.ownerEmail || '—'} · {shop.ownerPhone || '—'}</p>
          <p className="mt-2 text-xs text-[#83838c]">Registered {formatDate(shop.createdAt)}</p>
        </div>
      </section>

      <section aria-label="Shop activity" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Bookings', shop.bookingCount],
          ['Pending bookings', shop.pendingBookings],
          ['Completed bookings', shop.completedBookings],
          ['Cancelled bookings', shop.cancelledBookings],
          ['Products', shop.productCount],
        ].map(([label, value]) => <div key={label} className="border border-[#e7e6ec] bg-white p-4"><p className="text-xs text-[#74747e]">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums text-[#26252c]">{value ?? 0}</p></div>)}
      </section>

      <section className="border border-[#e7e6ec] bg-white">
        <header className="flex items-center gap-2 border-b border-[#eeedf1] px-5 py-4"><Users size={16} className="text-[#6132DA]" /><div><h3 className="text-sm font-semibold text-[#26252c]">Shop accounts</h3><p className="mt-1 text-xs text-[#74747e]">{shop.users?.length || 0} associated owner/staff accounts</p></div></header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead><tr className="border-b border-[#eeedf1] text-xs text-[#74747e]"><th className="px-5 py-3 font-medium">Name</th><th className="px-5 py-3 font-medium">Email</th><th className="px-5 py-3 font-medium">Role</th><th className="px-5 py-3 font-medium">Account status</th><th className="px-5 py-3 font-medium">Joined</th></tr></thead>
            <tbody>{shop.users?.length ? shop.users.map((user) => <tr key={user.id} className="border-b border-[#f0eff3] last:border-0"><td className="px-5 py-3 font-medium text-[#26252c]">{user.name}</td><td className="px-5 py-3 text-[#53535d]">{user.email}</td><td className="px-5 py-3 text-[#53535d]">{user.role}</td><td className="px-5 py-3 text-[#53535d]">{user.accountStatus} / {user.membershipStatus}</td><td className="px-5 py-3 text-[#74747e]">{formatDate(user.joinedAt)}</td></tr>) : <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-[#74747e]">No associated accounts found.</td></tr>}</tbody>
          </table>
        </div>
      </section>

      <section className="border border-[#e7e6ec] bg-white">
        <header className="flex items-center gap-2 border-b border-[#eeedf1] px-5 py-4"><Package size={16} className="text-[#6132DA]" /><div><h3 className="text-sm font-semibold text-[#26252c]">Recent bookings</h3><p className="mt-1 text-xs text-[#74747e]">Bookings for this shop are available for monitoring only.</p></div></header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead><tr className="border-b border-[#eeedf1] text-xs text-[#74747e]"><th className="px-5 py-3 font-medium">Booking</th><th className="px-5 py-3 font-medium">Customer</th><th className="px-5 py-3 font-medium">Rental dates</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Amount</th></tr></thead>
            <tbody>{shop.recentBookings?.length ? shop.recentBookings.map((booking) => <tr key={booking.id} className="border-b border-[#f0eff3] last:border-0"><td className="px-5 py-3 font-medium text-[#26252c]">{booking.bookingNumber}</td><td className="px-5 py-3 text-[#53535d]">{booking.customerName}</td><td className="px-5 py-3 text-[#53535d]">{formatDate(booking.rentalStartDate)} – {formatDate(booking.rentalEndDate)}</td><td className="px-5 py-3 text-[#53535d]">{booking.status}</td><td className="px-5 py-3 text-[#53535d]">{formatMoney(booking.totalAmount)}</td></tr>) : <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-[#74747e]">No booking activity for this shop.</td></tr>}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default AdminShopDetailsPage;
