import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from '../features/auth/pages/LoginPage';
import RegisterPage from '../features/auth/pages/RegisterPage';
import DashboardPage from '../pages/DashboardPage';
import ReportsPage from '../features/reports/pages/ReportsPage';
import CustomerListPage from '../features/customers/pages/CustomerListPage';
import CustomerFormPage from '../features/customers/pages/CustomerFormPage';
import CustomerDetailsPage from '../features/customers/pages/CustomerDetailsPage';
import CustomerDraftsPage from '../features/customers/pages/CustomerDraftsPage';
import ProductListPage from '../features/catalog/pages/ProductListPage';
import ProductFormPage from '../features/catalog/pages/ProductFormPage';
import ProductDetailsPage from '../features/catalog/pages/ProductDetailsPage';
import CategoryManagementPage from '../features/catalog/pages/CategoryManagementPage';
import InventoryListPage from '../features/inventory/pages/InventoryListPage';
import InventoryFormPage from '../features/inventory/pages/InventoryFormPage';
import InventoryDetailsPage from '../features/inventory/pages/InventoryDetailsPage';
import BookingListPage from '../features/bookings/pages/BookingListPage';
import BookingWorkspacePage from '../features/bookings/pages/BookingWorkspacePage';
import BookingDetailsPage from '../features/bookings/pages/BookingDetailsPage';
import PaymentListPage from '../features/payments/pages/PaymentListPage';
import PaymentDetailsPage from '../features/payments/pages/PaymentDetailsPage';
import PickupWorkspacePage from '../features/returns/pages/PickupWorkspacePage.jsx';
import ReturnWorkspacePage from '../features/returns/pages/ReturnWorkspacePage.jsx';
import ReturnListPage from '../features/returns/pages/ReturnListPage.jsx';
import ReturnDetailsPage from '../features/returns/pages/ReturnDetailsPage.jsx';
import ShopManagementPage from '../features/shops/pages/ShopManagementPage';
import SettingsLayout from '../components/layout/SettingsLayout';
import ProtectedRoute from './ProtectedRoute';
import NotFoundPage from '../pages/NotFoundPage';
import AppLayout from '../components/layout/AppLayout';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/auth/login" replace />} />
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/customers" element={<CustomerListPage />} />
        <Route path="/customers/drafts" element={<CustomerDraftsPage />} />
        <Route path="/customers/new" element={<CustomerFormPage />} />
        <Route path="/customers/:id" element={<CustomerDetailsPage />} />
        <Route path="/customers/:id/edit" element={<CustomerFormPage />} />
        <Route path="/products" element={<ProductListPage />} />
        <Route path="/products/new" element={<ProductFormPage />} />
        <Route path="/products/:id" element={<ProductDetailsPage />} />
        <Route path="/products/:id/edit" element={<ProductFormPage />} />
        <Route path="/settings" element={<SettingsLayout />}>
          <Route index element={<Navigate to="categories" replace />} />
          <Route path="categories" element={<CategoryManagementPage />} />
          <Route path="shops" element={<ShopManagementPage />} />
        </Route>
        <Route path="/inventory" element={<InventoryListPage />} />
        <Route path="/inventory/new" element={<InventoryFormPage />} />
        <Route path="/inventory/:id" element={<InventoryDetailsPage />} />
        <Route path="/inventory/:id/edit" element={<InventoryFormPage />} />
        <Route path="/bookings" element={<BookingListPage />} />
        <Route path="/bookings/new" element={<BookingWorkspacePage />} />
        <Route path="/bookings/:id/edit" element={<BookingWorkspacePage />} />
        <Route path="/bookings/:id/pickup" element={<PickupWorkspacePage />} />
        <Route path="/bookings/:id/return" element={<ReturnWorkspacePage />} />
        <Route path="/bookings/:id" element={<BookingDetailsPage />} />
        <Route path="/payments" element={<PaymentListPage />} />
        <Route path="/payments/:id" element={<PaymentDetailsPage />} />
        <Route path="/returns" element={<ReturnListPage />} />
        <Route path="/returns/:id" element={<ReturnDetailsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRoutes;
