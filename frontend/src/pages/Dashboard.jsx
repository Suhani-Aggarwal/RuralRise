
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();

  const [myProducts, setMyProducts] = useState([]);
  const [bulkOpportunities, setBulkOpportunities] = useState(0);
  const [connections, setConnections] = useState(0);

  const displayName =
    userProfile?.name || user?.displayName || "User";

  const displayRole = userProfile?.role || "Community Member";

  // Load products belonging to the logged-in seller
  useEffect(() => {
    function loadMyProducts() {
      try {
        const allProducts = JSON.parse(
          localStorage.getItem("ruralrise_products") || "[]"
        );

        const sellerProducts = allProducts.filter(
          (product) => product.sellerUid === user?.uid
        );

        setMyProducts(sellerProducts);

        const bulkRequests = JSON.parse(
          localStorage.getItem("ruralrise_bulk_requests") || "[]"
        );

        const normalize = (value) =>
          String(value || "").trim().toLowerCase().replace(/\\s+/g, " ");

        const sellerProductNames = sellerProducts.map((product) =>
          normalize(product.product_name)
        );

        const matchingOpenRequests = bulkRequests.filter((request) =>
          request.status === "Open" &&
          !request.isDemo &&
          request.buyerUid !== user?.uid &&
          sellerProductNames.includes(normalize(request.product))
        );

        const acceptedBuyerIds = bulkRequests
          .filter((request) => request.buyerUid)
          .flatMap((request) =>
            (request.interests || [])
              .filter(
                (interest) =>
                  interest.sellerUid === user?.uid &&
                  interest.status === "Accepted"
              )
              .map(() => request.buyerUid)
          );

        setBulkOpportunities(matchingOpenRequests.length);
        setConnections(new Set(acceptedBuyerIds).size);
      } catch (error) {
        console.error("Error loading seller products:", error);
        setMyProducts([]);
        setBulkOpportunities(0);
        setConnections(0);
      }
    }

    if (user?.uid) {
      loadMyProducts();
    }

    // Listen for changes made in other browser tabs
    window.addEventListener("storage", loadMyProducts);

    return () => {
      window.removeEventListener("storage", loadMyProducts);
    };
  }, [user?.uid]);

  function deleteProduct(productId) {
    const confirmed = window.confirm("Delete this product listing? This cannot be undone.");
    if (!confirmed) return;
    const allProducts = JSON.parse(localStorage.getItem("ruralrise_products") || "[]");
    const updated = allProducts.filter((item) => !(String(item.id) === String(productId) && item.sellerUid === user?.uid));
    localStorage.setItem("ruralrise_products", JSON.stringify(updated));
    setMyProducts(updated.filter((item) => item.sellerUid === user?.uid));
  }

  // Get the five most recently added products
  const recentProducts = [...myProducts]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

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

        <p className="sidebar-tagline">SELL → SCALE → GROW</p>

        <div className="sidebar-menu">
          <p className="menu-label">MAIN MENU</p>

          <Link to="/seller-dashboard" className="sidebar-link active">
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
          <Link to="/msme-profile" className="sidebar-link">
            <span>♧</span> MSME Profile
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
            <span className="dashboard-eyebrow">YOUR GROWTH SPACE</span>
            <h1>Welcome, {displayName}!</h1>
            <p>Here's what's happening with your RuralRise journey.</p>
          </div>

          <div className="dashboard-profile">
            <div className="profile-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>

            <div>
              <strong>{displayName}</strong>
              <span>{displayRole}</span>
            </div>
          </div>
        </header>

        {/* Welcome Banner */}
        <section className="welcome-banner">
          <div>
            <span>GROW WITH RURALRISE</span>
            <h2>Small beginnings.<br />Bigger possibilities.</h2>
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
            <h3>{myProducts.length}</h3>
            <span className="stat-note">Products listed</span>
          </div>

          <div className="stat-card">
            <span className="stat-icon">⇄</span>
            <p>Bulk Opportunities</p>
            <h3>{bulkOpportunities}</h3>
            <span className="stat-note">Matching open requests</span>
          </div>

          <div className="stat-card">
            <span className="stat-icon">♧</span>
            <p>Connections</p>
            <h3>{connections}</h3>
            <span className="stat-note">Accepted connections</span>
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

          {recentProducts.length > 0 ? (

            <div className="recent-products-list">

              {recentProducts.map((product) => (

                <div className="recent-product-item" key={product.id}>

                  <div>
                    <h3>{product.product_name}</h3>
                    <p>
                      {product.category} · {product.location}
                    </p>
                  </div>

                  <div className="recent-product-details">
                    <strong>₹{product.price}</strong>
                    <span>
                      {product.quantity} {product.unit}
                    </span>
                    <button type="button" onClick={() => deleteProduct(product.id)} className="delete-product-button">
                      Delete
                    </button>
                  </div>

                </div>

              ))}

            </div>

          ) : (

            <div className="empty-activity">
              <span>✧</span>
              <h3>Your journey starts here</h3>
              <p>
                Your recently published products will appear here.
              </p>

              <Link to="/add-product" className="banner-button">
                Add Your First Product →
              </Link>
            </div>

          )}

        </section>

      </main>
    </div>
  );
}

/* Product deletion is a local demo action; backend deletion will replace it later. */
export default Dashboard;
