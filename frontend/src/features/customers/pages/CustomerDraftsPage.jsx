import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Plus, Trash2 } from 'lucide-react';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog';
import { customerService } from '../services/customer.service';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

function CustomerDraftsPage() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [draftToDelete, setDraftToDelete] = useState(null);

  useEffect(() => {
    let active = true;
    customerService.getCustomerDrafts()
      .then((response) => {
        if (active) setDrafts(response?.data?.data || []);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load customer drafts.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleDelete = async () => {
    if (!draftToDelete) return;
    setDeletingId(draftToDelete.id);
    setError('');
    try {
      await customerService.deleteCustomerDraft(draftToDelete.id);
      setDrafts((previous) => previous.filter((draft) => draft.id !== draftToDelete.id));
      setDraftToDelete(null);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to delete customer draft.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="min-h-full bg-[#f8f9f6] px-4 py-7 text-[#252a29] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[#e8eae7] pb-5">
          <div>
            <Link to="/customers" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#6132DA] hover:text-[#4D25B5]">
              <ArrowLeft size={16} /> Customers
            </Link>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8060D9]">Customer onboarding</p>
            <h1 className="mt-1 text-3xl font-semibold text-[#252a29]">Saved drafts</h1>
            <p className="mt-2 text-sm text-[#59615e]">Resume a customer profile or remove an unfinished draft.</p>
          </div>
          <Link to="/customers/new" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#6132DA] px-3.5 text-sm font-semibold text-white transition hover:bg-[#4D25B5] focus:outline-none focus:ring-4 focus:ring-[#6132DA]/20">
            <Plus size={16} /> New customer
          </Link>
        </header>

        {error && <div role="alert" className="mb-4 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

        <section aria-label="Saved customer drafts" className="border border-[#e6e8e4] bg-white">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(140px,220px)_auto] items-center gap-4 border-b border-[#e8eae7] bg-[#f8f9f6] px-4 py-3 text-xs font-semibold text-[#414846] sm:px-5">
            <span>Customer</span>
            <span className="hidden sm:block">Last saved</span>
            <span className="text-right">Actions</span>
          </div>
          {loading && <p className="px-5 py-10 text-center text-sm text-[#59615e]">Loading drafts...</p>}
          {!loading && drafts.length === 0 && (
            <div className="px-5 py-12 text-center">
              <FileText size={22} className="mx-auto text-[#6132DA]" />
              <p className="mt-3 text-sm font-semibold text-[#252a29]">No saved drafts</p>
              <p className="mt-1 text-sm text-[#59615e]">Use Save Draft while creating a customer to keep an unfinished profile here.</p>
            </div>
          )}
          {!loading && drafts.map((draft) => {
            const customer = draft.customer || {};
            const customerName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || 'Untitled customer';
            const contact = [customer.phone, customer.email].filter(Boolean).join(' · ') || 'No contact details yet';

            return (
              <article key={draft.id} className="grid grid-cols-[minmax(0,1fr)_minmax(140px,220px)_auto] items-center gap-4 border-b border-[#eef0ed] px-4 py-4 last:border-b-0 sm:px-5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#252a29]">{customerName}</p>
                  <p className="mt-1 truncate text-xs text-[#59615e]">{contact}</p>
                </div>
                <p className="hidden text-xs text-[#59615e] sm:block">{formatDate(draft.updatedAt)}</p>
                <div className="flex items-center justify-end gap-2">
                  <Link to={`/customers/new?draftId=${draft.id}`} className="inline-flex min-h-9 items-center gap-2 rounded-md bg-[#6132DA] px-3 text-xs font-semibold text-white transition hover:bg-[#4D25B5]">
                    Resume
                  </Link>
                  <button
                    type="button"
                    aria-label={`Delete draft for ${customerName}`}
                    title="Delete draft"
                    disabled={deletingId === draft.id}
                    onClick={() => setDraftToDelete(draft)}
                    className="grid size-9 place-items-center rounded-md border border-[#dfe3df] text-[#59615e] transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800 disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </div>
      <ConfirmationDialog
        isOpen={Boolean(draftToDelete)}
        title="Delete saved draft?"
        message={draftToDelete ? `Delete the saved profile for ${[draftToDelete.customer?.firstName, draftToDelete.customer?.lastName].filter(Boolean).join(' ') || 'this customer'}? This action cannot be undone.` : ''}
        confirmLabel="Delete draft"
        isConfirming={Boolean(deletingId)}
        destructive
        onCancel={() => setDraftToDelete(null)}
        onConfirm={handleDelete}
      />
    </main>
  );
}

export default CustomerDraftsPage;