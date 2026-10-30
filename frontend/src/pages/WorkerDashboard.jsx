
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

function WorkerDashboard() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();

  const displayName =
    userProfile?.name || user?.displayName || "Worker";

  const displayEmail = user?.email || "";

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      alert("Unable to logout. Please try again.");
    }
  };

  return (
    <div className="dashboard-layout">

      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <Link to="/" className="dashboard-logo">
          ❋ RuralRise
        </Link>

        <p className="sidebar-tagline">
          SELL → SCALE → GROW
        </p>

        <div className="sidebar-menu">
          <p className="menu-label">MAIN MENU</p>

          <Link to="/worker-dashboard" className="sidebar-link active">
            <span>▦</span> My Dashboard
          </Link>

          <Link to="/marketplace" className="sidebar-link">
            <span>◈</span> Explore Marketplace
          </Link>

          <Link to="/worker-profile" className="sidebar-link">
            <span>♧</span> My Skills
          </Link>

          <Link to="/worker-dashboard" className="sidebar-link">
            <span>▤</span> My Work
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

        <header className="dashboard-header">
          <div>
            <span className="dashboard-eyebrow">
              YOUR WORKSPACE
            </span>

            <h1>Welcome, {displayName}!</h1>

            <p>
              Discover opportunities and showcase your skills
              with RuralRise.
            </p>
          </div>

          <div className="dashboard-profile">
            <div className="profile-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>

            <div>
              <strong>{displayName}</strong>
              <span>Skilled Worker</span>
            </div>
          </div>
        </header>

        {/* Welcome Banner */}
        <section className="welcome-banner">
          <div>
            <span>YOUR SKILLS. YOUR OPPORTUNITIES.</span>

            <h2>
              Turn your skills<br />
              into opportunities.
            </h2>

            <p>
              Connect with rural businesses, discover work
              opportunities and grow your professional journey.
            </p>

            <Link to="/marketplace" className="banner-button">
              Explore RuralRise →
            </Link>
          </div>

          <div className="banner-symbol">❋</div>
        </section>

        {/* Statistics */}
        <section className="dashboard-stats">

          <div className="stat-card">
            <span className="stat-icon">♧</span>
            <p>My Skills</p>
            <h3>
              {Array.isArray(userProfile?.skills)
                ? userProfile.skills.length
                : 0}
            </h3>
            <span className="stat-note">Skills added to profile</span>
          </div>

          <div className="stat-card">
            <span className="stat-icon">▤</span>
            <p>Work Opportunities</p>
            <h3>0</h3>
            <span className="stat-note">Available opportunities</span>
          </div>

          <div className="stat-card">
            <span className="stat-icon">✓</span>
            <p>Completed Work</p>
            <h3>0</h3>
            <span className="stat-note">Successfully completed</span>
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

            <Link to="/worker-profile" className="action-card">
              <span className="action-icon">♧</span>
              <h3>My Skills</h3>
              <p>
                View and manage the skills you bring to RuralRise.
              </p>
              <span className="action-arrow">→</span>
            </Link>

            <Link to="/marketplace" className="action-card">
              <span className="action-icon">◈</span>
              <h3>Explore Opportunities</h3>
              <p>
                Discover rural products and potential work connections.
              </p>
              <span className="action-arrow">→</span>
            </Link>

            <Link to="/worker-dashboard" className="action-card">
              <span className="action-icon">▤</span>
              <h3>My Work</h3>
              <p>
                Keep track of your assigned and completed work.
              </p>
              <span className="action-arrow">→</span>
            </Link>

          </div>
        </section>

        {/* Recent Activity */}
        <section className="dashboard-section activity-section">

          <div className="section-heading">
            <div>
              <span>YOUR PROGRESS</span>
              <h2>Recent Activity</h2>
            </div>
          </div>

          <div className="empty-activity">
            <span>✧</span>
            <h3>Your journey starts here</h3>
            <p>
              Your work opportunities and recent activities
              will appear here.
            </p>
          </div>

        </section>

      </main>
    </div>
  );
}

export default WorkerDashboard;
