import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Copy, Plus, RefreshCw, Users, X } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog';
import { teamService } from '../services/team.service';

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  temporaryPassword: '',
};

const fieldClass = 'mt-1 min-h-11 w-full rounded-md border border-[#dfe3df] bg-white px-3 text-sm text-[#252a29] outline-none focus:border-[#7046E8] focus:ring-2 focus:ring-[#7046E8]/10';

const errorMessage = (error, fallback) => (
  error.response?.data?.message || fallback
);

function TeamManagementPage() {
  const { shop } = useAuth();
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [credentials, setCredentials] = useState(null);
  const [updatingMemberId, setUpdatingMemberId] = useState(null);
  const [memberToSuspend, setMemberToSuspend] = useState(null);

  const loadMembers = useCallback(async () => {
    try {
      const response = await teamService.getMembers();
      setMembers(response?.data?.data || []);
      setError('');
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to load staff accounts.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (shop?.role !== 'OWNER') return undefined;
    const timer = window.setTimeout(loadMembers, 0);
    return () => window.clearTimeout(timer);
  }, [loadMembers, shop?.role]);

  if (shop?.role !== 'OWNER') return <Navigate to="/dashboard" replace />;

  const handleCreate = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setFieldErrors({});
    setSuccessMessage('');
    setCredentials(null);
    try {
      await teamService.createMember(form);
      setCredentials({ email: form.email.trim().toLowerCase(), password: form.temporaryPassword });
      setSuccessMessage('Staff account created. Share the temporary password securely.');
      setForm(initialForm);
      setIsFormOpen(false);
      await loadMembers();
    } catch (requestError) {
      const details = requestError.response?.data?.error?.details || [];
      setFieldErrors(Object.fromEntries(details.map((item) => [item.field, item.message])));
      setError(errorMessage(requestError, 'Unable to create this staff account.'));
    } finally {
      setIsSaving(false);
    }
  };

  const updateMemberStatus = async (member, nextStatus) => {
    setUpdatingMemberId(member.id);
    setError('');
    setSuccessMessage('');
    try {
      await teamService.updateMemberStatus(member.id, nextStatus);
      setSuccessMessage(
        nextStatus === 'suspended'
          ? `${member.name}'s access to ${shop.name} has been suspended.`
          : `${member.name}'s access to ${shop.name} has been restored.`,
      );
      await loadMembers();
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to update this staff account.'));
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const copyCredentials = async () => {
    try {
      await navigator.clipboard.writeText(`Email: ${credentials.email}\nTemporary password: ${credentials.password}`);
      setSuccessMessage('Login details copied. Share them with the staff member using a secure channel.');
    } catch {
      setError('Unable to copy login details. Copy the email and password from the panel manually.');
    }
  };

  const openForm = () => {
    setForm(initialForm);
    setFieldErrors({});
    setError('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (isSaving) return;
    setIsFormOpen(false);
    setForm(initialForm);
    setFieldErrors({});
  };

  return (
    <div className="min-h-full bg-[#f8f9f6] px-4 py-7 text-[#252a29] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <header className="mb-6 flex flex-col gap-4 border-b border-[#e8eae7] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Staff accounts</h1>
            <p className="mt-1 text-sm text-[#747b78]">Manage team access and staff accounts for {shop?.name || 'this shop'}.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={loadMembers} disabled={isLoading} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#f1f2ef] px-3.5 text-xs font-medium text-[#414846] transition hover:bg-[#e8eae7] disabled:opacity-50">
              <RefreshCw size={15} /> {isLoading ? 'Loading...' : 'Refresh'}
            </button>
            <button type="button" onClick={openForm} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#6132DA] px-3.5 text-xs font-semibold text-white transition hover:bg-[#4D25B5] focus:outline-none focus:ring-4 focus:ring-[#6132DA]/20">
              <Plus size={16} /> Add staff
            </button>
          </div>
        </header>

        {error && <div role="alert" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
        {successMessage && <div role="status" className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{successMessage}</div>}
        {credentials && (
          <section className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Temporary login details</h2>
                <p className="mt-1">These details are shown only now. The staff member must change the temporary password at first sign-in.</p>
                <p className="mt-3">Email: <strong>{credentials.email}</strong></p>
                <p className="mt-1">Temporary password: <code className="rounded bg-white px-2 py-1">{credentials.password}</code></p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={copyCredentials} className="inline-flex min-h-9 items-center gap-2 border border-amber-300 bg-white px-3 text-xs font-semibold"><Copy size={14} /> Copy details</button>
                <button type="button" onClick={() => setCredentials(null)} className="min-h-9 border border-amber-300 bg-white px-3 text-xs font-semibold">Dismiss</button>
              </div>
            </div>
          </section>
        )}

        <section className="overflow-hidden border border-[#e6e8e4] bg-white">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8eae7] px-5 py-4 sm:px-6">
            <div><h2 className="text-base font-semibold">Team members</h2><p className="mt-1 text-xs text-[#59615e]">Suspending access only affects this shop; account history is retained.</p></div>
            <span className="inline-flex items-center gap-1.5 text-xs text-[#59615e]"><Users size={15} /> {members.length} {members.length === 1 ? 'member' : 'members'}</span>
          </header>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full divide-y divide-[#e8eae7] text-left text-sm">
              <thead className="bg-[#f8f9f6] text-[#747b78]">
                <tr>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold">Staff member</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold">Phone</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold">Email</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold">Access</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold">Joined</th>
                  <th scope="col" className="px-4 py-3 text-xs font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef0ed] bg-white">
                {isLoading
                  ? <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-[#747b78]">Loading staff accounts...</td></tr>
                  : members.length
                    ? members.map((member) => (
                      <tr key={member.id} className="transition-colors hover:bg-[#fbfcfa]">
                        <td className="px-4 py-3 text-sm font-medium text-[#252a29]">{member.name}<span className="mt-1 block text-xs font-normal text-[#747b78]">Staff member</span></td>
                        <td className="px-4 py-3 text-sm text-[#414846]">{member.phone || '—'}</td>
                        <td className="px-4 py-3 text-sm text-[#414846]">{member.email}</td>
                        <td className="px-4 py-3"><span className={`inline-flex min-h-7 items-center rounded-md px-2.5 text-xs font-semibold ${member.membershipStatus === 'active' ? 'bg-[#edf3ef] text-[#35634c]' : 'bg-rose-50 text-rose-800'}`}>{member.membershipStatus === 'active' ? 'Active' : 'Suspended'}</span></td>
                        <td className="px-4 py-3 text-sm text-[#59615e]">{member.joinedAt ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(member.joinedAt)) : '—'}</td>
                        <td className="px-4 py-3">
                          <button type="button" disabled={updatingMemberId === member.id || member.accountStatus !== 'active'} onClick={() => member.membershipStatus === 'active' ? setMemberToSuspend(member) : updateMemberStatus(member, 'active')} className={`inline-flex min-h-8 items-center rounded-md border px-3 text-xs font-semibold transition disabled:opacity-50 ${member.membershipStatus === 'active' ? 'border-rose-200 bg-white text-rose-800 hover:bg-rose-50' : 'border-[#dfe3df] bg-white text-[#414846] hover:bg-[#f8f9f6]'}`}>
                            {updatingMemberId === member.id ? 'Saving...' : member.membershipStatus === 'active' ? 'Suspend' : 'Reactivate'}
                          </button>
                        </td>
                      </tr>
                    ))
                    : <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-[#747b78]">No staff accounts found for this shop. Add a staff member to get started.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 bg-[#f8f9f6] p-3 md:hidden">
            {isLoading
              ? <p className="bg-white px-4 py-10 text-center text-sm text-[#747b78]">Loading staff accounts...</p>
              : members.length
                ? members.map((member) => (
                  <article key={member.id} className="border border-[#e6e8e4] bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-[#252a29]">{member.name}</h3>
                        <p className="mt-1 break-all text-sm text-[#59615e]">{member.email}</p>
                      </div>
                      <span className={`shrink-0 inline-flex min-h-7 items-center rounded-md px-2.5 text-xs font-semibold ${member.membershipStatus === 'active' ? 'bg-[#edf3ef] text-[#35634c]' : 'bg-rose-50 text-rose-800'}`}>{member.membershipStatus === 'active' ? 'Active' : 'Suspended'}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 border-y border-[#eef0ed] py-3 text-sm">
                      <div><p className="text-xs text-[#747b78]">Phone</p><p className="mt-1 text-[#414846]">{member.phone || '—'}</p></div>
                      <div><p className="text-xs text-[#747b78]">Joined</p><p className="mt-1 text-[#414846]">{member.joinedAt ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(member.joinedAt)) : '—'}</p></div>
                    </div>
                    <button type="button" disabled={updatingMemberId === member.id || member.accountStatus !== 'active'} onClick={() => member.membershipStatus === 'active' ? setMemberToSuspend(member) : updateMemberStatus(member, 'active')} className={`mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-md border px-3 text-sm font-semibold transition disabled:opacity-50 ${member.membershipStatus === 'active' ? 'border-rose-200 bg-white text-rose-800 hover:bg-rose-50' : 'border-[#dfe3df] bg-white text-[#414846] hover:bg-[#f8f9f6]'}`}>
                      {updatingMemberId === member.id ? 'Saving...' : member.membershipStatus === 'active' ? 'Suspend access' : 'Reactivate access'}
                    </button>
                  </article>
                ))
                : <p className="bg-white px-4 py-10 text-center text-sm text-[#747b78]">No staff accounts found for this shop. Add a staff member to get started.</p>}
          </div>
        </section>
      </div>

      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-[#252a29]/45 p-0 sm:place-items-center sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-form-title"
            className="max-h-[92vh] w-full overflow-y-auto rounded-sm border border-[#e6e8e4] bg-white shadow-xl sm:max-w-xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-[#e8eae7] px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8060D9]">Team members</p>
                <h2 id="staff-form-title" className="mt-1 text-lg font-semibold text-[#252a29]">Add staff account</h2>
                <p className="mt-1 text-xs text-[#59615e]">Add a teammate to {shop?.name || 'this shop'}.</p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                disabled={isSaving}
                aria-label="Close staff form"
                className="grid size-9 place-items-center rounded-md border border-[#dfe3df] text-[#414846] transition hover:bg-[#f8f9f6] disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </header>
            <form onSubmit={handleCreate} className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              <p className="text-sm leading-6 text-[#59615e] sm:col-span-2">
                The staff member will use a temporary password and be asked to set a new password at first sign-in.
              </p>
              <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
            {[
              ['firstName', 'First name', 'text', true],
              ['lastName', 'Last name', 'text', false],
              ['email', 'Email address', 'email', true],
              ['phone', 'Phone (optional)', 'tel', false],
              ['temporaryPassword', 'Temporary password', 'password', true],
            ].map(([name, label, type, required]) => (
              <label key={name} htmlFor={`staff-${name}`} className={`block text-xs font-semibold text-[#414846] ${name === 'temporaryPassword' ? 'sm:col-span-2' : ''}`}>
                {label}{required ? ' *' : ''}
                <input
                  id={`staff-${name}`}
                  type={type}
                  name={name}
                  value={form[name]}
                  required={required}
                  autoComplete={name === 'temporaryPassword' ? 'new-password' : name === 'email' ? 'email' : 'off'}
                  aria-invalid={Boolean(fieldErrors[name])}
                  aria-describedby={[
                    name === 'temporaryPassword' ? 'staff-password-help' : '',
                    fieldErrors[name] ? `staff-${name}-error` : '',
                  ].filter(Boolean).join(' ') || undefined}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, [name]: event.target.value }));
                    setFieldErrors((current) => ({ ...current, [name]: '' }));
                  }}
                  className={`${fieldClass} ${fieldErrors[name] ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : ''}`}
                />
                {name === 'temporaryPassword' && <span id="staff-password-help" className="mt-1 block font-normal text-[#747b78]">At least 8 characters, including uppercase, lowercase, number, and special character.</span>}
                {fieldErrors[name] && <span id={`staff-${name}-error`} className="mt-1 block font-normal text-rose-700">{fieldErrors[name]}</span>}
              </label>
            ))}
              </div>
              {error && <div role="alert" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:col-span-2">{error}</div>}
              <footer className="flex flex-wrap justify-end gap-2 border-t border-[#e8eae7] pt-4 sm:col-span-2">
                <button type="button" disabled={isSaving} onClick={closeForm} className="min-h-10 rounded-md border border-[#dfe3df] bg-white px-4 text-sm font-semibold text-[#414846] transition hover:bg-[#f8f9f6] disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={isSaving} className="inline-flex min-h-10 items-center justify-center rounded-md bg-[#6132DA] px-4 text-sm font-semibold text-white transition hover:bg-[#4D25B5] disabled:cursor-wait disabled:opacity-60">{isSaving ? 'Creating...' : 'Create staff account'}</button>
              </footer>
            </form>
          </section>
        </div>
      )}
      <ConfirmationDialog
        isOpen={Boolean(memberToSuspend)}
        title={`Suspend ${memberToSuspend?.name || 'staff member'}?`}
        message={`This immediately prevents ${memberToSuspend?.name || 'this staff member'} from accessing ${shop?.name || 'this shop'}. Their account and activity history will be retained.`}
        confirmLabel="Suspend access"
        isConfirming={updatingMemberId === memberToSuspend?.id}
        destructive
        onCancel={() => setMemberToSuspend(null)}
        onConfirm={async () => {
          await updateMemberStatus(memberToSuspend, 'suspended');
          setMemberToSuspend(null);
        }}
      />
    </div>
  );
}

export default TeamManagementPage;
