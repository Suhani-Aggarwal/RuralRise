import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./BulkRequests.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

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
    description:
      "Looking for clean, quality wheat for wholesale distribution.",
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
    description:
      "Interested in hygienically packed traditional pickles.",
    status: "Open",
    buyerUid: null,
    isDemo: true,
    interests: [],
  },
];

const categories = [
  "Agriculture",
  "Handicrafts",
  "Food",
  "Textiles",
  "Dairy",
  "Livestock",
  "Organic Products",
  "Spices & Herbs",
  "Flowers & Plants",
  "Household Products",
  "Other",
];

const units = [
  "pieces",
  "kg",
  "quintals",
  "tonnes",
  "litres",
  "boxes",
  "jars",
  "packs",
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
  maxPrice: "",
};

function readRequests() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("ruralrise_bulk_requests") || "null"
    );

    if (Array.isArray(saved)) {
      return saved;
    }
  } catch (error) {
    console.error("Could not read bulk requests:", error);
  }

  return initialRequests;
}

function BulkRequests() {
  const { user, userProfile } = useAuth();

  const role = String(userProfile?.role || "").trim().toLowerCase();
  const isBuyer = role === "buyer";
  const isSeller = role === "seller";

  const [requests, setRequests] = useState(readRequests);
  const [form, setForm] = useState({ ...emptyForm });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [matchingError, setMatchingError] = useState("");

  const [loading, setLoading] = useState(false);
  const [matchingResult, setMatchingResult] = useState(null);

  const displayName =
    userProfile?.name || user?.displayName || "RuralRise user";

  const today = new Date().toLocaleDateString("en-CA");

  const formatNumber = (value) =>
    Number(value || 0).toLocaleString("en-IN");

  const formatCurrency = (value) =>
    Number(value || 0).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    });

  useEffect(() => {
    localStorage.setItem(
      "ruralrise_bulk_requests",
      JSON.stringify(requests)
    );
  }, [requests]);

  // Refresh when another tab changes the stored requests.
  useEffect(() => {
    const refresh = () => {
      setRequests(readRequests());
    };

    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("storage", refresh);
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setMessage("");
    setError("");
    setMatchingError("");
    setMatchingResult(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setError("");
    setMatchingError("");
    setMatchingResult(null);

    if (!isBuyer || !user?.uid) {
      setError("Please log in with a buyer account to publish a bulk requirement.");
      return;
    }

    const quantity = Number(form.quantity);

    const maxPrice =
      form.maxPrice.trim() === ""
        ? null
        : Number(form.maxPrice);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setError("Enter a valid positive whole-number quantity.");
      return;
    }

    if (
      maxPrice !== null &&
      (!Number.isFinite(maxPrice) || maxPrice < 0)
    ) {
      setError("Enter a valid maximum price.");
      return;
    }

    if (!form.product.trim() || !form.location.trim() || !form.buyer.trim()) {
      setError("Please complete all required fields.");
      return;
    }

    setLoading(true);

    // Publish the request independently of AI matching.
    const newRequest = {
      ...form,
      id: `bulk-${user.uid}-${Date.now()}`,
      product: form.product.trim(),
      quantity: quantity.toLocaleString("en-IN"),
      buyer: form.buyer.trim(),
      location: form.location.trim(),
      buyerUid: user.uid,
      buyerName: displayName,
      status: "Open",
      isDemo: false,
      createdAt: new Date().toISOString(),
      interests: [],
    };

    setRequests((current) => [newRequest, ...current]);

    setMessage("Your bulk requirement has been published.");
    setForm({ ...emptyForm });

    // Now run AI supplier matching.
    try {
      const payload = {
        product_name: newRequest.product,
        required_quantity: quantity,
        unit: newRequest.unit,
        location: newRequest.location,
        max_price: maxPrice,
      };

      const response = await fetch(`${API_BASE_URL}/matching/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let data = {};

      try {
        data = await response.json();
      } catch {
        throw new Error("The matching server returned an invalid response.");
      }

      if (!response.ok) {
        const detail =
          typeof data.detail === "string"
            ? data.detail
            : "Unable to find matching suppliers.";

        throw new Error(detail);
      }

      setMatchingResult(data);

      setMessage(
        "Bulk requirement published and supplier matching completed."
      );

      setTimeout(() => {
        document
          .getElementById("matching-results")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 100);
    } catch (err) {
      console.error("Supplier matching failed:", err);

      setMatchingError(
        err.message ||
          "Your request was published, but supplier matching could not be completed."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleInterest(requestId) {
    if (!isSeller || !user?.uid) {
      setMessage("Please use a seller account to respond to a bulk opportunity.");
      return;
    }

    let wasAdded = false;

    setRequests((current) =>
      current.map((request) => {
        if (
          request.id !== requestId ||
          request.buyerUid === user.uid ||
          request.isDemo
        ) {
          return request;
        }

        const interests = request.interests || [];

        const previous = interests.find(
          (item) => item.sellerUid === user.uid
        );

        if (previous) {
          return request;
        }

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

    setMessage(
      wasAdded
        ? "Your interest request has been sent to the buyer."
        : "You have already responded to this request, or it is a demo listing."
    );
  }

  function decideInterest(requestId, sellerUid, decision) {
    setRequests((current) =>
      current.map((request) => {
        if (
          request.id !== requestId ||
          request.buyerUid !== user?.uid
        ) {
          return request;
        }

        return {
          ...request,
          interests: (request.interests || []).map((interest) =>
            interest.sellerUid === sellerUid
              ? {
                  ...interest,
                  status: decision,
                  updatedAt: new Date().toISOString(),
                }
              : interest
          ),
        };
      })
    );

    setMessage(
      decision === "Accepted"
        ? "Seller connection accepted."
        : "Seller request rejected."
    );
  }

  const myRequests = requests.filter(
    (request) => request.buyerUid === user?.uid
  );

  const myPendingInterests = myRequests.flatMap((request) =>
    (request.interests || [])
      .filter((interest) => interest.status === "Pending")
      .map((interest) => ({
        ...interest,
        requestId: request.id,
        product: request.product,
      }))
  );

  const myConnections = isBuyer
    ? myRequests.reduce(
        (total, request) =>
          total +
          (request.interests || []).filter(
            (interest) => interest.status === "Accepted"
          ).length,
        0
      )
    : requests.reduce(
        (total, request) =>
          total +
          (request.interests || []).filter(
            (interest) =>
              interest.sellerUid === user?.uid &&
              interest.status === "Accepted"
          ).length,
        0
      );

  const visibleRequests = isBuyer
    ? myRequests
    : requests.filter(
        (request) =>
          request.status === "Open" &&
          request.buyerUid !== user?.uid
      );

  return (
    <div className="bulk-page">
      <nav className="bulk-navbar">
        <Link to="/" className="bulk-logo">
          ❋ RuralRise
        </Link>

        <div className="bulk-nav-links">
          <Link to="/">Home</Link>
          <Link to="/my-dashboard">Dashboard</Link>
          <Link to="/marketplace">Marketplace</Link>
          <Link to="/bulk-requests" className="active">
            Bulk Requests
          </Link>
        </div>
      </nav>

      <header className="bulk-hero">
        <span className="bulk-eyebrow">
          {isBuyer ? "BUYER WORKSPACE" : "SELLER OPPORTUNITIES"}
        </span>

        <h1>
          {isBuyer ? (
            <>
              Post a bulk requirement.{" "}
              <span>Find the right suppliers.</span>
            </>
          ) : (
            <>
              Big Orders. <span>Shared Opportunities.</span>
            </>
          )}
        </h1>

        <p>
          {isBuyer
            ? "Tell RuralRise what you need. Our matching system can identify multiple suppliers who can fulfil your requirement together."
            : "Explore buyer requirements, express interest and build genuine business connections."}
        </p>

        {isBuyer && (
          <a href="#post-request" className="bulk-hero-button">
            Create Bulk Request <span>↓</span>
          </a>
        )}
      </header>

      <main className="bulk-content">
        {/* Dashboard statistics */}
        <section className="bulk-intro">
          <div>
            <span className="bulk-section-label">
              {isBuyer
                ? "YOUR BULK REQUIREMENTS"
                : "OPEN BUYER REQUIREMENTS"}
            </span>

            <h2>
              {isBuyer
                ? "Manage your large orders"
                : "Find orders your business can fulfil"}
            </h2>

            <p>
              {isBuyer
                ? "Publish your quantity, delivery location and deadline. Review sellers before confirming a connection."
                : "Review the buyer's product, quantity and deadline before expressing interest."}
            </p>
          </div>

          <div className="bulk-stats">
            <div>
              <strong>
                {isBuyer ? myRequests.length : visibleRequests.length}
              </strong>
              <span>
                {isBuyer ? "Your requests" : "Open opportunities"}
              </span>
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

        {/* BUYER: Create bulk request and run AI matching */}
        {isBuyer && (
          <>
            <section
              className="bulk-form-section"
              id="post-request"
            >
              <div className="bulk-form-heading">
                <span className="bulk-section-label">
                  CREATE A REQUEST
                </span>

                <h2>What do you need in bulk?</h2>

                <p>
                  Share your requirement and let RuralRise find
                  suppliers who can collectively fulfil it.
                </p>
              </div>

              <form className="bulk-form" onSubmit={handleSubmit}>
                <div className="bulk-form-grid">
                  <label className="bulk-field">
                    Product name *

                    <input
                      type="text"
                      name="product"
                      value={form.product}
                      onChange={handleChange}
                      placeholder="e.g. Organic wheat"
                      required
                    />
                  </label>

                  <label className="bulk-field">
                    Product category *

                    <select
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                      required
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="bulk-field">
                    Required quantity *

                    <input
                      type="number"
                      name="quantity"
                      value={form.quantity}
                      onChange={handleChange}
                      min="1"
                      step="1"
                      placeholder="e.g. 500"
                      required
                    />
                  </label>

                  <label className="bulk-field">
                    Unit *

                    <select
                      name="unit"
                      value={form.unit}
                      onChange={handleChange}
                      required
                    >
                      {units.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="bulk-field">
                    Delivery location *

                    <input
                      type="text"
                      name="location"
                      value={form.location}
                      onChange={handleChange}
                      placeholder="City, state"
                      required
                    />
                  </label>

                  <label className="bulk-field">
                    Required by *

                    <input
                      type="date"
                      name="deadline"
                      value={form.deadline}
                      onChange={handleChange}
                      min={today}
                      required
                    />
                  </label>

                  <label className="bulk-field">
                    Maximum price per unit (₹)

                    <input
                      type="number"
                      name="maxPrice"
                      value={form.maxPrice}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      placeholder="Optional"
                    />
                  </label>

                  <label className="bulk-field bulk-field-full">
                    Buyer / organisation name *

                    <input
                      type="text"
                      name="buyer"
                      value={form.buyer}
                      onChange={handleChange}
                      placeholder="Your business or organisation"
                      required
                    />
                  </label>

                  <label className="bulk-field bulk-field-full">
                    Additional requirements

                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      placeholder="Mention quality, packaging, sizes or other details..."
                      rows="4"
                    />
                  </label>
                </div>

                {message && (
                  <p className="bulk-success" role="status">
                    {message}
                  </p>
                )}

                {error && (
                  <p className="bulk-error" role="alert">
                    {error}
                  </p>
                )}

                <div className="bulk-form-actions">
                  <p>* Required fields</p>

                  <button
                    type="submit"
                    className="bulk-submit-button"
                    disabled={loading}
                  >
                    {loading
                      ? "Finding Suppliers..."
                      : "Publish & Find Matching Suppliers"}
                    <span> →</span>
                  </button>
                </div>
              </form>
            </section>

            {/* AI matching results */}
            {matchingError && (
              <section className="bulk-list-section">
                <p className="bulk-error" role="alert">
                  Your bulk request was published, but matching could not
                  be completed: {matchingError}
                </p>
              </section>
            )}

            {matchingResult && (
              <section
                id="matching-results"
                className="bulk-list-section"
                aria-live="polite"
              >
                <div className="bulk-list-heading">
                  <div>
                    <span className="bulk-section-label">
                      AI MATCHING RESULTS
                    </span>

                    <h2>Available MSME suppliers</h2>

                    <p>
                      Supplier allocation based on the backend matching
                      results.
                    </p>
                  </div>
                </div>

                <div
                  className="bulk-form"
                  style={{
                    marginBottom: "24px",
                    padding: "24px",
                  }}
                >
                  <h3>
                    {matchingResult.product_name || "Matching summary"}
                  </h3>

                  <div className="bulk-request-info">
                    <div>
                      <span>Requested quantity</span>
                      <strong>
                        {formatNumber(
                          matchingResult.required_quantity
                        )}{" "}
                        {matchingResult.unit || "units"}
                      </strong>
                    </div>

                    <div>
                      <span>Matched quantity</span>
                      <strong>
                        {formatNumber(
                          matchingResult.matched_quantity
                        )}{" "}
                        {matchingResult.unit || "units"}
                      </strong>
                    </div>

                    <div>
                      <span>Remaining quantity</span>
                      <strong>
                        {formatNumber(
                          matchingResult.remaining_quantity
                        )}{" "}
                        {matchingResult.unit || "units"}
                      </strong>
                    </div>

                    <div>
                      <span>Fulfillment</span>
                      <strong>
                        {matchingResult.fulfillment_percentage ?? 0}%
                      </strong>
                    </div>

                    <div>
                      <span>Estimated total cost</span>
                      <strong>
                        {formatCurrency(matchingResult.total_cost)}
                      </strong>
                    </div>
                  </div>

                  <p style={{ marginTop: "16px" }}>
                    {matchingResult.is_fulfilled
                      ? "The available suppliers can fulfil the entire requested quantity."
                      : "The available suppliers can fulfil only part, or none, of the requested quantity."}
                  </p>
                </div>

                {matchingResult.matches?.length > 0 ? (
                  <div className="bulk-request-grid">
                    {matchingResult.matches.map((seller, index) => (
                      <article
                        className="bulk-request-card"
                        key={
                          seller.seller_id ||
                          seller.listing_id ||
                          index
                        }
                      >
                        <div className="bulk-request-top">
                          <span className="bulk-request-category">
                            Matched Supplier
                          </span>
                        </div>

                        <h3>
                          {seller.seller_name ||
                            `Supplier ${index + 1}`}
                        </h3>

                        <div className="bulk-request-info">
                          <div>
                            <span>Allocated quantity</span>
                            <strong>
                              {formatNumber(
                                seller.allocated_quantity
                              )}{" "}
                              {matchingResult.unit || "units"}
                            </strong>
                          </div>

                          <div>
                            <span>Unit price</span>
                            <strong>
                              {formatCurrency(seller.unit_price)}
                            </strong>
                          </div>

                          <div>
                            <span>Subtotal</span>
                            <strong>
                              {formatCurrency(seller.subtotal)}
                            </strong>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>
                    No eligible suppliers were found for this request.
                    Try changing the product, unit or maximum price.
                  </p>
                )}
              </section>
            )}

            {/* Buyer: Seller interest inbox */}
            <section className="bulk-inbox-section">
              <div className="bulk-form-heading">
                <span className="bulk-section-label">
                  CONNECTION REQUESTS
                </span>

                <h2>Seller interest requests</h2>

                <p>
                  Accept or reject sellers who want to fulfil your
                  requirements.
                </p>
              </div>

              {myRequests.some(
                (request) => (request.interests || []).length > 0
              ) ? (
                <div className="bulk-interest-list">
                  {myRequests.flatMap((request) =>
                    (request.interests || []).map((interest) => (
                      <div
                        className="bulk-interest-card"
                        key={`${request.id}-${interest.sellerUid}`}
                      >
                        <div>
                          <h3>{interest.sellerName}</h3>

                          <p>
                            Interested in:{" "}
                            <strong>{request.product}</strong>
                          </p>

                          <span>{interest.status}</span>
                        </div>

                        {interest.status === "Pending" && (
                          <div className="bulk-interest-actions">
                            <button
                              type="button"
                              className="bulk-accept-button"
                              onClick={() =>
                                decideInterest(
                                  request.id,
                                  interest.sellerUid,
                                  "Accepted"
                                )
                              }
                            >
                              Accept
                            </button>

                            <button
                              type="button"
                              className="bulk-reject-button"
                              onClick={() =>
                                decideInterest(
                                  request.id,
                                  interest.sellerUid,
                                  "Rejected"
                                )
                              }
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="bulk-empty-inbox">
                  <h3>No seller requests yet</h3>
                  <p>
                    When sellers express interest in your bulk
                    requirements, they will appear here.
                  </p>
                </div>
              )}
            </section>

            {/* Buyer: Own published requests */}
            <section className="bulk-list-section">
              <div className="bulk-list-heading">
                <div>
                  <span className="bulk-section-label">
                    YOUR PUBLISHED REQUESTS
                  </span>

                  <h2>My bulk requirements</h2>
                </div>
              </div>

              <div className="bulk-request-grid">
                {myRequests.map((request) => (
                  <article
                    className="bulk-request-card"
                    key={request.id}
                  >
                    <div className="bulk-request-top">
                      <span className="bulk-request-category">
                        {request.category}
                      </span>

                      <span className="bulk-status">
                        {request.status}
                      </span>
                    </div>

                    <h3>{request.product}</h3>

                    <p className="bulk-buyer">
                      Requested by {request.buyer}
                    </p>

                    <div className="bulk-request-info">
                      <div>
                        <span>Required quantity</span>
                        <strong>
                          {request.quantity} {request.unit}
                        </strong>
                      </div>

                      <div>
                        <span>Delivery location</span>
                        <strong>{request.location}</strong>
                      </div>

                      <div>
                        <span>Required by</span>
                        <strong>{request.deadline}</strong>
                      </div>
                    </div>

                    {request.description && (
                      <p className="bulk-description">
                        {request.description}
                      </p>
                    )}
                  </article>
                ))}
              </div>

              {myRequests.length === 0 && (
                <div className="bulk-empty-inbox">
                  <h3>No bulk requirements published yet</h3>
                  <p>Create your first bulk requirement using the form above.</p>
                </div>
              )}
            </section>
          </>
        )}

        {/* SELLER: View opportunities and express interest */}
        {isSeller && (
          <section className="bulk-list-section">
            <div className="bulk-list-heading">
              <div>
                <span className="bulk-section-label">
                  OPEN OPPORTUNITIES
                </span>

                <h2>Bulk requirements from buyers</h2>

                <p>
                  Choose requirements that match your products and
                  available capacity.
                </p>
              </div>

              <span className="bulk-open-count">
                {visibleRequests.length} opportunities
              </span>
            </div>

            <div className="bulk-request-grid">
              {visibleRequests.map((request) => {
                const myInterest = (request.interests || []).find(
                  (item) => item.sellerUid === user?.uid
                );

                return (
                  <article
                    className="bulk-request-card"
                    key={request.id}
                  >
                    <div className="bulk-request-top">
                      <span className="bulk-request-category">
                        {request.category}
                      </span>

                      <span className="bulk-status">
                        {request.status}
                      </span>
                    </div>

                    <h3>{request.product}</h3>

                    <p className="bulk-buyer">
                      Requested by {request.buyer}
                    </p>

                    <div className="bulk-request-info">
                      <div>
                        <span>Required quantity</span>
                        <strong>
                          {request.quantity} {request.unit}
                        </strong>
                      </div>

                      <div>
                        <span>Delivery location</span>
                        <strong>{request.location}</strong>
                      </div>

                      <div>
                        <span>Required by</span>
                        <strong>{request.deadline}</strong>
                      </div>
                    </div>

                    {request.description && (
                      <p className="bulk-description">
                        {request.description}
                      </p>
                    )}

                    {myInterest ? (
                      <p className="bulk-interest-status">
                        Interest status: {myInterest.status}
                      </p>
                    ) : request.isDemo ? (
                      <p className="bulk-interest-status">
                        Sample opportunity — responses are unavailable
                        for demo data.
                      </p>
                    ) : (
                      <button
                        type="button"
                        className="bulk-interest-button"
                        onClick={() => handleInterest(request.id)}
                      >
                        I'm Interested <span>→</span>
                      </button>
                    )}
                  </article>
                );
              })}
            </div>

            {message && (
              <p className="bulk-success" role="status">
                {message}
              </p>
            )}

            {visibleRequests.length === 0 && (
              <div className="bulk-empty-inbox">
                <h3>No open requests yet</h3>
                <p>Buyer bulk requirements will appear here.</p>
              </div>
            )}
          </section>
        )}

        {!isBuyer && !isSeller && (
          <div className="bulk-empty-inbox">
            <h3>Choose a buyer or seller account</h3>
            <p>
              Bulk requirements are available to registered buyers and
              sellers.
            </p>
          </div>
        )}
      </main>

      <p
        className="bulk-success"
        style={{
          maxWidth: 1100,
          margin: "0 auto 24px",
          padding: "0 20px",
        }}
      >
        Demo data is stored in this browser only. To share requests,
        interests and decisions across different devices or teammate
        accounts, connect the FastAPI and MongoDB backend.
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