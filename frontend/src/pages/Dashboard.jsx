
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();

  const { user, userProfile, loading } = useAuth();

  // Logout function
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      alert("Unable to logout. Please try again.");
    }
  };

  // Wait for user profile to load
  if (loading) {
    return <h3>Loading your dashboard...</h3>;
  }

  return (
    <div className="dashboard-layout">

      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <Link to="/" className="dashboard-logo">
          ❋ RuralRise
        </Link>

        <p className="sidebar-tagline">SELL → SCALE → GROW</p>

        <div className="sidebar-menu">
          <p className="menu-label">MAIN MENU</p>

          <Link to="/dashboard" className="sidebar-link active">
            <span>▦</span> Dashboard
          </Link>

          <Link to="/marketplace" className="sidebar-link">
            <span>◈</span> Marketplace
          </Link>

          <Link to="/add-product" className="sidebar-link">
            <span>＋</span> Add Product
          </Link>

          <Link to="/bulk-requests" className="sidebar-link">
            <span>⇄</span> Bulk Requests
          </Link>
        </div>

        <div className="sidebar-bottom">
          <Link to="/" className="sidebar-link">
            <span>↩</span> Back to Home
          </Link>

          <button
            className="sidebar-link logout-button"
            onClick={handleLogout}
          >
            <span>⇥</span> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">

        {/* Dashboard Header */}
        <header className="dashboard-header">
          <div>
            <span className="dashboard-eyebrow">
              YOUR GROWTH SPACE
            </span>

            <h1>Welcome back, {userProfile?.name || user?.displayName || "User"}!</h1>

            <p>
              Here's what's happening with your RuralRise journey.
            </p>
          </div>

          {/* Dynamic User Profile */}
          <div className="dashboard-profile">
            <div className="profile-avatar">
              {userProfile?.name?.charAt(0).toUpperCase() ||
                user?.displayName?.charAt(0).toUpperCase() ||
                "U"}
            </div>

            <div>
              <strong>
                {userProfile?.name || user?.displayName || "RuralRise User"}
              </strong>

              <span>
                {userProfile?.role || user?.email || "Community Member"}
              </span>
            </div>
          </div>
        </header>

        {/* Welcome Banner */}
        <section className="welcome-banner">
          <div>
            <span>GROW WITH RURALRISE</span>

            <h2>
              Small beginnings.<br />
              Bigger possibilities.
            </h2>

            <p>
              Discover opportunities, connect with people,
              and take your next step towards growth.
            </p>

            <Link to="/marketplace" className="banner-button">
              Explore Marketplace →
            </Link>
          </div>

          <div className="banner-symbol">❋</div>
        </section>

        {/* Statistics */}
        <section className="dashboard-stats">

          <div className="stat-card">
            <span className="stat-icon">◈</span>
            <p>My Products</p>
            <h3>0</h3>
            <span className="stat-note">Products listed</span>
          </div>

          <div className="stat-card">
            <span className="stat-icon">⇄</span>
            <p>Bulk Opportunities</p>
            <h3>0</h3>
            <span className="stat-note">Requests available</span>
          </div>

          <div className="stat-card">
            <span className="stat-icon">♧</span>
            <p>Connections</p>
            <h3>0</h3>
            <span className="stat-note">People connected</span>
          </div>

        </section>

        {/* Quick Actions */}
        <section className="dashboard-section">
          <div className="section-heading">
            <div>
              <span>GET STARTED</span>
              <h2>Quick Actions</h2>
            </div>
          </div>

          <div className="quick-actions">

            <Link to="/add-product" className="action-card">
              <span className="action-icon">＋</span>
              <h3>Add a Product</h3>
              <p>List your products and reach more buyers.</p>
              <span className="action-arrow">→</span>
            </Link>

            <Link to="/marketplace" className="action-card">
              <span className="action-icon">◈</span>
              <h3>Explore Marketplace</h3>
              <p>Discover products and new opportunities.</p>
              <span className="action-arrow">→</span>
            </Link>

            <Link to="/bulk-requests" className="action-card">
              <span className="action-icon">⇄</span>
              <h3>View Bulk Requests</h3>
              <p>Find opportunities for larger orders.</p>
              <span className="action-arrow">→</span>
            </Link>

          </div>
        </section>

        {/* Recent Activity */}
        <section className="dashboard-section activity-section">
          <div className="section-heading">
            <div>
              <span>YOUR JOURNEY</span>
              <h2>Recent Activity</h2>
            </div>
          </div>

          <div className="empty-activity">
            <span>✧</span>
            <h3>Your journey starts here</h3>
            <p>
              Your recent activities will appear here as you use RuralRise.
            </p>
          </div>
        </section>

      </main>
    </div>
  );
}

export default Dashboard;
