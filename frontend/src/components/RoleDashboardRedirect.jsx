import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function RoleDashboardRedirect() {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return <div className="auth-loading">Loading your dashboard...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = userProfile?.role;

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

  if (role === "worker") {
    return <Navigate to="/worker-dashboard" replace />;
  }

  return <Navigate to="/seller-dashboard" replace />;
}

export default RoleDashboardRedirect;
