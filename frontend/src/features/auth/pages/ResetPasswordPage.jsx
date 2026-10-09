import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import { authService } from '../services/auth.service';
import AuthImagePanel from '../components/AuthImagePanel';

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!token) {
      setError('This password reset link is invalid or incomplete. Request a new one.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    try {
      await authService.resetPassword({ token, ...form });
      setIsComplete(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'This password reset link is invalid or has expired. Request a new one.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <section className="grid min-h-screen w-full overflow-hidden bg-white md:grid-cols-2">
        <AuthImagePanel />
        <section className="order-1 flex min-w-0 items-center justify-center px-6 py-12 sm:px-12 md:order-2 md:px-14 lg:px-20">
          <div className="w-full max-w-[390px]">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8060D9]">Account recovery</p>
                <h1 className="mt-2 text-3xl font-semibold text-[#252a29]">{isComplete ? 'Password updated' : 'Create a new password'}</h1>
                <p className="mt-2 text-sm text-[#747b78]">
                  {isComplete ? 'Your password has been reset. Sign in with your new password.' : 'Choose a strong password for your TrackinHub account.'}
                </p>
              </div>
              <span className="grid size-10 shrink-0 place-items-center border border-[#e6e8e4] bg-[#f8f9f6] text-[#6132DA]"><LockKeyhole size={17} /></span>
            </div>

            {isComplete ? (
              <Link to="/auth/login" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#6132DA] px-5 text-sm font-semibold text-white transition hover:bg-[#4D25B5]">
                <ArrowLeft size={15} /> Back to sign in
              </Link>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="reset-password" className="mb-2 block text-xs font-semibold text-[#414846]">New password</label>
                    <input
                      id="reset-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      maxLength={72}
                      value={form.newPassword}
                      onChange={(event) => setForm((previous) => ({ ...previous, newPassword: event.target.value }))}
                      className="min-h-12 w-full rounded-full border border-[#dfe3df] bg-white px-5 text-sm text-[#252a29] outline-none transition focus:border-[#7046E8] focus:ring-4 focus:ring-[#7046E8]/10"
                    />
                    <p className="mt-1.5 text-xs text-[#747b78]">At least 8 characters, including uppercase, lowercase, number, and symbol.</p>
                  </div>
                  <div>
                    <label htmlFor="reset-confirm-password" className="mb-2 block text-xs font-semibold text-[#414846]">Confirm new password</label>
                    <input
                      id="reset-confirm-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      maxLength={72}
                      value={form.confirmPassword}
                      onChange={(event) => setForm((previous) => ({ ...previous, confirmPassword: event.target.value }))}
                      className="min-h-12 w-full rounded-full border border-[#dfe3df] bg-white px-5 text-sm text-[#252a29] outline-none transition focus:border-[#7046E8] focus:ring-4 focus:ring-[#7046E8]/10"
                    />
                  </div>
                  {error && <div role="alert" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
                  <button
                    type="submit"
                    disabled={isSubmitting || !token}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#6132DA] px-5 text-sm font-semibold text-white transition hover:bg-[#4D25B5] focus:outline-none focus:ring-4 focus:ring-[#6132DA]/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? 'Updating password...' : 'Reset password'}
                  </button>
                  {!token && <p role="alert" className="text-sm text-rose-700">This reset link is missing its token. Request a new link.</p>}
                </form>
                <Link to="/auth/forgot-password" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#6132DA] hover:text-[#43209B]">
                  <ArrowLeft size={15} /> Request a new link
                </Link>
              </>
            )}
            <p className="mt-12 text-center text-[11px] text-[#a1a6a2]">© {new Date().getFullYear()} TrackinHub</p>
          </div>
        </section>
      </section>
    </main>
  );
}

export default ResetPasswordPage;
