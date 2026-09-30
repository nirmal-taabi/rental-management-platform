import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Shirt, Store } from 'lucide-react';
import { authService } from '../services/auth.service';
import { locationService } from '../services/location.service';

const initialForm = {
  owner: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  },
  shop: {
    name: '',
    businessName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstNumber: '',
  },
};

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedStateId, setSelectedStateId] = useState('');
  const [isLoadingStates, setIsLoadingStates] = useState(true);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    let active = true;
    locationService.getStates()
      .then((response) => {
        if (active) setStates(response.data.data || []);
      })
      .catch(() => {
        if (active) setLocationError('Unable to load states. Please refresh and try again.');
      })
      .finally(() => {
        if (active) setIsLoadingStates(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedStateId) return undefined;

    let active = true;
    locationService.getCitiesByState(selectedStateId)
      .then((response) => {
        if (active) setCities(response.data.data || []);
      })
      .catch(() => {
        if (active) {
          setCities([]);
          setLocationError('Unable to load cities for this state. Please try again.');
        }
      })
      .finally(() => {
        if (active) setIsLoadingCities(false);
      });

    return () => {
      active = false;
    };
  }, [selectedStateId]);

  const updateField = (group, field, value) => {
    setForm((previous) => ({
      ...previous,
      [group]: {
        ...previous[group],
        [field]: value,
      },
    }));

    setErrors((previous) => ({
      ...previous,
      [`${group}.${field}`]: '',
    }));
  };

  const handleStateChange = (event) => {
    const stateId = event.target.value;
    const selectedState = states.find((state) => String(state.id) === stateId);
    setSelectedStateId(stateId);
    setCities([]);
    setIsLoadingCities(Boolean(stateId));
    setLocationError('');
    setForm((previous) => ({
      ...previous,
      shop: {
        ...previous.shop,
        state: selectedState?.name || '',
        city: '',
      },
    }));
    setErrors((previous) => ({ ...previous, 'shop.state': '', 'shop.city': '' }));
    setSubmitError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      await authService.register(form);
      navigate('/auth/login', {
        state: {
          flash: 'Registration successful. Please login.',
          email: form.owner.email,
        },
      });
    } catch (error) {
      const apiErrors = error.response?.data?.error?.details || [];
      if (apiErrors.length > 0) {
        const normalized = {};
        apiErrors.forEach((item) => {
          normalized[item.field] = item.message;
        });
        setErrors(normalized);
      }

      setSubmitError(error.response?.data?.message || 'Unable to create your account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (group, field, label, type = 'text', placeholder = '', options = {}) => {
    const id = `${group}-${field}`;
    const error = errors[`${group}.${field}`];

    return (
      <div className={options.className || ''}>
        <label htmlFor={id} className="mb-2 block text-xs font-semibold text-[#414846]">{label}</label>
        <input
          id={id}
          type={type}
          name={field}
          autoComplete={options.autoComplete}
          required={options.required !== false}
          value={form[group][field]}
          onChange={(event) => updateField(group, field, event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="min-h-12 w-full rounded-full border border-[#dfe3df] bg-white px-5 text-sm text-[#252a29] outline-none transition placeholder:text-[#b5bbb8] focus:border-[#805361] focus:ring-4 focus:ring-[#805361]/10"
          placeholder={placeholder}
        />
        {error && <p id={`${id}-error`} className="mt-1.5 text-xs text-rose-700">{error}</p>}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-white md:h-screen md:overflow-hidden">
      <section className="grid min-h-screen w-full overflow-hidden bg-white md:h-screen md:min-h-0 md:grid-cols-2">
        <aside className="relative order-2 isolate flex min-h-[280px] flex-col justify-between overflow-hidden bg-[#3d252b] px-7 py-7 text-white sm:px-10 sm:py-9 md:order-1 md:h-screen md:min-h-0 md:px-12 md:py-11">
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
            <h2 className="mt-4 max-w-md text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">Make room for every occasion.</h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/80">Bring your rental shop and its next chapter together.</p>
          </div>

          <div className="flex items-center justify-between gap-4 text-xs text-white/70">
            <span>Made for rental wardrobes</span>
            <span className="h-px w-16 bg-white/50" />
            <span>India</span>
          </div>
        </aside>

        <section className="order-1 flex min-w-0 items-start justify-center px-6 py-10 sm:px-10 md:order-2 md:h-screen md:min-h-0 md:overflow-y-auto md:overscroll-contain md:px-12 md:py-12 lg:px-16">
          <div className="w-full max-w-[560px]">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8a5360]">Shop access</p>
                <h1 className="mt-2 text-3xl font-semibold text-[#252a29]">Register your shop</h1>
                <p className="mt-2 text-sm text-[#747b78]">Create an account to set up your rental workspace.</p>
              </div>
              <span className="grid size-10 shrink-0 place-items-center border border-[#e6e8e4] bg-[#f8f9f6] text-[#68404b]"><Store size={17} /></span>
            </div>

            <div className="mb-6 flex items-center gap-3 text-[11px] font-medium text-[#a1a5a2]">
              <span className="h-px flex-1 bg-[#e8eae7]" />
              <span>CREATE YOUR WORKSPACE</span>
              <span className="h-px flex-1 bg-[#e8eae7]" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-7">
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold text-[#252a29]">Owner information</h2>
                  <span className="h-px flex-1 bg-[#e8eae7]" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {renderField('owner', 'firstName', 'First name', 'text', 'Amit', { autoComplete: 'given-name' })}
                  {renderField('owner', 'lastName', 'Last name', 'text', 'Sharma', { autoComplete: 'family-name' })}
                  {renderField('owner', 'email', 'Email address', 'email', 'owner@business.com', { autoComplete: 'email' })}
                  {renderField('owner', 'phone', 'Phone', 'tel', '9876543210', { autoComplete: 'tel' })}
                  {renderField('owner', 'password', 'Password', 'password', 'Create a secure password', { autoComplete: 'new-password' })}
                  {renderField('owner', 'confirmPassword', 'Confirm password', 'password', 'Re-enter password', { autoComplete: 'new-password' })}
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold text-[#252a29]">Shop information</h2>
                  <span className="h-px flex-1 bg-[#e8eae7]" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {renderField('shop', 'name', 'Shop name', 'text', 'Amit Rentals', { autoComplete: 'organization' })}
                  {renderField('shop', 'businessName', 'Business name', 'text', 'Amit Rentals Private Limited', { autoComplete: 'organization' })}
                  {renderField('shop', 'phone', 'Business phone', 'tel', '9876543210', { autoComplete: 'tel' })}
                  {renderField('shop', 'email', 'Business email', 'email', 'shop@rentals.com', { autoComplete: 'email' })}
                  {renderField('shop', 'address', 'Address', 'text', '12 Main Market Road', { autoComplete: 'street-address', className: 'sm:col-span-2' })}
                  <div>
                    <label htmlFor="shop-state" className="mb-2 block text-xs font-semibold text-[#414846]">State</label>
                    <select
                      id="shop-state"
                      name="state"
                      autoComplete="address-level1"
                      required
                      value={selectedStateId}
                      onChange={handleStateChange}
                      aria-invalid={Boolean(errors['shop.state'])}
                      aria-describedby={errors['shop.state'] ? 'shop-state-error' : undefined}
                      disabled={isLoadingStates || states.length === 0}
                      className="min-h-12 w-full rounded-full border border-[#dfe3df] bg-white px-5 text-sm text-[#252a29] outline-none transition focus:border-[#805361] focus:ring-4 focus:ring-[#805361]/10 disabled:cursor-not-allowed disabled:bg-[#f8f9f6]"
                    >
                      <option value="">{isLoadingStates ? 'Loading states...' : 'Select a state'}</option>
                      {states.map((state) => <option key={state.id} value={state.id}>{state.name}</option>)}
                    </select>
                    {errors['shop.state'] && <p id="shop-state-error" className="mt-1.5 text-xs text-rose-700">{errors['shop.state']}</p>}
                  </div>
                  <div>
                    <label htmlFor="shop-city" className="mb-2 block text-xs font-semibold text-[#414846]">City</label>
                    <select
                      id="shop-city"
                      name="city"
                      autoComplete="address-level2"
                      required
                      value={form.shop.city}
                      onChange={(event) => updateField('shop', 'city', event.target.value)}
                      aria-invalid={Boolean(errors['shop.city'])}
                      aria-describedby={errors['shop.city'] ? 'shop-city-error' : undefined}
                      disabled={!selectedStateId || isLoadingCities || cities.length === 0}
                      className="min-h-12 w-full rounded-full border border-[#dfe3df] bg-white px-5 text-sm text-[#252a29] outline-none transition focus:border-[#805361] focus:ring-4 focus:ring-[#805361]/10 disabled:cursor-not-allowed disabled:bg-[#f8f9f6]"
                    >
                      <option value="">
                        {!selectedStateId ? 'Select a state first' : isLoadingCities ? 'Loading cities...' : 'Select a city'}
                      </option>
                      {cities.map((city) => <option key={city.id} value={city.name}>{city.name}</option>)}
                    </select>
                    {errors['shop.city'] && <p id="shop-city-error" className="mt-1.5 text-xs text-rose-700">{errors['shop.city']}</p>}
                  </div>
                  {renderField('shop', 'pincode', 'Pincode', 'text', '110001', { autoComplete: 'postal-code' })}
                  {renderField('shop', 'gstNumber', 'GST number (optional)', 'text', '07ABCDE1234F1Z5', { required: false })}
                </div>
              </section>

              {locationError && <div role="alert" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{locationError}</div>}
              {submitError && <div role="alert" className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{submitError}</div>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#68404b] px-5 text-sm font-semibold text-white transition hover:bg-[#54333d] focus:outline-none focus:ring-4 focus:ring-[#68404b]/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Creating account...' : 'Register shop'}
                {!isSubmitting && <ArrowRight size={16} />}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-[#717875]">Already have an account? <Link to="/auth/login" className="font-semibold text-[#68404b] underline decoration-[#cbb9bd] underline-offset-4 hover:text-[#4f3039]">Sign in</Link></p>
            <p className="mt-8 text-center text-[11px] text-[#a1a6a2]">© {new Date().getFullYear()} Rental Management Platform</p>
          </div>
        </section>
      </section>
    </main>
  );
}

export default RegisterPage;
