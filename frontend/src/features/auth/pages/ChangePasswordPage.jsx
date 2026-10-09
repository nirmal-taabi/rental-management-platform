import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';

function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user, roles, reloadSession } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      await authService.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      await reloadSession();
      navigate(roles.some((role) => String(role).toUpperCase() === 'SUPER_ADMIN')
        ? '/admin/overview'
        : '/dashboard',
      { replace: true });
    } catch (requestError) {
      const details = requestError.response?.data?.error?.details || [];
      const code = requestError.response?.data?.error?.code;
      setError(
        details.map((item) => item.message).join(' ')
          || (code === 'INVALID_CREDENTIALS' ? 'Temporary password is incorrect.' : '')
          || requestError.response?.data?.message
          || 'Unable to update your password.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f9f6] px-4 py-10">
      <section className="w-full max-w-md border border-[#e7e6ec] bg-white p-6 shadow-sm sm:p-8">
        <span className="grid size-11 place-items-center rounded-full bg-[#f2edff] text-[#6132DA]"><KeyRound size={20} /></span>
        <h1 className="mt-5 text-2xl font-semibold text-[#252a29]">Set your password</h1>
        <p className="mt-2 text-sm leading-6 text-[#59615e]">
          Welcome, {user?.name || 'team member'}. Replace the temporary password before opening your workspace.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-xs font-semibold text-[#414846]">
            Temporary password
            <input name="currentPassword" type="password" autoComplete="current-password" required value={form.currentPassword} onChange={updateField} className="mt-1 min-h-11 w-full rounded-md border border-[#dfe3df] bg-white px-3 text-sm font-normal outline-none focus:border-[#7046E8] focus:ring-2 focus:ring-[#7046E8]/10" />
          </label>
          <label className="block text-xs font-semibold text-[#414846]">
            New password
            <input name="newPassword" type="password" autoComplete="new-password" required minLength={8} value={form.newPassword} onChange={updateField} className="mt-1 min-h-11 w-full rounded-md border border-[#dfe3df] bg-white px-3 text-sm font-normal outline-none focus:border-[#7046E8] focus:ring-2 focus:ring-[#7046E8]/10" />
          </label>
          <p className="-mt-2 text-xs text-[#74747e]">Use at least 8 characters with uppercase, lowercase, number, and special character.</p>
          <label className="block text-xs font-semibold text-[#414846]">
            Confirm new password
            <input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} value={form.confirmPassword} onChange={updateField} className="mt-1 min-h-11 w-full rounded-md border border-[#dfe3df] bg-white px-3 text-sm font-normal outline-none focus:border-[#7046E8] focus:ring-2 focus:ring-[#7046E8]/10" />
          </label>
          {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
          <button type="submit" disabled={isSaving} className="min-h-11 w-full rounded-md bg-[#6132DA] px-4 text-sm font-semibold text-white hover:bg-[#4D25B5] disabled:cursor-wait disabled:opacity-60">
            {isSaving ? 'Updating password…' : 'Update password'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default ChangePasswordPage;
