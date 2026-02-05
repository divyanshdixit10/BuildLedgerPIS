import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import MainLayout from '../layouts/MainLayout';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Materials from '../pages/Materials';
import Payments from '../pages/Payments';
import Vendors from '../pages/Vendors';
import DailyWork from '../pages/DailyWork';
import Reports from '../pages/Reports';
import Assets from '../pages/Assets';
import Unauthorized from '../pages/Unauthorized';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Protected Routes */}
      <Route element={<MainLayout />}>
        <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'EDITOR', 'VIEWER']} />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/daily-work" element={<DailyWork />} />
          <Route path="/reports" element={<Reports />} />
        </Route>
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
