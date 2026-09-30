import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, UserRoundPlus } from 'lucide-react';
import { customerService } from '../services/customer.service';

const emptyForm = {
  firstName: '',
  lastName: '',
  phone: '',
  alternatePhone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  notes: '',
};

function CustomerFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const draftId = searchParams.get('draftId');
  const isEditing = Boolean(id);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(Boolean(id || draftId));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitNotice, setSubmitNotice] = useState('');

  useEffect(() => {
    if (!id && !draftId) return undefined;

    let active = true;
    const loadCustomerForm = async () => {
      try {
        const response = id
          ? await customerService.getCustomer(id)
          : await customerService.getCustomerDraft(draftId);
        const customer = id ? response?.data?.data || {} : response?.data?.data?.customer || {};
        if (!active) return;
        setForm({ ...emptyForm,
          firstName: customer.firstName || '',
          lastName: customer.lastName || '',
          phone: String(customer.phone || '').replace(/^(\+?91)/, '').replace(/\D/g, '').slice(0, 10),
          alternatePhone: String(customer.alternatePhone || '').replace(/^(\+?91)/, '').replace(/\D/g, '').slice(0, 10),
          email: customer.email || '',
          address: customer.address || '',
          city: customer.city || '',
          state: customer.state || '',
          pincode: customer.pincode || '',
          notes: customer.notes || '',
        });
      } catch (error) {
        if (active) setSubmitError(error.response?.data?.message || 'Unable to load the customer form.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadCustomerForm();
    return () => {
      active = false;
    };
  }, [id, draftId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    const nextValue = ['phone', 'alternatePhone'].includes(name)
      ? value.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '').slice(0, 10)
      : value;
    setForm((previous) => ({ ...previous, [name]: nextValue }));
    setSubmitError('');
    setSubmitNotice('');
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    setSubmitError('');
    setSubmitNotice('');

    try {
      const response = draftId
        ? await customerService.updateCustomerDraft(draftId, form)
        : await customerService.createCustomerDraft(form);
      const savedDraftId = response?.data?.data?.id;
      if (savedDraftId && !draftId) {
        setSearchParams({ draftId: String(savedDraftId) }, { replace: true });
      }
      setSubmitNotice('Draft saved. You can resume it from Customer drafts.');
    } catch (error) {
      const apiErrors = error.response?.data?.error?.details || [];
      if (apiErrors.length > 0) {
        setSubmitError(apiErrors.map((item) => item.message).join(' '));
      } else {
        setSubmitError(error.response?.data?.message || 'Unable to save customer draft.');
      }
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      if (isEditing) {
        await customerService.updateCustomer(id, form);
        navigate(`/customers/${id}`);
        return;
      }

      const response = await customerService.createCustomer(form);
      const createdCustomer = response?.data?.data;
      if (draftId) {
        try {
          await customerService.deleteCustomerDraft(draftId);
        } catch (draftCleanupError) {
          console.error('Customer was created, but its draft could not be removed.', draftCleanupError);
        }
      }
      navigate(createdCustomer?.id ? `/customers/${createdCustomer.id}` : '/customers');
    } catch (error) {
      const apiErrors = error.response?.data?.error?.details || [];
      if (apiErrors.length > 0) {
        const messages = apiErrors.map((item) => item.message).join(' ');
        setSubmitError(messages);
        return;
      }

      setSubmitError(error.response?.data?.message || 'Unable to save customer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <main className="flex min-h-full items-center justify-center bg-[#f8f9f6] px-4 py-12 text-sm text-[#59615e]">Loading customer form...</main>;
  }

  const inputClassName = 'min-h-11 w-full rounded-md border border-[#dfe3df] bg-white px-3.5 text-sm text-[#252a29] outline-none transition placeholder:text-[#747b78] focus:border-[#805361] focus:ring-4 focus:ring-[#805361]/10';
  const title = isEditing ? 'Edit Customer' : draftId ? 'Continue Customer Draft' : 'New Customer';

  return (
    <main className="min-h-full bg-[#f8f9f6] px-4 py-6 text-[#252a29] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1120px]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <header className="flex flex-col gap-5 border-b border-[#e8eae7] pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-col items-start gap-2">
              <Link to="/customers" className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[#68404b] transition hover:text-[#54333d]">
                <ArrowLeft size={16} />
                Customers
              </Link>
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold text-[#252a29]">{title}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#59615e]">Create a tailored customer dossier for ceremonial rental reservations, blouse craftsmanship, and bridal concierge.</p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link to="/customers" className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#dfe3df] bg-white px-4 text-sm font-medium text-[#414846] transition hover:bg-[#f8f9f6]">Cancel</Link>
              {!isEditing && (
                <button type="button" onClick={handleSaveDraft} disabled={isSavingDraft || isSubmitting} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[#cbb9bd] bg-white px-4 text-sm font-semibold text-[#68404b] transition hover:bg-[#f8f9f6] disabled:cursor-not-allowed disabled:opacity-60">
                  <Save size={15} />
                  {isSavingDraft ? 'Saving...' : 'Save as Draft'}
                </button>
              )}
              <button type="submit" disabled={isSubmitting || isSavingDraft} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#68404b] px-4 text-sm font-semibold text-white transition hover:bg-[#54333d] focus:outline-none focus:ring-4 focus:ring-[#68404b]/20 disabled:cursor-not-allowed disabled:opacity-60">
                <UserRoundPlus size={15} />
                {isSubmitting ? 'Saving Customer...' : isEditing ? 'Save Changes' : 'Save & Create Customer'}
              </button>
            </div>
          </header>

          {submitError && <div role="alert" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{submitError}</div>}
          {submitNotice && <div role="status" className="border border-[#dfe3df] bg-white px-4 py-3 text-sm text-[#414846]">{submitNotice}</div>}

          <section className="border border-[#e6e8e4] bg-white">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8eae7] px-5 py-4 sm:px-7">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-[#f1e9eb] text-xs font-bold text-[#68404b]">01</span>
                <div>
                  <h2 className="text-base font-semibold text-[#252a29]">Personal Information</h2>
                  <p className="mt-1 text-xs leading-5 text-[#59615e]">Core client contact, relation hierarchy, and primary auspicious dates.</p>
                </div>
              </div>
            </header>

            <div className="grid gap-x-5 gap-y-5 px-5 py-5 sm:grid-cols-2 sm:px-7 sm:py-6">
              <div>
                <label htmlFor="customer-first-name" className="mb-2 block text-xs font-semibold text-[#252a29]">First Name <span className="text-[#68404b]">*</span></label>
                <input id="customer-first-name" name="firstName" value={form.firstName} onChange={handleChange} autoComplete="given-name" maxLength={100} required className={inputClassName} />
              </div>
              <div>
                <label htmlFor="customer-last-name" className="mb-2 block text-xs font-semibold text-[#252a29]">Last Name</label>
                <input id="customer-last-name" name="lastName" value={form.lastName} onChange={handleChange} autoComplete="family-name" maxLength={100} className={inputClassName} />
              </div>
              <div>
                <label htmlFor="customer-phone" className="mb-2 block text-xs font-semibold text-[#252a29]">Primary Phone Number <span className="text-[#68404b]">*</span></label>
                <div className="flex min-h-11 overflow-hidden rounded-md border border-[#dfe3df] focus-within:border-[#805361] focus-within:ring-4 focus-within:ring-[#805361]/10">
                  <span aria-hidden="true" className="flex items-center border-r border-[#e6e8e4] bg-[#f8f9f6] px-3 text-sm font-medium text-[#414846]">+91</span>
                  <input id="customer-phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" pattern="[6-9][0-9]{9}" maxLength={10} value={form.phone} onChange={handleChange} required className="min-w-0 flex-1 bg-white px-3.5 text-sm text-[#252a29] outline-none placeholder:text-[#747b78]" />
                </div>
              </div>
              <div>
                <label htmlFor="customer-alternate-phone" className="mb-2 block text-xs font-semibold text-[#252a29]">WhatsApp / Alternate Contact</label>
                <div className="flex min-h-11 overflow-hidden rounded-md border border-[#dfe3df] focus-within:border-[#805361] focus-within:ring-4 focus-within:ring-[#805361]/10">
                  <span aria-hidden="true" className="flex items-center border-r border-[#e6e8e4] bg-[#f8f9f6] px-3 text-sm font-medium text-[#414846]">+91</span>
                  <input id="customer-alternate-phone" name="alternatePhone" type="tel" inputMode="numeric" autoComplete="tel-national" pattern="[6-9][0-9]{9}" maxLength={10} value={form.alternatePhone} onChange={handleChange} className="min-w-0 flex-1 bg-white px-3.5 text-sm text-[#252a29] outline-none placeholder:text-[#747b78]" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="customer-email" className="mb-2 block text-xs font-semibold text-[#252a29]">Email Address</label>
                <input id="customer-email" type="email" name="email" value={form.email} onChange={handleChange} autoComplete="email" maxLength={150} className={inputClassName} />
              </div>
            </div>
          </section>

          <section className="border border-[#e6e8e4] bg-white">
            <header className="border-b border-[#e8eae7] px-5 py-4 sm:px-7">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-[#f8f9f6] text-xs font-bold text-[#68404b]">02</span>
                <div>
                  <h2 className="text-base font-semibold text-[#252a29]">Address &amp; Residence</h2>
                  <p className="mt-1 text-xs text-[#59615e]">Where fittings and order coordination should be directed.</p>
                </div>
              </div>
            </header>
            <div className="grid gap-x-5 gap-y-5 px-5 py-5 sm:grid-cols-2 sm:px-7 sm:py-6">
              <div className="sm:col-span-2">
                <label htmlFor="customer-address" className="mb-2 block text-xs font-semibold text-[#252a29]">Street Address</label>
                <input id="customer-address" name="address" value={form.address} onChange={handleChange} autoComplete="street-address" maxLength={255} className={inputClassName} />
              </div>
              <div>
                <label htmlFor="customer-city" className="mb-2 block text-xs font-semibold text-[#252a29]">City</label>
                <input id="customer-city" name="city" value={form.city} onChange={handleChange} autoComplete="address-level2" maxLength={100} className={inputClassName} />
              </div>
              <div>
                <label htmlFor="customer-state" className="mb-2 block text-xs font-semibold text-[#252a29]">State</label>
                <input id="customer-state" name="state" value={form.state} onChange={handleChange} autoComplete="address-level1" maxLength={100} className={inputClassName} />
              </div>
              <div>
                <label htmlFor="customer-pincode" className="mb-2 block text-xs font-semibold text-[#252a29]">Pincode</label>
                <input id="customer-pincode" name="pincode" value={form.pincode} onChange={handleChange} inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{6}" maxLength={6} className={inputClassName} />
              </div>
            </div>
          </section>

          <section className="border border-[#e6e8e4] bg-white">
            <header className="border-b border-[#e8eae7] px-5 py-4 sm:px-7">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-[#f8f9f6] text-xs font-bold text-[#68404b]">03</span>
                <div>
                  <h2 className="text-base font-semibold text-[#252a29]">Additional Information</h2>
                  <p className="mt-1 text-xs text-[#59615e]">Keep fitting, ceremony, and concierge notes together.</p>
                </div>
              </div>
            </header>
            <div className="px-5 py-5 sm:px-7 sm:py-6">
              <label htmlFor="customer-notes" className="mb-2 block text-xs font-semibold text-[#252a29]">Notes</label>
              <textarea id="customer-notes" name="notes" value={form.notes} onChange={handleChange} rows={4} maxLength={1000} className={`${inputClassName} resize-y py-3`} />
            </div>
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e8eae7] pt-4">
            <Link to="/customers" className="text-sm font-medium text-[#59615e] hover:text-[#252a29]">Cancel</Link>
            <div className="flex flex-wrap items-center gap-2">
              {!isEditing && (
                <button type="button" onClick={handleSaveDraft} disabled={isSavingDraft || isSubmitting} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#cbb9bd] bg-white px-4 text-sm font-semibold text-[#68404b] transition hover:bg-[#f8f9f6] disabled:cursor-not-allowed disabled:opacity-60">
                  <Save size={15} />
                  {isSavingDraft ? 'Saving...' : 'Save as Draft'}
                </button>
              )}
              <button type="submit" disabled={isSubmitting || isSavingDraft} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#68404b] px-4 text-sm font-semibold text-white transition hover:bg-[#54333d] disabled:cursor-not-allowed disabled:opacity-60">
                <UserRoundPlus size={15} />
                {isSubmitting ? 'Saving Customer...' : isEditing ? 'Save Changes' : 'Save & Create Customer'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </main>
  );
}

export default CustomerFormPage;
