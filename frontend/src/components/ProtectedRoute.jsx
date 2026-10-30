import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute() {
  const { user, loading } = useAuth();

  // Wait until Firebase checks the user's login status
  if (loading) {
    return (
      <div className="auth-loading">
        Checking authentication...
      </div>
    );
  }

  // Redirect logged-out users to Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Allow logged-in users to access protected pages
  return <Outlet />;
}

export default ProtectedRoute;