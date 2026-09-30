import { useEffect, useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import apiClient from '../services/apiClient';

function HomePage() {
  const [apiStatus, setApiStatus] = useState({ loading: true, success: false, message: '' });

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await apiClient.get('/health');
        setApiStatus({
          loading: false,
          success: response.data?.success ?? false,
          message: response.data?.message ?? 'API is running',
        });
      } catch (error) {
        setApiStatus({
          loading: false,
          success: false,
          message: error.response?.data?.message || 'Unable to reach the API server.',
        });
      }
    };

    fetchHealth();
  }, []);

  return (
    <AppLayout title="Dashboard Overview">
      <section className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Shops</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">0</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Customers</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">0</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Active Rentals</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">0</p>
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">System Status</h2>
        <div className="mt-4">
          {apiStatus.loading ? (
            <LoadingSpinner message="Checking backend health..." />
          ) : apiStatus.success ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
              <p className="font-semibold">Backend online</p>
              <p className="mt-1 text-sm">{apiStatus.message}</p>
            </div>
          ) : (
            <ErrorMessage title="Backend unavailable" message={apiStatus.message} />
          )}
        </div>
      </section>
    </AppLayout>
  );
}

export default HomePage;
