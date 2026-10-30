
import { useState } from "react";
import { Link } from "react-router-dom";
import "./BulkRequests.css";

const initialRequests = [
  {
    id: 1,
    product: "Organic Wheat",
    category: "Agriculture",
    quantity: "500",
    unit: "quintals",
    location: "Delhi, India",
    deadline: "2026-11-20",
    buyer: "FreshMart Wholesale",
    description: "Looking for clean, quality wheat for wholesale distribution.",
    status: "Open",
  },
  {
    id: 2,
    product: "Handwoven Baskets",
    category: "Handicrafts",
    quantity: "1,000",
    unit: "pieces",
    location: "Jaipur, Rajasthan",
    deadline: "2026-11-25",
    buyer: "Earth & Home Stores",
    description: "Natural handwoven baskets in multiple sizes.",
    status: "Open",
  },
  {
    id: 3,
    product: "Homemade Pickles",
    category: "Food",
    quantity: "300",
    unit: "jars",
    location: "Chandigarh, Punjab",
    deadline: "2026-12-01",
    buyer: "Local Taste Retail",
    description: "Interested in hygienically packed traditional pickles.",
    status: "Open",
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

function BulkRequests() {
  const [requests, setRequests] = useState(initialRequests);

  const [form, setForm] = useState({
    product: "",
    category: "Agriculture",
    quantity: "",
    unit: "pieces",
    location: "",
    deadline: "",
    buyer: "",
    description: "",
  });

  const [message, setMessage] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setMessage("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const newRequest = {
      ...form,
      id: Date.now(),
      quantity: Number(form.quantity).toLocaleString("en-IN"),
      status: "Open",
    };

    setRequests((current) => [newRequest, ...current]);

    setForm({
      product: "",
      category: "Agriculture",
      quantity: "",
      unit: "pieces",
      location: "",
      deadline: "",
      buyer: "",
      description: "",
    });

    setMessage(
      "Your bulk request has been added to the demo marketplace."
    );
  };

  return (
    <div className="bulk-page">

      {/* Navbar */}
      <nav className="bulk-navbar">
        <Link to="/" className="bulk-logo">
          ❋ RuralRise
        </Link>

        <div className="bulk-nav-links">
          <Link to="/">Home</Link>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/marketplace">Marketplace</Link>
          <Link to="/bulk-requests" className="active">
            Bulk Requests
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="bulk-hero">
        <span className="bulk-eyebrow">
          GROW TOGETHER
        </span>

        <h1>
          Big Orders. <span>Shared Opportunities.</span>
        </h1>

        <p>
          Post your bulk requirement and connect with rural businesses
          that can fulfil it together.
        </p>

        <a href="#post-request" className="bulk-hero-button">
          Post a Requirement <span>↓</span>
        </a>
      </header>

      <main className="bulk-content">

        {/* Introduction */}
        <section className="bulk-intro">
          <div>
            <span className="bulk-section-label">
              FOR BUYERS & BUSINESSES
            </span>

            <h2>Make your next big order possible</h2>

            <p>
              When one business cannot fulfil an order alone,
              multiple producers can combine their available capacity.
            </p>
          </div>

          <div className="bulk-stats">
            <div>
              <strong>{requests.length}</strong>
              <span>Demo requests</span>
            </div>

            <div>
              <strong>1</strong>
              <span>Shared goal</span>
            </div>
          </div>
        </section>

        {/* Bulk Request Form */}
        <section className="bulk-form-section" id="post-request">

          <div className="bulk-form-heading">
            <span className="bulk-section-label">
              CREATE A REQUEST
            </span>

            <h2>What do you need in bulk?</h2>

            <p>
              Share the details so suitable suppliers can find your requirement.
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
                >
                  <option value="pieces">Pieces</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="quintals">Quintals</option>
                  <option value="tonnes">Tonnes</option>
                  <option value="litres">Litres</option>
                  <option value="boxes">Boxes</option>
                  <option value="jars">Jars</option>
                  <option value="packs">Packs</option>
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

            <div className="bulk-form-actions">
              <p>* Required fields</p>

              <button
                type="submit"
                className="bulk-submit-button"
              >
                Publish Bulk Request <span>→</span>
              </button>
            </div>

          </form>
        </section>

        {/* Available Requests */}
        <section className="bulk-list-section">

          <div className="bulk-list-heading">
            <div>
              <span className="bulk-section-label">
                OPEN OPPORTUNITIES
              </span>

              <h2>Bulk requirements from buyers</h2>

              <p>
                Explore sample requests and see where your business could contribute.
              </p>
            </div>

            <span className="bulk-open-count">
              {requests.length} requests
            </span>
          </div>

          <div className="bulk-request-grid">

            {requests.map((request) => (
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

                <button
                  type="button"
                  className="bulk-interest-button"
                  onClick={() =>
                    setMessage(
                      `Interest in "${request.product}" noted for this demo. Supplier matching will be connected later.`
                    )
                  }
                >
                  I'm Interested <span>→</span>
                </button>

              </article>
            ))}

          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bulk-footer">
        <span>❋ RuralRise</span>

        <p>SELL → SCALE → GROW</p>

        <small>
          © 2026 RuralRise. Growing together.
        </small>
      </footer>

    </div>
  );
}

export default BulkRequests;
