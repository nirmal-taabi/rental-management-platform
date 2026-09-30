import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import Button from '../components/common/Button';

function NotFoundPage() {
  return (
    <AppLayout title="Page Not Found">
      <div className="rounded-xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
        <h2 className="text-3xl font-bold text-slate-900">404</h2>
        <p className="mt-3 text-slate-600">The page you requested does not exist.</p>
        <div className="mt-6">
          <Link to="/">
            <Button>Return to dashboard</Button>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}

export default NotFoundPage;
