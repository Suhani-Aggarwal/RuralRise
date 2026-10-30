import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./BulkRequests.css";

const initialRequests = [
  {
    id: "demo-wheat",
    product: "Organic Wheat",
    category: "Agriculture",
    quantity: "500",
    unit: "quintals",
    location: "Delhi, India",
    deadline: "2026-11-20",
    buyer: "FreshMart Wholesale",
    description: "Looking for clean, quality wheat for wholesale distribution.",
    status: "Open",
    buyerUid: null,
    isDemo: true,
    interests: [],
  },
  {
    id: "demo-baskets",
    product: "Handwoven Baskets",
    category: "Handicrafts",
    quantity: "1,000",
    unit: "pieces",
    location: "Jaipur, Rajasthan",
    deadline: "2026-11-25",
    buyer: "Earth & Home Stores",
    description: "Natural handwoven baskets in multiple sizes.",
    status: "Open",
    buyerUid: null,
    isDemo: true,
    interests: [],
  },
  {
    id: "demo-pickles",
    product: "Homemade Pickles",
    category: "Food",
    quantity: "300",
    unit: "jars",
    location: "Chandigarh, Punjab",
    deadline: "2026-12-01",
    buyer: "Local Taste Retail",
    description: "Interested in hygienically packed traditional pickles.",
    status: "Open",
    buyerUid: null,
    isDemo: true,
    interests: [],
  },
];

const categories = [
  "Agriculture", "Handicrafts", "Food", "Textiles", "Dairy",
  "Livestock", "Organic Products", "Spices & Herbs",
  "Flowers & Plants", "Household Products", "Other",
];

const emptyForm = {
  product: "",
  category: "Agriculture",
  quantity: "",
  unit: "pieces",
  location: "",
  deadline: "",
  buyer: "",
  description: "",
};

function readRequests() {
  try {
    const saved = JSON.parse(localStorage.getItem("ruralrise_bulk_requests") || "null");
    if (Array.isArray(saved)) return saved;
  } catch (error) {
    console.error("Could not read bulk requests:", error);
  }
  return initialRequests;
}

function BulkRequests() {
  const { user, userProfile } = useAuth();
  const role = userProfile?.role;
  const isBuyer = role === "buyer";
  const isSeller = role === "seller";
  const [requests, setRequests] = useState(readRequests);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");

  const displayName = userProfile?.name || user?.displayName || "RuralRise user";
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    localStorage.setItem("ruralrise_bulk_requests", JSON.stringify(requests));
  }, [requests]);

  // Keep the page in sync if the other test account changes localStorage in another tab.
  useEffect(() => {
    const refresh = () => setRequests(readRequests());
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setMessage("");
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!isBuyer || !user?.uid) {
      setMessage("Please log in with a buyer account to publish a bulk requirement.");
      return;
    }

    const newRequest = {
      ...form,
      id: `bulk-${user.uid}-${Date.now()}`,
      quantity: Number(form.quantity).toLocaleString("en-IN"),
      buyer: form.buyer.trim(),
      buyerUid: user.uid,
      buyerName: displayName,
      status: "Open",
      isDemo: false,
      createdAt: new Date().toISOString(),
      interests: [],
    };

    setRequests((current) => [newRequest, ...current]);
    setForm(emptyForm);
    setMessage("Your bulk requirement has been published.");
  }

  function handleInterest(requestId) {
    if (!isSeller || !user?.uid) {
      setMessage("Please use a seller account to respond to a bulk opportunity.");
      return;
    }

    let wasAdded = false;

    setRequests((current) =>
      current.map((request) => {
        if (request.id !== requestId || request.buyerUid === user.uid) return request;

        const interests = request.interests || [];
        const previous = interests.find((item) => item.sellerUid === user.uid);

        if (previous) return request;

        wasAdded = true;
        return {
          ...request,
          interests: [
            ...interests,
            {
              sellerUid: user.uid,
              sellerName: displayName,
              status: "Pending",
              createdAt: new Date().toISOString(),
            },
          ],
        };
      })
    );

    setMessage(wasAdded
      ? "Your interest request has been sent to the buyer."
      : "You have already responded to this request, or it is a demo listing.");
  }

  function decideInterest(requestId, sellerUid, decision) {
    setRequests((current) =>
      current.map((request) => {
        if (request.id !== requestId || request.buyerUid !== user?.uid) return request;
        return {
          ...request,
          interests: (request.interests || []).map((interest) =>
            interest.sellerUid === sellerUid
              ? { ...interest, status: decision, updatedAt: new Date().toISOString() }
              : interest
          ),
        };
      })
    );
    setMessage(decision === "Accepted"
      ? "Seller connection accepted."
      : "Seller request rejected.");
  }

  const myRequests = requests.filter((request) => request.buyerUid === user?.uid);
  const myPendingInterests = myRequests.flatMap((request) =>
    (request.interests || [])
      .filter((interest) => interest.status === "Pending")
      .map((interest) => ({ ...interest, requestId: request.id, product: request.product }))
  );
  const myConnections = isBuyer
    ? myRequests.reduce((total, request) => total + (request.interests || []).filter((interest) => interest.status === "Accepted").length, 0)
    : requests.reduce((total, request) => total + (request.interests || []).filter((interest) => interest.sellerUid === user?.uid && interest.status === "Accepted").length, 0);

  const visibleRequests = isBuyer
    ? myRequests
    : requests.filter((request) => request.status === "Open" && request.buyerUid !== user?.uid);

  return (
    <div className="bulk-page">
      <nav className="bulk-navbar">
        <Link to="/" className="bulk-logo">❋ RuralRise</Link>
        <div className="bulk-nav-links">
          <Link to="/">Home</Link>
          <Link to="/my-dashboard">Dashboard</Link>
          <Link to="/marketplace">Marketplace</Link>
          <Link to="/bulk-requests" className="active">Bulk Requests</Link>
        </div>
      </nav>

      <header className="bulk-hero">
        <span className="bulk-eyebrow">{isBuyer ? "BUYER WORKSPACE" : "SELLER OPPORTUNITIES"}</span>
        <h1>
          {isBuyer
            ? <>Post a bulk requirement. <span>Find the right suppliers.</span></>
            : <>Big Orders. <span>Shared Opportunities.</span></>}
        </h1>
        <p>
          {isBuyer
            ? "Tell RuralRise what you need. Sellers can express interest, and you decide whom to connect with."
            : "Explore buyer requirements, express interest and build genuine business connections."}
        </p>
        {isBuyer && <a href="#post-request" className="bulk-hero-button">Create Bulk Request <span>↓</span></a>}
      </header>

      <main className="bulk-content">
        <section className="bulk-intro">
          <div>
            <span className="bulk-section-label">{isBuyer ? "YOUR BULK REQUIREMENTS" : "OPEN BUYER REQUIREMENTS"}</span>
            <h2>{isBuyer ? "Manage your large orders" : "Find orders your business can fulfil"}</h2>
            <p>
              {isBuyer
                ? "Publish your quantity, delivery location and deadline. Review sellers before confirming a connection."
                : "Review the buyer's product, quantity and deadline before expressing interest."}
            </p>
          </div>
          <div className="bulk-stats">
            <div>
              <strong>{isBuyer ? myRequests.length : visibleRequests.length}</strong>
              <span>{isBuyer ? "Your requests" : "Open opportunities"}</span>
            </div>
            <div>
              <strong>{myConnections}</strong>
              <span>Accepted connections</span>
            </div>
            {isBuyer && (
              <div>
                <strong>{myPendingInterests.length}</strong>
                <span>Pending sellers</span>
              </div>
            )}
          </div>
        </section>

        {isBuyer && (
          <>
            <section className="bulk-form-section" id="post-request">
              <div className="bulk-form-heading">
                <span className="bulk-section-label">CREATE A REQUEST</span>
                <h2>What do you need in bulk?</h2>
                <p>Share the details so suitable suppliers can find your requirement.</p>
              </div>

              <form className="bulk-form" onSubmit={handleSubmit}>
                <div className="bulk-form-grid">
                  <label className="bulk-field">Product name *
                    <input name="product" value={form.product} onChange={handleChange} placeholder="e.g. Organic wheat" required />
                  </label>
                  <label className="bulk-field">Product category *
                    <select name="category" value={form.category} onChange={handleChange} required>
                      {categories.map((category) => <option key={category}>{category}</option>)}
                    </select>
                  </label>
                  <label className="bulk-field">Required quantity *
                    <input type="number" name="quantity" value={form.quantity} onChange={handleChange} min="1" placeholder="e.g. 500" required />
                  </label>
                  <label className="bulk-field">Unit *
                    <select name="unit" value={form.unit} onChange={handleChange}>
                      {["pieces", "kg", "quintals", "tonnes", "litres", "boxes", "jars", "packs"].map((unit) => <option key={unit}>{unit}</option>)}
                    </select>
                  </label>
                  <label className="bulk-field">Delivery location *
                    <input name="location" value={form.location} onChange={handleChange} placeholder="City, state" required />
                  </label>
                  <label className="bulk-field">Required by *
                    <input type="date" name="deadline" value={form.deadline} onChange={handleChange} min={today} required />
                  </label>
                  <label className="bulk-field bulk-field-full">Buyer / organisation name *
                    <input name="buyer" value={form.buyer} onChange={handleChange} placeholder="Your business or organisation" required />
                  </label>
                  <label className="bulk-field bulk-field-full">Additional requirements
                    <textarea name="description" value={form.description} onChange={handleChange} placeholder="Mention quality, packaging, sizes or other details..." rows="4" />
                  </label>
                </div>
                {message && <p className="bulk-success" role="status">{message}</p>}
                <div className="bulk-form-actions">
                  <p>* Required fields</p>
                  <button type="submit" className="bulk-submit-button">Publish Bulk Request <span>→</span></button>
                </div>
              </form>
            </section>

            <section className="bulk-inbox-section">
              <div className="bulk-form-heading">
                <span className="bulk-section-label">CONNECTION REQUESTS</span>
                <h2>Seller interest requests</h2>
                <p>Accept or reject sellers who want to fulfil your requirements.</p>
              </div>

              {myRequests.some((request) => (request.interests || []).length > 0) ? (
                <div className="bulk-interest-list">
                  {myRequests.flatMap((request) =>
                    (request.interests || []).map((interest) => (
                      <div className="bulk-interest-card" key={`${request.id}-${interest.sellerUid}`}>
                        <div>
                          <h3>{interest.sellerName}</h3>
                          <p>Interested in: <strong>{request.product}</strong></p>
                          <span>{interest.status}</span>
                        </div>
                        {interest.status === "Pending" && (
                          <div className="bulk-interest-actions">
                            <button type="button" className="bulk-accept-button" onClick={() => decideInterest(request.id, interest.sellerUid, "Accepted")}>Accept</button>
                            <button type="button" className="bulk-reject-button" onClick={() => decideInterest(request.id, interest.sellerUid, "Rejected")}>Reject</button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="bulk-empty-inbox">
                  <h3>No seller requests yet</h3>
                  <p>When sellers express interest in your bulk requirements, they will appear here.</p>
                </div>
              )}
            </section>
          </>
        )}

        {isSeller && (
          <section className="bulk-list-section">
            <div className="bulk-list-heading">
              <div>
                <span className="bulk-section-label">OPEN OPPORTUNITIES</span>
                <h2>Bulk requirements from buyers</h2>
                <p>Choose requirements that match your products and available capacity.</p>
              </div>
              <span className="bulk-open-count">{visibleRequests.length} opportunities</span>
            </div>

            <div className="bulk-request-grid">
              {visibleRequests.map((request) => {
                const myInterest = (request.interests || []).find((item) => item.sellerUid === user?.uid);
                return (
                  <article className="bulk-request-card" key={request.id}>
                    <div className="bulk-request-top">
                      <span className="bulk-request-category">{request.category}</span>
                      <span className="bulk-status">{request.status}</span>
                    </div>
                    <h3>{request.product}</h3>
                    <p className="bulk-buyer">Requested by {request.buyer}</p>
                    <div className="bulk-request-info">
                      <div><span>Required quantity</span><strong>{request.quantity} {request.unit}</strong></div>
                      <div><span>Delivery location</span><strong>{request.location}</strong></div>
                      <div><span>Required by</span><strong>{request.deadline}</strong></div>
                    </div>
                    {request.description && <p className="bulk-description">{request.description}</p>}
                    {myInterest ? (
                      <p className="bulk-interest-status">Interest status: {myInterest.status}</p>
                    ) : request.isDemo ? (
                      <p className="bulk-interest-status">Sample opportunity — buyer approval is unavailable for demo data.</p>
                    ) : (
                      <button type="button" className="bulk-interest-button" onClick={() => handleInterest(request.id)}>
                        I'm Interested <span>→</span>
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
            {message && <p className="bulk-success" role="status">{message}</p>}
            {visibleRequests.length === 0 && <div className="bulk-empty-inbox"><h3>No open requests yet</h3><p>Buyer bulk requirements will appear here.</p></div>}
          </section>
        )}

        {!isBuyer && !isSeller && (
          <div className="bulk-empty-inbox">
            <h3>Choose a buyer or seller account</h3>
            <p>Bulk requirements are available to registered buyers and sellers.</p>
          </div>
        )}
      </main>

      <p className="bulk-success" style={{ maxWidth: 1100, margin: "0 auto 24px", padding: "0 20px" }}>
        Demo data is stored in this browser only. To share requests across different devices or teammate accounts, connect the FastAPI and MongoDB backend.
      </p>
      <footer className="bulk-footer">
        <span>❋ RuralRise</span>
        <p>SELL → SCALE → GROW</p>
        <small>© 2026 RuralRise. Growing together.</small>
      </footer>
    </div>
  );
}

export default BulkRequests;
