
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function RoleProtectedRoute({ allowedRoles }) {
  const { user, userProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="auth-loading">Checking your account...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!userProfile?.role) {
    return (
      <div className="auth-loading">
        Your account role could not be found. Please contact the RuralRise team.
      </div>
    );
  }

  const userRole = String(userProfile.role).trim().toLowerCase();

  const permittedRoles = allowedRoles.map((role) =>
    String(role).trim().toLowerCase()
  );

  if (!permittedRoles.includes(userRole)) {
    return <Navigate to="/my-dashboard" replace />;
  }

  return <Outlet />;
}

export default RoleProtectedRoute;
