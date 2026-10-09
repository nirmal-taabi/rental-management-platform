import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Check, LoaderCircle, Plus, Search, Trash2 } from 'lucide-react';
import { customerService } from '../../customers/services/customer.service';
import { categoryService } from '../../catalog/services/category.service';
import { bookingService } from '../services/booking.service';

const localToday = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const rentalDays = (start, end) => {
  if (!start || !end || end < start) return 0;
  return Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000) + 1;
};

const formatMoney = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));

const mapExistingItem = (item) => ({
  productId: item.productId,
  inventoryItemId: item.inventoryItemId,
  productName: item.product?.name || 'Product',
  productSku: item.product?.sku || '',
  sku: item.inventoryItem?.sku || '',
  size: item.inventoryItem?.size || '',
  color: item.inventoryItem?.color || '',
  condition: item.inventoryItem?.condition || 'GOOD',
  dailyRentalRate: item.dailyRentalRate,
  securityDeposit: item.depositAmount,
  discountAmount: item.discountAmount || '0',
  taxAmount: item.taxAmount || '0',
});

function BookingWorkspacePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [customerSearch, setCustomerSearch] = useState('');
  const [pieceSearch, setPieceSearch] = useState('');
  const [debouncedPieceSearch, setDebouncedPieceSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const [availablePieces, setAvailablePieces] = useState([]);
  const [piecePagination, setPiecePagination] = useState({ page: 1, totalPages: 1, totalItems: 0 });
  const [piecePage, setPiecePage] = useState(1);
  const [selectedItems, setSelectedItems] = useState([]);
  const [discountAmount, setDiscountAmount] = useState('0.00');
  const [taxAmount, setTaxAmount] = useState('0.00');
  const [notes, setNotes] = useState('');
  const [selectedAvailability, setSelectedAvailability] = useState({});
  const [completedPieceQueryKey, setCompletedPieceQueryKey] = useState('');
  const [completedSelectedQueryKey, setCompletedSelectedQueryKey] = useState('');
  const [loadingBooking, setLoadingBooking] = useState(editing);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [availabilityError, setAvailabilityError] = useState('');
  const validRentalRange = Boolean(startDate && endDate && endDate >= startDate);
  const pieceQueryKey = JSON.stringify([
    debouncedPieceSearch,
    categoryId,
    sizeFilter,
    colorFilter,
    piecePage,
    startDate,
    endDate,
    editing ? id : null,
  ]);
  const checkingPieces = validRentalRange
    && (pieceSearch.trim() !== debouncedPieceSearch || completedPieceQueryKey !== pieceQueryKey);

  useEffect(() => {
    if (!editing) return undefined;
    let active = true;
    bookingService.getBooking(id).then((response) => {
      if (!active) return;
      const booking = response.data.data;
      setCustomer(booking.customer);
      setCustomerSearch(booking.customer?.name || '');
      setStartDate(booking.rentalStartDate);
      setEndDate(booking.rentalEndDate);
      setSelectedItems((booking.items || []).map(mapExistingItem));
      const itemDiscount = (booking.items || []).reduce((total, item) => total + Number(item.discountAmount || 0), 0);
      const itemTax = (booking.items || []).reduce((total, item) => total + Number(item.taxAmount || 0), 0);
      setDiscountAmount(Math.max(0, Number(booking.discountAmount || 0) - itemDiscount).toFixed(2));
      setTaxAmount(Math.max(0, Number(booking.taxAmount || 0) - itemTax).toFixed(2));
      setNotes(booking.notes || '');
      setError('');
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.message || 'Unable to load this booking.');
    }).finally(() => { if (active) setLoadingBooking(false); });
    return () => { active = false; };
  }, [editing, id]);

  useEffect(() => {
    categoryService.getCategories({ page: 1, limit: 100, status: 'ACTIVE', sortBy: 'name', sortOrder: 'asc' })
      .then((response) => setCategories(response.data.data || []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedPieceSearch(pieceSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [pieceSearch]);

  useEffect(() => {
    if (customer) return undefined;
    let active = true;
    const timer = setTimeout(async () => {
      setSearchingCustomers(true);
      try {
        const response = await customerService.getCustomers({ page: 1, limit: 8, search: customerSearch.trim(), status: 'ACTIVE', sortBy: 'first_name', sortOrder: 'asc' });
        if (active) setCustomers(response.data.data || []);
      } catch {
        if (active) setCustomers([]);
      } finally {
        if (active) setSearchingCustomers(false);
      }
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [customerSearch, customer]);

  useEffect(() => {
    let active = true;
    if (!validRentalRange) {
      return undefined;
    }
    bookingService.getInventoryAvailability({
      startDate,
      endDate,
      page: piecePage,
      limit: 50,
      search: debouncedPieceSearch || undefined,
      categoryId: categoryId || undefined,
      size: sizeFilter.trim() || undefined,
      color: colorFilter.trim() || undefined,
      ...(editing ? { excludeBookingId: id } : {}),
    })
      .then((response) => {
        if (!active) return;
        setAvailablePieces(response.data.data.items || []);
        setPiecePagination(response.data.data.pagination || { page: piecePage, totalPages: 1, totalItems: 0 });
        setAvailabilityError('');
        setCompletedPieceQueryKey(pieceQueryKey);
      })
      .catch((requestError) => {
        if (active) {
          setAvailablePieces([]);
          setPiecePagination({ page: 1, totalPages: 1, totalItems: 0 });
          setAvailabilityError(requestError.response?.data?.message || 'Unable to check date availability.');
          setCompletedPieceQueryKey(pieceQueryKey);
        }
      });
    return () => { active = false; };
  }, [debouncedPieceSearch, categoryId, sizeFilter, colorFilter, piecePage, startDate, endDate, validRentalRange, editing, id, pieceQueryKey]);

  const selectedIds = useMemo(
    () => selectedItems.map((item) => Number(item.inventoryItemId)),
    [selectedItems],
  );
  const selectedQueryKey = JSON.stringify([selectedIds, startDate, endDate, editing ? id : null]);
  const checkingSelected = selectedItems.length > 0
    && validRentalRange
    && completedSelectedQueryKey !== selectedQueryKey;
  useEffect(() => {
    let active = true;
    if (!selectedItems.length || !validRentalRange) {
      return undefined;
    }
    bookingService.checkBulkAvailability({ inventoryItemIds: selectedIds, startDate, endDate, ...(editing ? { excludeBookingId: id } : {}) })
      .then((response) => {
        if (!active) return;
        setSelectedAvailability(Object.fromEntries((response.data.data.items || []).map((item) => [String(item.inventoryItemId), item])));
        setAvailabilityError('');
        setCompletedSelectedQueryKey(selectedQueryKey);
      })
      .catch((requestError) => {
        if (active) {
          setSelectedAvailability({});
          setAvailabilityError(requestError.response?.data?.message || 'Unable to recheck selected item availability.');
          setCompletedSelectedQueryKey(selectedQueryKey);
        }
      });
    return () => { active = false; };
  }, [selectedItems.length, selectedIds, startDate, endDate, validRentalRange, editing, id, selectedQueryKey]);

  const days = rentalDays(startDate, endDate);
  const pricing = useMemo(() => {
    const subtotal = selectedItems.reduce((total, item) => total + Number(item.dailyRentalRate || 0) * days, 0);
    const itemDiscount = selectedItems.reduce((total, item) => total + Number(item.discountAmount || 0), 0);
    const itemTax = selectedItems.reduce((total, item) => total + Number(item.taxAmount || 0), 0);
    const deposit = selectedItems.reduce((total, item) => total + Number(item.securityDeposit || 0), 0);
    const bookingDiscount = Number(discountAmount || 0);
    const tax = Number(taxAmount || 0);
    return { subtotal, discount: itemDiscount + bookingDiscount, tax: itemTax + tax, deposit, total: Math.max(0, subtotal - itemDiscount - bookingDiscount + itemTax + tax) };
  }, [selectedItems, days, discountAmount, taxAmount]);
  const filteredPieces = useMemo(() => availablePieces.filter((piece) =>
    (!sizeFilter || String(piece.size || '').toLowerCase().includes(sizeFilter.toLowerCase()))
    && (!colorFilter || String(piece.color || '').toLowerCase().includes(colorFilter.toLowerCase()))), [availablePieces, sizeFilter, colorFilter]);

  const selectCustomer = (nextCustomer) => {
    setCustomer(nextCustomer);
    setCustomerSearch(nextCustomer.name || [nextCustomer.firstName, nextCustomer.lastName].filter(Boolean).join(' '));
    setCustomers([]);
  };

  const addPiece = (piece) => {
    if (!piece.available || selectedIds.includes(Number(piece.inventoryItemId))) return;
    setSelectedItems((current) => [...current, {
      productId: piece.productId,
      inventoryItemId: piece.inventoryItemId,
      productName: piece.productName,
      productSku: piece.productSku,
      sku: piece.sku,
      size: piece.size,
      color: piece.color,
      condition: piece.condition,
      dailyRentalRate: piece.dailyRentalRate,
      securityDeposit: piece.securityDeposit,
      discountAmount: '0.00',
      taxAmount: '0.00',
    }]);
  };

  const submitBooking = async (event) => {
    event.preventDefault();
    setError('');
    if (!customer || !startDate || !endDate || endDate < startDate || selectedItems.length === 0) {
      setError('Choose a customer, a valid rental period, and at least one available physical piece.');
      return;
    }
    if (checkingSelected || selectedItems.some((item) => selectedAvailability[String(item.inventoryItemId)]?.available !== true)) {
      setError('Wait for availability checks to finish and resolve unavailable selected pieces.');
      return;
    }
    setSaving(true);
    const payload = {
      customerId: customer.id,
      rentalStartDate: startDate,
      rentalEndDate: endDate,
      discountAmount,
      taxAmount,
      notes,
      items: selectedItems.map((item) => ({ productId: item.productId, inventoryItemId: item.inventoryItemId, discountAmount: item.discountAmount, taxAmount: item.taxAmount })),
    };
    try {
      const response = editing
        ? await bookingService.updateBooking(id, payload)
        : await bookingService.createBooking(payload);
      navigate(`/bookings/${response.data.data.id}`, { replace: true });
    } catch (requestError) {
      const conflicts = requestError.response?.data?.error?.details?.conflicts || [];
      setError(conflicts.length
        ? `${conflicts.map((conflict) => conflict.bookingNumber || conflict.reason || `Piece ${conflict.inventoryItemId}`).join(', ')} is no longer available. Choose another physical piece.`
        : requestError.response?.data?.message || 'Unable to save this booking.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingBooking) return <main className="min-h-screen bg-[#FAF8FF] px-4 py-12 text-center text-stone-600">Loading booking workspace...</main>;

  return (
    <main className="min-h-screen bg-[#f8f9f6] px-4 py-7 text-[#252a29] sm:px-6 lg:px-8">
      <form onSubmit={submitBooking} className="mx-auto max-w-[1440px]">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[#e8eae7] pb-5">
          <div>
            <Link to={editing ? `/bookings/${id}` : '/bookings'} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#6132DA]"><ArrowLeft size={16} /> {editing ? 'Booking details' : 'All bookings'}</Link>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7956CB]">Reservation workspace</p>
            <h1 className="mt-1 text-3xl font-semibold text-[#252a29]">{editing ? 'Edit booking' : 'New booking'}</h1>
          </div>
          <button type="submit" disabled={saving || checkingSelected || selectedItems.some((item) => selectedAvailability[String(item.inventoryItemId)]?.available !== true)} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#6132DA] px-5 text-sm font-semibold text-white transition hover:bg-[#4D25B5] disabled:cursor-not-allowed disabled:opacity-50">{saving ? <LoaderCircle size={17} className="animate-spin" /> : <Check size={17} />} {saving ? 'Saving...' : editing ? 'Save changes' : 'Create booking'}</button>
        </header>

        {error && <div role="alert" className="mb-5 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
        {availabilityError && <div role="alert" className="mb-5 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{availabilityError}</div>}

        <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_370px]">
          <div className="space-y-6">
            <section className="border-y border-stone-300 bg-white p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3"><span className="grid size-8 place-items-center rounded-full bg-[#5522BB] text-sm font-bold text-white">1</span><div><h2 className="font-semibold">Customer</h2><p className="text-sm text-stone-500">Choose an active customer in this shop.</p></div></div>
              {customer ? <div className="flex flex-wrap items-center justify-between gap-3 border border-stone-300 bg-[#FAF8FF] p-4"><div><p className="font-semibold">{customer.name || [customer.firstName, customer.lastName].filter(Boolean).join(' ')}</p><p className="mt-1 text-sm text-stone-600">{customer.phone || 'No phone'}{customer.email ? ` · ${customer.email}` : ''}</p></div><button type="button" onClick={() => { setCustomer(null); setCustomerSearch(''); }} className="text-sm font-semibold text-[#5522BB] underline underline-offset-4">Change</button></div> : <div className="relative"><label className="relative block"><span className="sr-only">Search customers</span><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><input autoComplete="off" value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Search name, phone or email" className="min-h-11 w-full border border-stone-300 pl-10 pr-3 text-sm focus:border-[#5522BB] focus:outline-none" /></label>{(customers.length > 0 || searchingCustomers) && <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto border border-stone-300 bg-white shadow-lg">{searchingCustomers && <p className="px-3 py-3 text-sm text-stone-500">Searching customers...</p>}{customers.map((entry) => <button type="button" key={entry.id} onClick={() => selectCustomer(entry)} className="block w-full border-b border-stone-100 px-3 py-3 text-left hover:bg-[#FAF8FF]"><span className="block font-semibold">{entry.firstName} {entry.lastName || ''}</span><span className="mt-1 block text-xs text-stone-500">{entry.phone || '—'}{entry.email ? ` · ${entry.email}` : ''}</span></button>)}</div>}{!searchingCustomers && customerSearch.trim().length > 1 && customers.length === 0 && <p className="mt-2 text-sm text-stone-500">No active customer found. <Link to="/customers/new" className="font-semibold text-[#5522BB] underline">Add customer</Link></p>}</div>}
            </section>

            <section className="border-y border-stone-300 bg-white p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3"><span className="grid size-8 place-items-center rounded-full bg-[#5522BB] text-sm font-bold text-white">2</span><div><h2 className="font-semibold">Rental dates</h2><p className="text-sm text-stone-500">End date is included in the rental period.</p></div></div>
              <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Rental start<div className="mt-1 flex min-h-11 items-center gap-2 border border-stone-300 px-3"><CalendarDays size={16} className="text-stone-500" /><input required type="date" value={startDate} min={!editing ? localToday() : undefined} onChange={(event) => setStartDate(event.target.value)} className="min-w-0 flex-1 text-sm outline-none" /></div></label><label className="text-sm font-medium">Rental end<div className="mt-1 flex min-h-11 items-center gap-2 border border-stone-300 px-3"><CalendarDays size={16} className="text-stone-500" /><input required type="date" value={endDate} min={startDate || (!editing ? localToday() : undefined)} onChange={(event) => setEndDate(event.target.value)} className="min-w-0 flex-1 text-sm outline-none" /></div></label></div>
              {days > 0 && <p className="mt-3 text-sm text-stone-600">{days} inclusive rental {days === 1 ? 'day' : 'days'} <span className="text-stone-400">·</span> 1-day cleanup buffer is applied automatically.</p>}
            </section>

            <section className="border-y border-stone-300 bg-white p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3"><span className="grid size-8 place-items-center rounded-full bg-[#5522BB] text-sm font-bold text-white">3</span><div><h2 className="font-semibold">Physical pieces</h2><p className="text-sm text-stone-500">Availability is checked for the selected dates.</p></div></div>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_190px]">
                <label className="relative block">
                  <span className="sr-only">Search physical pieces</span>
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    value={pieceSearch}
                    onChange={(event) => { setPieceSearch(event.target.value); setPiecePage(1); }}
                    placeholder="Search product or inventory SKU"
                    className="min-h-11 w-full border border-stone-300 pl-10 pr-3 text-sm focus:border-[#5522BB] focus:outline-none"
                  />
                </label>
                <select aria-label="Filter physical pieces by category" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPiecePage(1); }} className="min-h-11 border border-stone-300 bg-white px-3 text-sm">
                  <option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </div>
              <div className="mt-3 grid gap-2 border border-stone-200 bg-[#FAF8FF] p-3 sm:grid-cols-2">
                <input aria-label="Filter physical pieces by size" value={sizeFilter} onChange={(event) => { setSizeFilter(event.target.value); setPiecePage(1); }} placeholder="Filter size" className="min-h-9 border border-stone-300 bg-white px-3 text-sm" />
                <input aria-label="Filter physical pieces by color" value={colorFilter} onChange={(event) => { setColorFilter(event.target.value); setPiecePage(1); }} placeholder="Filter color" className="min-h-9 border border-stone-300 bg-white px-3 text-sm" />
              </div>
              <div className="mt-3 border border-stone-300">
                {!startDate || !endDate || endDate < startDate
                  ? <p className="px-4 py-5 text-sm text-stone-600">Choose valid rental dates to display available physical pieces.</p>
                  : checkingPieces
                    ? <p className="flex items-center gap-2 px-4 py-5 text-sm text-stone-600"><LoaderCircle size={16} className="animate-spin" /> Loading physical pieces and checking date availability...</p>
                    : !availablePieces.length
                      ? <p className="px-4 py-5 text-sm text-stone-600">{debouncedPieceSearch || categoryId ? 'No physical pieces match your search and filters.' : 'No eligible physical pieces found.'}</p>
                      : !filteredPieces.length
                        ? <p className="px-4 py-5 text-sm text-stone-600">No physical pieces match those size or color filters.</p>
                        : <div className="divide-y divide-stone-200">{filteredPieces.map((piece) => {
                          const alreadySelected = selectedIds.includes(Number(piece.inventoryItemId));
                          return <div key={piece.inventoryItemId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                            <div className="min-w-0">
                              <p className="font-semibold">{piece.productName}</p>
                              <p className="mt-1 font-mono text-xs text-stone-500">{piece.sku} · {piece.productSku}</p>
                              <p className="mt-1 text-xs text-stone-500">Size {piece.size || '—'} · {piece.color || '—'} · {piece.condition}</p>
                              {!piece.available && <p className="mt-1 text-xs font-medium text-rose-700">Unavailable for these dates{piece.conflicts?.[0]?.rentalEndDate ? ` · booked through ${piece.conflicts[0].rentalEndDate}` : ''}</p>}
                            </div>
                            <button type="button" disabled={!piece.available || alreadySelected} onClick={() => addPiece(piece)} className="inline-flex min-h-9 items-center gap-1 border border-stone-300 px-3 text-sm font-semibold text-[#5522BB] hover:border-[#5522BB] disabled:cursor-not-allowed disabled:opacity-45"><Plus size={15} /> {alreadySelected ? 'Added' : piece.available ? 'Add' : 'Unavailable'}</button>
                          </div>;
                        })}</div>}
                {startDate && endDate && piecePagination.totalItems > 0 && <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-4 py-3">
                  <p className="text-xs text-stone-500">{piecePagination.totalItems} physical {piecePagination.totalItems === 1 ? 'piece' : 'pieces'} · Page {piecePagination.page} of {piecePagination.totalPages}</p>
                  <div className="flex gap-2">
                    <button type="button" disabled={!piecePagination.hasPreviousPage || checkingPieces} onClick={() => setPiecePage((page) => page - 1)} className="min-h-8 border border-stone-300 px-3 text-xs font-semibold disabled:opacity-50">Previous</button>
                    <button type="button" disabled={!piecePagination.hasNextPage || checkingPieces} onClick={() => setPiecePage((page) => page + 1)} className="min-h-8 border border-stone-300 px-3 text-xs font-semibold disabled:opacity-50">Next</button>
                  </div>
                </footer>}
              </div>
            </section>

            <section className="border-y border-stone-300 bg-white p-5 sm:p-6"><label htmlFor="booking-notes" className="block font-semibold">Notes <span className="font-normal text-stone-500">(optional)</span></label><textarea id="booking-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={5000} rows={3} placeholder="Fitting, pickup or customer notes" className="mt-3 w-full resize-y border border-stone-300 px-3 py-2 text-sm focus:border-[#5522BB] focus:outline-none" /></section>
          </div>

          <aside className="border-y border-stone-300 bg-white p-5 sm:p-6 xl:sticky xl:top-5">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7956CB]">Booking summary</p><h2 className="mt-1 text-xl font-semibold">Selected pieces</h2></div><span className="font-mono text-sm text-stone-500">{selectedItems.length.toString().padStart(2, '0')}</span></div>
            {!selectedItems.length ? <div className="mt-5 border border-dashed border-stone-300 px-4 py-8 text-center"><p className="text-sm font-semibold">Nothing selected</p><p className="mt-1 text-xs text-stone-500">Choose dates, then add available physical pieces from the list.</p></div> : <div className="mt-4 divide-y divide-stone-200">{selectedItems.map((item) => {
              const availability = selectedAvailability[String(item.inventoryItemId)];
              return <article key={item.inventoryItemId} className="py-4 first:pt-0"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold">{item.productName}</p><p className="mt-1 font-mono text-xs text-stone-600">{item.sku}</p><p className="mt-1 text-xs text-stone-500">{item.size || '—'} · {item.color || '—'} · {item.condition}</p><p className={`mt-1 text-xs font-semibold ${availability?.available === false ? 'text-rose-700' : checkingSelected ? 'text-stone-500' : 'text-emerald-700'}`}>{checkingSelected ? 'Checking availability...' : availability?.available === false ? 'Unavailable for these dates' : availability?.available ? 'Available' : 'Waiting for dates'}</p></div><button type="button" aria-label={`Remove ${item.sku}`} onClick={() => setSelectedItems((current) => current.filter((piece) => piece.inventoryItemId !== item.inventoryItemId))} className="grid size-9 shrink-0 place-items-center border border-stone-300 text-stone-600 hover:border-rose-400 hover:text-rose-700"><Trash2 size={16} /></button></div><p className="mt-3 text-right text-sm font-semibold tabular-nums">{formatMoney(Number(item.dailyRentalRate || 0) * days)} <span className="font-normal text-stone-500">rental</span></p></article>;
            })}</div>}

            <div className="mt-2 space-y-3 border-t border-stone-300 pt-4 text-sm"><div className="flex justify-between gap-3"><span className="text-stone-600">Subtotal</span><span className="font-medium tabular-nums">{formatMoney(pricing.subtotal)}</span></div><label className="flex items-center justify-between gap-3"><span className="text-stone-600">Discount</span><span className="flex min-w-32 items-center border border-stone-300 px-2"><span className="text-stone-500">₹</span><input type="number" min="0" step="0.01" value={discountAmount} onChange={(event) => setDiscountAmount(event.target.value)} className="w-full min-h-9 bg-transparent pl-1 text-right tabular-nums outline-none" /></span></label><label className="flex items-center justify-between gap-3"><span className="text-stone-600">Tax</span><span className="flex min-w-32 items-center border border-stone-300 px-2"><span className="text-stone-500">₹</span><input type="number" min="0" step="0.01" value={taxAmount} onChange={(event) => setTaxAmount(event.target.value)} className="w-full min-h-9 bg-transparent pl-1 text-right tabular-nums outline-none" /></span></label><div className="flex justify-between gap-3 border-t border-stone-200 pt-3 text-base font-semibold"><span>Rental total</span><span className="tabular-nums">{formatMoney(pricing.total)}</span></div><div className="flex justify-between gap-3"><span className="text-stone-600">Refundable deposit</span><span className="font-medium tabular-nums">{formatMoney(pricing.deposit)}</span></div><div className="flex justify-between gap-3 border-t border-stone-300 pt-3 text-lg font-semibold"><span>Total required</span><span className="tabular-nums">{formatMoney(pricing.total + pricing.deposit)}</span></div></div>
            <button type="submit" disabled={saving || checkingSelected || selectedItems.length === 0 || selectedItems.some((item) => selectedAvailability[String(item.inventoryItemId)]?.available !== true)} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#A862FF] px-4 text-sm font-semibold text-white hover:bg-[#813DC9] disabled:cursor-not-allowed disabled:opacity-50">{saving ? <LoaderCircle size={17} className="animate-spin" /> : <Check size={17} />}{saving ? 'Saving booking...' : editing ? 'Save changes' : 'Create booking'}</button>
            <p className="mt-3 text-center text-xs text-stone-500">Availability is confirmed again when you save.</p>
          </aside>
        </div>
      </form>
    </main>
  );
}

export default BookingWorkspacePage;