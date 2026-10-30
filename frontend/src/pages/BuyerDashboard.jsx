
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import "./BuyerDashboard.css";

function BuyerDashboard() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const [orders, setOrders] = useState([]);

  const displayName = userProfile?.name || user?.displayName || "Buyer";
  const displayEmail = user?.email || "";

  useEffect(() => {
    if (!user?.uid) {
      setOrders([]);
      return;
    }

    function loadOrders() {
      try {
        const savedOrders = JSON.parse(
          localStorage.getItem("ruralrise_orders") || "[]"
        );

        setOrders(
          savedOrders.filter((order) => order.buyerUid === user.uid)
        );
      } catch (error) {
        console.error("Unable to load buyer orders:", error);
        setOrders([]);
      }
    }

    loadOrders();
    window.addEventListener("storage", loadOrders);

    return () => window.removeEventListener("storage", loadOrders);
  }, [user?.uid]);

  const pendingOrders = orders.filter(
    (order) => order.status === "Pending"
  );

  const completedOrders = orders.filter(
    (order) => order.status === "Completed"
  );

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
      <aside className="dashboard-sidebar">
        <Link to="/" className="dashboard-logo">❋ RuralRise</Link>
        <p className="sidebar-tagline">SELL → SCALE → GROW</p>

        <div className="sidebar-menu">
          <p className="menu-label">MAIN MENU</p>

          <Link to="/buyer-dashboard" className="sidebar-link active">
            <span>▦</span> My Dashboard
          </Link>

          <Link to="/marketplace" className="sidebar-link">
            <span>◈</span> Marketplace
          </Link>

          <Link to="/my-orders" className="sidebar-link">
            <span>▤</span> My Orders
          </Link>
        </div>

        <div className="sidebar-bottom">
          <Link to="/" className="sidebar-link">
            <span>↩</span> Back to Home
          </Link>

          <button className="sidebar-link logout-button" onClick={handleLogout}>
            <span>⇥</span> Logout
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span className="dashboard-eyebrow">YOUR BUYER SPACE</span>
            <h1>Welcome, {displayName}!</h1>
            <p>
              Discover products, manage your orders and grow through RuralRise.
            </p>
          </div>

          <div className="dashboard-profile">
            <div className="profile-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <strong>{displayName}</strong>
              <span>{displayEmail}</span>
            </div>
          </div>
        </header>

        <section className="welcome-banner">
          <div>
            <span>YOUR RURALRISE JOURNEY</span>
            <h2>Find what you need.<br />Grow together.</h2>
            <p>
              Explore products from rural businesses and connect with sellers
              through one marketplace.
            </p>
            <Link to="/marketplace" className="banner-button">
              Explore Marketplace →
            </Link>
          </div>
          <div className="banner-symbol">❋</div>
        </section>

        <section className="dashboard-stats">
          <div className="stat-card">
            <span className="stat-icon">▤</span>
            <p>Total Orders</p>
            <h3>{orders.length}</h3>
            <span className="stat-note">Orders placed</span>
          </div>

          <div className="stat-card">
            <span className="stat-icon">◷</span>
            <p>Pending Orders</p>
            <h3>{pendingOrders.length}</h3>
            <span className="stat-note">Awaiting fulfilment</span>
          </div>

          <div className="stat-card">
            <span className="stat-icon">✓</span>
            <p>Completed Orders</p>
            <h3>{completedOrders.length}</h3>
            <span className="stat-note">Successfully completed</span>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="section-heading">
            <div>
              <span>GET STARTED</span>
              <h2>Quick Actions</h2>
            </div>
          </div>

          <div className="quick-actions">
            <Link to="/marketplace" className="action-card">
              <span className="action-icon">◈</span>
              <h3>Browse Marketplace</h3>
              <p>Discover products offered by rural businesses.</p>
              <span className="action-arrow">→</span>
            </Link>

            <Link to="/my-orders" className="action-card">
              <span className="action-icon">▤</span>
              <h3>View My Orders</h3>
              <p>Review your orders and their status.</p>
              <span className="action-arrow">→</span>
            </Link>

            <Link to="/bulk-requests" className="action-card">
              <span className="action-icon">⇄</span>
              <h3>Create a Bulk Request</h3>
              <p>Publish a large order requirement and receive seller responses.</p>
              <span className="action-arrow">→</span>
            </Link>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="section-heading buyer-orders-heading">
            <div>
              <span>YOUR PURCHASES</span>
              <h2>Recent Orders</h2>
            </div>

            <Link to="/my-orders" className="buyer-view-all">
              View All Orders →
            </Link>
          </div>

          {orders.length === 0 ? (
            <div className="empty-activity">
              <span>✧</span>
              <h3>No orders yet</h3>
              <p>Your orders will appear here once you place your first order.</p>
              <Link to="/marketplace" className="buyer-empty-button">
                Explore Marketplace →
              </Link>
            </div>
          ) : (
            <div className="buyer-orders-list">
              {orders.slice().reverse().slice(0, 5).map((order) => (
                <div className="buyer-order-card" key={order.orderId}>
                  <div className="buyer-order-info">
                    <span className="buyer-order-id">{order.orderId}</span>
                    <h3>{order.productName}</h3>
                    <p>Quantity: {order.quantity} {order.unit}</p>
                    <p>{order.fulfilmentType}</p>
                  </div>

                  <div className="buyer-order-right">
                    <strong>
                      ₹{Number(order.estimatedPrice || 0).toLocaleString("en-IN")}
                    </strong>
                    <span
                      className={`buyer-order-status ${
                        order.status === "Completed" ? "completed" : "pending"
                      }`}
                    >
                      {order.status || "Pending"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default BuyerDashboard;
