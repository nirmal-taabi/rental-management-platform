import { Navigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../features/auth/context/AuthContext';

function SuperAdminRoute({ children }) {
  const { isAuthenticated, isLoading, roles, user } = useAuth();
  const location = useLocation();
  const isSuperAdmin = roles.some((role) => String(role).toUpperCase() === 'SUPER_ADMIN');

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9f6] text-sm text-[#59615e]">
        Loading your workspace...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (user?.passwordResetRequired) {
    return <Navigate to="/change-password" replace />;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default SuperAdminRoute;

SuperAdminRoute.propTypes = {
  children: PropTypes.node.isRequired,
};
