import { useState } from 'react';
import { Plus, Store, X } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog';
import { shopService } from '../services/shop.service';

const initialShopForm = {
  name: '',
  businessName: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  gstNumber: '',
};

const getShopForm = (shop) => ({
  name: shop?.name || '',
  businessName: shop?.businessName || '',
  phone: shop?.phone || '',
  email: shop?.email || '',
  address: shop?.address || '',
  city: shop?.city || '',
  state: shop?.state || '',
  pincode: shop?.pincode || '',
  gstNumber: shop?.gstNumber || '',
});

const shopFields = [
  { name: 'name', label: 'Shop name', type: 'text' },
  { name: 'businessName', label: 'Business name', type: 'text' },
  { name: 'phone', label: 'Phone', type: 'tel' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'address', label: 'Address', type: 'text', wide: true },
  { name: 'city', label: 'City', type: 'text' },
  { name: 'state', label: 'State', type: 'text' },
  { name: 'pincode', label: 'Pincode', type: 'text' },
  { name: 'gstNumber', label: 'GST number', type: 'text' },
];

const fieldClassName =
  'mt-1 min-h-11 w-full rounded-md border border-[#dfe3df] bg-white px-3 text-sm text-[#252a29] outline-none transition placeholder:text-[#a1a6a2] focus:border-[#7046E8] focus:ring-2 focus:ring-[#7046E8]/10';

function ShopManagementPage() {
  const { shop: currentShop, availableShops, roles, refreshShops, reloadSession, switchShop } = useAuth();
  const canCreateShop = roles.some((role) => ['OWNER', 'ADMIN'].includes(String(role).toUpperCase()));
  const [shopForm, setShopForm] = useState(initialShopForm);
  const [editingShop, setEditingShop] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [switchingShopId, setSwitchingShopId] = useState(null);
  const [updatingStatusShopId, setUpdatingStatusShopId] = useState(null);
  const [shopToDeactivate, setShopToDeactivate] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [createdShop, setCreatedShop] = useState(null);

  const openCreateShop = () => {
    setEditingShop(null);
    setShopForm(initialShopForm);
    setFieldErrors({});
    setError('');
    setIsFormOpen(true);
  };

  const openEditShop = (shop) => {
    setEditingShop(shop);
    setShopForm(getShopForm(shop));
    setFieldErrors({});
    setError('');
    setIsFormOpen(true);
  };

  const closeShopForm = () => {
    if (isSaving) return;
    setIsFormOpen(false);
    setEditingShop(null);
    setFieldErrors({});
    setError('');
  };

  const updateField = (name, value) => {
    setShopForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
    setError('');
  };

  const handleSaveShop = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setFieldErrors({});
    setSuccessMessage('');
    setCreatedShop(null);

    try {
      if (editingShop) {
        await shopService.updateShop(editingShop.id, shopForm);
        await refreshShops();
        if (String(editingShop.id) === String(currentShop?.id)) await reloadSession();
        setSuccessMessage('Shop details updated successfully.');
      } else {
        const response = await shopService.createShop(shopForm);
        const created = response?.data?.data || null;
        setCreatedShop(created);
        setSuccessMessage('Shop created successfully. Switch to it when you are ready.');
        await refreshShops();
      }
      setIsFormOpen(false);
      setEditingShop(null);
      setShopForm(initialShopForm);
    } catch (requestError) {
      const details = requestError.response?.data?.error?.details || [];
      if (details.length) {
        setFieldErrors(Object.fromEntries(details.map((item) => [item.field, item.message])));
      }
      setError(
        requestError.response?.data?.message ||
          `Unable to ${editingShop ? 'update' : 'create'} this shop.`,
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSwitchShop = async (nextShop) => {
    if (
      !nextShop ||
      String(nextShop.id) === String(currentShop?.id) ||
      nextShop.status !== 'ACTIVE'
    )
      return;
    setSwitchingShopId(nextShop.id);
    setError('');
    try {
      await switchShop(nextShop.id);
      window.location.reload();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to switch shops.');
      setSwitchingShopId(null);
    }
  };

  const updateShopStatus = async (targetShop, nextStatus) => {
    setUpdatingStatusShopId(targetShop.id);
    setError('');
    try {
      const isCurrentShop = String(targetShop.id) === String(currentShop?.id);
      if (isCurrentShop && nextStatus === 'INACTIVE') {
        const fallbackShop = availableShops.find(
          (item) => String(item.id) !== String(targetShop.id) && item.status === 'ACTIVE',
        );
        if (fallbackShop) await switchShop(fallbackShop.id);
      }
      await shopService.updateStatus(targetShop.id, nextStatus);
      await refreshShops();
      if (isCurrentShop && nextStatus === 'INACTIVE') await reloadSession();
      setSuccessMessage(
        nextStatus === 'ACTIVE' ? 'Shop activated successfully.' : 'Shop deactivated successfully.',
      );
      setShopToDeactivate(null);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update shop status.');
    } finally {
      setUpdatingStatusShopId(null);
    }
  };

  return (
    <main className="min-h-full bg-[#f8f9f6] px-4 py-7 text-[#252a29] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#e8eae7] pb-5">
          <div>
            <h1 className="text-3xl font-semibold">Shops &amp; Branches</h1>
            <p className="mt-1 text-sm text-[#59615e]">
              Manage the rental shops available to your account.
            </p>
          </div>
          {canCreateShop && (
            <button
              type="button"
              onClick={openCreateShop}
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#6132DA] px-4 text-sm font-semibold text-white transition hover:bg-[#4D25B5]"
            >
              <Plus size={16} /> Create shop
            </button>
          )}
        </header>

        {error && !isFormOpen && (
          <div
            role="alert"
            className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            {error}
          </div>
        )}
        {successMessage && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          >
            <span>{successMessage}</span>
            {createdShop && (
              <button
                type="button"
                onClick={() => handleSwitchShop(createdShop)}
                className="min-h-9 rounded-md bg-[#6132DA] px-3 text-xs font-semibold text-white transition hover:bg-[#4D25B5]"
              >
                Switch to this shop
              </button>
            )}
          </div>
        )}

        <section className="w-full border border-[#e6e8e4] bg-white">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8eae7] px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-base font-semibold">Your shops</h2>
              <p className="mt-1 text-xs text-[#59615e]">
                Your role and access are managed separately for each shop.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs text-[#59615e]">
              <Store size={15} /> {availableShops.length}{' '}
              {availableShops.length === 1 ? 'shop' : 'shops'}
            </span>
          </header>
          <div className="divide-y divide-[#eef0ed] px-5 sm:px-6">
            {availableShops.map((availableShop) => {
              const isCurrentShop = String(availableShop.id) === String(currentShop?.id);
              const isActive = availableShop.status === 'ACTIVE';
              const canManage = ['OWNER', 'ADMIN'].includes(
                String(availableShop.role).toUpperCase(),
              );
              const location = [availableShop.city, availableShop.state].filter(Boolean).join(', ');
              return (
                <article
                  key={availableShop.id}
                  className="flex flex-wrap items-center justify-between gap-4 py-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-sm bg-[#f1f2ef] text-sm font-semibold text-[#6132DA]">
                      {availableShop.name?.trim()?.charAt(0)?.toUpperCase() || 'S'}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#252a29]">
                        {availableShop.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[#59615e]">
                        {location || 'Location not set'} · {availableShop.role}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {isCurrentShop && (
                      <span className="inline-flex min-h-8 items-center rounded-md bg-[#edf3ef] px-2.5 text-xs font-semibold text-[#35634c]">
                        Current shop
                      </span>
                    )}
                    {!isCurrentShop && (
                      <button
                        type="button"
                        disabled={
                          !isActive || switchingShopId !== null || updatingStatusShopId !== null
                        }
                        onClick={() => handleSwitchShop(availableShop)}
                        className="min-h-8 rounded-md border border-[#dfe3df] bg-white px-3 text-xs font-semibold text-[#414846] transition hover:bg-[#f8f9f6] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {switchingShopId === availableShop.id
                          ? 'Switching…'
                          : isActive
                            ? 'Switch'
                            : 'Inactive'}
                      </button>
                    )}
                    {canManage && (
                      <button
                        type="button"
                        disabled={isSaving || updatingStatusShopId !== null}
                        onClick={() => openEditShop(availableShop)}
                        className="min-h-8 rounded-md border border-[#dfe3df] bg-white px-3 text-xs font-semibold text-[#414846] transition hover:bg-[#f8f9f6] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Edit
                      </button>
                    )}
                    {canManage && (
                      <button
                        type="button"
                        disabled={updatingStatusShopId !== null || switchingShopId !== null}
                        onClick={() =>
                          isActive
                            ? setShopToDeactivate(availableShop)
                            : updateShopStatus(availableShop, 'ACTIVE')
                        }
                        className={`min-h-8 rounded-md border px-3 text-xs font-semibold transition disabled:cursor-wait disabled:opacity-50 ${isActive ? 'border-rose-200 bg-white text-rose-800 hover:bg-rose-50' : 'border-[#dfe3df] bg-white text-[#414846] hover:bg-[#f8f9f6]'}`}
                      >
                        {updatingStatusShopId === availableShop.id
                          ? 'Saving…'
                          : isActive
                            ? 'Deactivate'
                            : 'Activate'}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
            {!availableShops.length && (
              <p className="py-6 text-sm text-[#59615e]">No active shop memberships found.</p>
            )}
          </div>
        </section>
      </div>

      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-[#252a29]/45 p-0 sm:place-items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeShopForm();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="shop-form-title"
            className="max-h-[92vh] w-full overflow-y-auto rounded-sm border border-[#e6e8e4] bg-white shadow-xl sm:max-w-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-[#e8eae7] px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8060D9]">
                  Shops &amp; Branches
                </p>
                <h2 id="shop-form-title" className="mt-1 text-lg font-semibold">
                  {editingShop ? 'Edit shop details' : 'Create a shop'}
                </h2>
                {!editingShop && (
                  <p className="mt-1 text-xs text-[#59615e]">
                    You will be the OWNER of the new shop.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeShopForm}
                disabled={isSaving}
                aria-label="Close shop form"
                className="grid size-9 place-items-center rounded-md border border-[#dfe3df] text-[#414846] transition hover:bg-[#f8f9f6] disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </header>
            <form onSubmit={handleSaveShop} className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              {error && (
                <div
                  role="alert"
                  className="sm:col-span-2 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
                >
                  {error}
                </div>
              )}
              {shopFields.map((field) => {
                const inputId = `shop-form-${field.name}`;
                const fieldError = fieldErrors[field.name];
                const required =
                  field.name === 'name' ||
                  field.name === 'businessName' ||
                  (Boolean(editingShop) && field.name !== 'gstNumber');
                return (
                  <div key={field.name} className={field.wide ? 'sm:col-span-2' : ''}>
                    <label htmlFor={inputId} className="block text-xs font-semibold text-[#414846]">
                      {field.label}
                      {required ? ' *' : ''}
                    </label>
                    <input
                      id={inputId}
                      type={field.type}
                      required={required}
                      value={shopForm[field.name]}
                      onChange={(event) => updateField(field.name, event.target.value)}
                      placeholder={field.placeholder}
                      aria-invalid={Boolean(fieldError)}
                      aria-describedby={fieldError ? `${inputId}-error` : undefined}
                      className={`${fieldClassName} ${fieldError ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : ''}`}
                    />
                    {fieldError && (
                      <p id={`${inputId}-error`} className="mt-1 text-xs text-rose-700">
                        {fieldError}
                      </p>
                    )}
                  </div>
                );
              })}
              <footer className="flex flex-wrap justify-end gap-2 border-t border-[#e8eae7] pt-4 sm:col-span-2">
                <button
                  type="button"
                  onClick={closeShopForm}
                  disabled={isSaving}
                  className="min-h-10 rounded-md border border-[#dfe3df] bg-white px-4 text-sm font-semibold text-[#414846] transition hover:bg-[#f8f9f6] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#6132DA] px-4 text-sm font-semibold text-white transition hover:bg-[#4D25B5] disabled:cursor-wait disabled:opacity-60"
                >
                  {isSaving ? 'Saving…' : editingShop ? 'Save changes' : 'Create shop'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      <ConfirmationDialog
        isOpen={Boolean(shopToDeactivate)}
        title="Deactivate shop?"
        message={
          shopToDeactivate
            ? `Deactivate ${shopToDeactivate.name}? Its history will be preserved, but it will no longer be available for operations.`
            : ''
        }
        confirmLabel="Deactivate shop"
        isConfirming={updatingStatusShopId !== null}
        destructive
        onCancel={() => setShopToDeactivate(null)}
        onConfirm={() => shopToDeactivate && updateShopStatus(shopToDeactivate, 'INACTIVE')}
      />
    </main>
  );
}

export default ShopManagementPage;
