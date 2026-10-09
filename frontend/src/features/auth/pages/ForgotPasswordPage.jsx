import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { authService } from '../services/auth.service';
import AuthImagePanel from '../components/AuthImagePanel';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      const response = await authService.requestPasswordReset({ email });
      setMessage(response?.data?.message || 'If an active account exists for this email, you will receive a password reset link shortly.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to request a password reset. Please try again later.');
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
                <h1 className="mt-2 text-3xl font-semibold text-[#252a29]">Forgot password?</h1>
                <p className="mt-2 text-sm text-[#747b78]">Enter your account email and we’ll send you a secure reset link.</p>
              </div>
              <span className="grid size-10 shrink-0 place-items-center border border-[#e6e8e4] bg-[#f8f9f6] text-[#6132DA]"><Mail size={17} /></span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="recovery-email" className="mb-2 block text-xs font-semibold text-[#414846]">Email address</label>
                <input
                  id="recovery-email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={150}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="min-h-12 w-full rounded-full border border-[#dfe3df] bg-white px-5 text-sm text-[#252a29] outline-none transition placeholder:text-[#b5bbb8] focus:border-[#7046E8] focus:ring-4 focus:ring-[#7046E8]/10"
                  placeholder="you@yourshop.com"
                />
              </div>

              {message && <div role="status" className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
              {error && <div role="alert" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#6132DA] px-5 text-sm font-semibold text-white transition hover:bg-[#4D25B5] focus:outline-none focus:ring-4 focus:ring-[#6132DA]/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Sending...' : 'Send reset link'}
              </button>
            </form>

            <Link to="/auth/login" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#6132DA] hover:text-[#43209B]">
              <ArrowLeft size={15} /> Back to sign in
            </Link>
            <p className="mt-12 text-center text-[11px] text-[#a1a6a2]">© {new Date().getFullYear()} TrackinHub</p>
          </div>
        </section>
      </section>
    </main>
  );
}

export default ForgotPasswordPage;
