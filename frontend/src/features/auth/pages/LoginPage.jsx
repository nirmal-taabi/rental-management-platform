import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, LockKeyhole, Shirt } from 'lucide-react';
import { authService } from '../services/auth.service';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [form, setForm] = useState({ email: location.state?.email || '', password: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: '' }));
    setSubmitError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const response = await authService.login(form);
      const payload = response?.data?.data || {};
      setSession(payload.user || null, payload.shop || null);
      navigate('/dashboard');
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to login. Please try again.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <section className="grid min-h-screen w-full overflow-hidden bg-white md:grid-cols-2">
        <aside className="relative order-2 isolate flex min-h-[280px] flex-col justify-between overflow-hidden bg-[#3d252b] px-7 py-7 text-white sm:px-10 sm:py-9 md:order-1 md:min-h-full md:px-12 md:py-11">
          <img
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1800&q=85"
            alt="Carefully selected garments in a fashion boutique"
            className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(160deg,rgba(35,24,28,0.74)_0%,rgba(71,38,45,0.28)_48%,rgba(31,30,29,0.72)_100%)]" />

          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center border border-white/35 bg-white/10 backdrop-blur-sm"><Shirt size={19} strokeWidth={1.7} /></span>
            <div>
              <p className="text-sm font-semibold">Rental Management</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-white/70">Clothing, in good company</p>
            </div>
          </div>

          <div className="max-w-lg py-12 md:py-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">A considered way to rent</p>
            <h2 className="mt-4 max-w-md text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">Every occasion deserves a little more choice.</h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/80">Your shop workspace, ready when you are.</p>
          </div>

          <div className="flex items-center justify-between gap-4 text-xs text-white/70">
            <span>Made for rental wardrobes</span>
            <span className="h-px w-16 bg-white/50" />
            <span>India</span>
          </div>
        </aside>

        <section className="order-1 flex min-w-0 items-center justify-center px-6 py-12 sm:px-12 md:order-2 md:px-14 lg:px-20">
          <div className="w-full max-w-[390px]">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8a5360]">Shop access</p>
                <h1 className="mt-2 text-3xl font-semibold text-[#252a29]">Welcome back</h1>
                <p className="mt-2 text-sm text-[#747b78]">Sign in to continue to your workspace.</p>
              </div>
              <span className="grid size-10 shrink-0 place-items-center border border-[#e6e8e4] bg-[#f8f9f6] text-[#68404b]"><LockKeyhole size={17} /></span>
            </div>

            <div className="mb-6 flex items-center gap-3 text-[11px] font-medium text-[#a1a5a2]">
              <span className="h-px flex-1 bg-[#e8eae7]" />
              <span>SECURE SIGN IN</span>
              <span className="h-px flex-1 bg-[#e8eae7]" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="login-email" className="mb-2 block text-xs font-semibold text-[#414846]">Email address</label>
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  autoComplete="username"
                  value={form.email}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.email)}
                  className="min-h-12 w-full rounded-full border border-[#dfe3df] bg-white px-5 text-sm text-[#252a29] outline-none transition placeholder:text-[#b5bbb8] focus:border-[#805361] focus:ring-4 focus:ring-[#805361]/10"
                  placeholder="you@yourshop.com"
                />
                {errors.email && <p className="mt-1.5 text-xs text-rose-700">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="login-password" className="mb-2 block text-xs font-semibold text-[#414846]">Password</label>
                <input
                  id="login-password"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.password)}
                  className="min-h-12 w-full rounded-full border border-[#dfe3df] bg-white px-5 text-sm text-[#252a29] outline-none transition placeholder:text-[#b5bbb8] focus:border-[#805361] focus:ring-4 focus:ring-[#805361]/10"
                  placeholder="Enter your password"
                />
                {errors.password && <p className="mt-1.5 text-xs text-rose-700">{errors.password}</p>}
              </div>

              <div className="flex justify-end">
                <button type="button" disabled className="text-xs font-medium text-[#865767] opacity-65 disabled:cursor-not-allowed">Forgot password?</button>
              </div>

              {submitError && <div role="alert" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{submitError}</div>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#68404b] px-5 text-sm font-semibold text-white transition hover:bg-[#54333d] focus:outline-none focus:ring-4 focus:ring-[#68404b]/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
                {!isSubmitting && <ArrowRight size={16} />}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-[#717875]">New to the platform? <Link to="/auth/register" className="font-semibold text-[#68404b] underline decoration-[#cbb9bd] underline-offset-4 hover:text-[#4f3039]">Register your shop</Link></p>
            <p className="mt-12 text-center text-[11px] text-[#a1a6a2]">© {new Date().getFullYear()} Rental Management Platform</p>
          </div>
        </section>
      </section>
    </main>
  );
}

export default LoginPage;
