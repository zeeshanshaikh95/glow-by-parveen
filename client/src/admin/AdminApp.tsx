import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './AdminAuthContext';
import { AdminLoginPage } from './AdminLoginPage';
import { AdminLayout } from './AdminLayout';
import { AdminDashboardPage } from './AdminDashboardPage';
import { AdminProductsPage } from './AdminProductsPage';
import { AdminProductFormPage } from './AdminProductFormPage';
import { AdminCategoriesPage } from './AdminCategoriesPage';
import { AdminReviewsPage } from './AdminReviewsPage';
import { AdminGalleryPage } from './AdminGalleryPage';
import { AdminSettingsPage } from './AdminSettingsPage';

/** Guards every /admin route — the backend enforces auth independently. */
function RequireAuth({ children }: { children: JSX.Element }) {
  const { token, ready } = useAdminAuth();
  if (!ready) return <div className="min-h-screen bg-stone-100" />;
  if (!token) return <Navigate to="/admin/login" replace />;
  return children;
}

function AdminHome() {
  return <Navigate to="/admin/dashboard" replace />;
}

export default function AdminApp() {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route path="login" element={<AdminLoginPage />} />
        <Route
          path="*"
          element={
            <RequireAuth>
              <AdminLayout>
                <Routes>
                  <Route index element={<AdminHome />} />
                  <Route path="dashboard" element={<AdminDashboardPage />} />
                  <Route path="products" element={<AdminProductsPage />} />
                  <Route path="products/new" element={<AdminProductFormPage />} />
                  <Route path="products/:id" element={<AdminProductFormPage />} />
                  <Route path="categories" element={<AdminCategoriesPage />} />
                  <Route path="reviews" element={<AdminReviewsPage />} />
                  <Route path="gallery" element={<AdminGalleryPage />} />
                  <Route path="settings" element={<AdminSettingsPage />} />
                  <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                </Routes>
              </AdminLayout>
            </RequireAuth>
          }
        />
      </Routes>
    </AdminAuthProvider>
  );
}
