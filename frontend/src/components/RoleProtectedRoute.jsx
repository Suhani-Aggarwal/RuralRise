
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function RoleProtectedRoute({ allowedRoles }) {
  const { user, activeRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="auth-loading">Checking your account...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!activeRole) {
    return <Navigate to="/my-dashboard" replace />;
  }

  const permittedRoles = allowedRoles.map((role) =>
    String(role).trim().toLowerCase()
  );

  if (!permittedRoles.includes(activeRole)) {
    return <Navigate to="/my-dashboard" replace />;
  }

  return <Outlet />;
}

export default RoleProtectedRoute;
