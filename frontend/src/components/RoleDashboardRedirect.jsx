
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function RoleDashboardRedirect() {
  const { user, userProfile, activeRole, loading } = useAuth();

  if (loading) {
    return <div className="auth-loading">Loading your dashboard...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Use the currently selected dashboard role.
  // Fall back to the original profile role if no active role exists.
  const role = String(activeRole || userProfile?.role || "")
    .trim()
    .toLowerCase();

  if (!role) {
    return (
      <div className="auth-loading">
        Your account role could not be found. Please contact the RuralRise team.
      </div>
    );
  }

  if (role === "buyer") {
    return <Navigate to="/buyer-dashboard" replace />;
  }

  if (role === "seller") {
    return <Navigate to="/seller-dashboard" replace />;
  }

  if (role === "worker") {
    return <Navigate to="/worker-dashboard" replace />;
  }

  return (
    <div className="auth-loading">
      Invalid account role. Please contact the RuralRise team.
    </div>
  );
}

export default RoleDashboardRedirect;
