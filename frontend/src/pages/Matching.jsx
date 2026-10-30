
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./Matching.css";

const bulkOrder = {
  id: 1,
  product: "Organic Wheat",
  category: "Agriculture",
  requiredQuantity: 500,
  unit: "quintals",
  buyer: "FreshMart Wholesale",
  location: "Delhi, India",
  deadline: "20 November 2026",
};

const suppliers = [
  {
    id: 1,
    name: "Green Fields Farm",
    owner: "Aman Singh",
    location: "Punjab",
    capacity: 200,
    unit: "quintals",
    rating: 4.8,
    category: "Agriculture",
  },
  {
    id: 2,
    name: "Kisan Growers",
    owner: "Raj Kumar",
    location: "Haryana",
    capacity: 150,
    unit: "quintals",
    rating: 4.6,
    category: "Agriculture",
  },
  {
    id: 3,
    name: "Organic Harvest",
    owner: "Simran Kaur",
    location: "Punjab",
    capacity: 100,
    unit: "quintals",
    rating: 4.7,
    category: "Agriculture",
  },
  {
    id: 4,
    name: "Village Grain Co.",
    owner: "Rohit Sharma",
    location: "Uttar Pradesh",
    capacity: 80,
    unit: "quintals",
    rating: 4.5,
    category: "Agriculture",
  },
];

function Matching() {
  const [selectedSuppliers, setSelectedSuppliers] = useState([]);
  const [message, setMessage] = useState("");

  const required = bulkOrder.requiredQuantity;

  const selectedCapacity = useMemo(() => {
    return suppliers
      .filter((supplier) => selectedSuppliers.includes(supplier.id))
      .reduce((total, supplier) => total + supplier.capacity, 0);
  }, [selectedSuppliers]);

  const fulfilledQuantity = Math.min(selectedCapacity, required);

  const matchPercentage = Math.min(
    Math.round((selectedCapacity / required) * 100),
    100
  );

  const remainingQuantity = Math.max(required - selectedCapacity, 0);

  const excessQuantity = Math.max(selectedCapacity - required, 0);

  const toggleSupplier = (id) => {
    setMessage("");

    setSelectedSuppliers((previous) =>
      previous.includes(id)
        ? previous.filter((supplierId) => supplierId !== id)
        : [...previous, id]
    );
  };

  const handleConfirm = () => {
    if (selectedSuppliers.length === 0) {
      setMessage("Please select at least one supplier first.");
      return;
    }

    if (selectedCapacity < required) {
      setMessage(
        `You have selected ${selectedCapacity} ${bulkOrder.unit}. You still need ${remainingQuantity} ${bulkOrder.unit} to fulfil this order.`
      );
      return;
    }

    if (excessQuantity > 0) {
      setMessage(
        `Order requirement achieved! ${fulfilledQuantity} ${bulkOrder.unit} can fulfil the order, with ${excessQuantity} ${bulkOrder.unit} extra capacity available.`
      );
      return;
    }

    setMessage(
      "Great! Your selected suppliers can fulfil this bulk order. This is a demo confirmation."
    );
  };

  const formatNumber = (number) =>
    number.toLocaleString("en-IN");

  return (
    <div className="matching-page">
      <nav className="matching-navbar">
        <Link to="/" className="matching-logo">
          Rural<span>Rise</span>
        </Link>

        <div className="matching-nav-links">
          <Link to="/">Home</Link>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/marketplace">Marketplace</Link>
          <Link to="/bulk-requests">Bulk Requests</Link>
        </div>
      </nav>

      <header className="matching-hero">
        <div className="matching-hero-content">
          <span className="matching-tag">SMART SUPPLIER MATCHING</span>
          <h1>
            Small Businesses.
            <br />
            <span>Big Possibilities.</span>
          </h1>
          <p>
            Connect with suitable MSMEs, combine available capacity,
            and fulfil bulk orders together.
          </p>
        </div>
      </header>

      <main className="matching-container">
        <section className="matching-intro">
          <div>
            <span className="matching-section-label">BUYER DASHBOARD</span>
            <h2>Find Your Suppliers</h2>
            <p>
              Select suppliers whose combined capacity can fulfil
              your bulk order.
            </p>
          </div>
        </section>

        <section className="matching-order-card">
          <div className="matching-order-heading">
            <div>
              <span className="matching-section-label">ACTIVE BULK ORDER</span>
              <h3>{bulkOrder.product}</h3>
              <span className="matching-category">{bulkOrder.category}</span>
            </div>
            <span className="matching-open-status">Open Request</span>
          </div>

          <div className="matching-order-details">
            <div>
              <span>Required quantity</span>
              <strong>
                {formatNumber(required)} {bulkOrder.unit}
              </strong>
            </div>
            <div>
              <span>Buyer</span>
              <strong>{bulkOrder.buyer}</strong>
            </div>
            <div>
              <span>Delivery location</span>
              <strong>{bulkOrder.location}</strong>
            </div>
            <div>
              <span>Required by</span>
              <strong>{bulkOrder.deadline}</strong>
            </div>
          </div>
        </section>

        <section className="matching-progress-card">
          <div className="matching-progress-heading">
            <div>
              <span className="matching-section-label">CAPACITY OVERVIEW</span>
              <h3>Order Fulfilment Progress</h3>
            </div>
            <strong className="matching-percentage">
              {matchPercentage}%
            </strong>
          </div>

          <div className="matching-progress-track">
            <div
              className="matching-progress-fill"
              style={{ width: `${matchPercentage}%` }}
            />
          </div>

          <div className="matching-progress-stats">
            <div>
              <span>Selected capacity</span>
              <strong>
                {formatNumber(selectedCapacity)} {bulkOrder.unit}
              </strong>
            </div>

            <div>
              <span>Order requirement</span>
              <strong>
                {formatNumber(required)} {bulkOrder.unit}
              </strong>
            </div>

            <div>
              <span>Still needed</span>
              <strong>
                {formatNumber(remainingQuantity)} {bulkOrder.unit}
              </strong>
            </div>

            {excessQuantity > 0 && (
              <div className="matching-excess">
                <span>Extra available capacity</span>
                <strong>
                  +{formatNumber(excessQuantity)} {bulkOrder.unit}
                </strong>
              </div>
            )}
          </div>

          {selectedCapacity >= required ? (
            <p className="matching-capacity-message success">
              ✓ Required capacity achieved!
              {excessQuantity > 0 &&
                ` You have ${formatNumber(excessQuantity)} ${bulkOrder.unit} extra capacity.`}
            </p>
          ) : (
            <p className="matching-capacity-message">
              Select more suppliers to meet the required quantity.
            </p>
          )}
        </section>

        <section className="matching-suppliers-section">
          <div className="matching-suppliers-heading">
            <div>
              <span className="matching-section-label">POTENTIAL PARTNERS</span>
              <h2>Matching MSME Suppliers</h2>
              <p>
                Choose one or more suppliers to combine their available
                capacity.
              </p>
            </div>
            <span className="matching-count">
              {suppliers.length} suppliers found
            </span>
          </div>

          <div className="matching-supplier-grid">
            {suppliers.map((supplier) => {
              const isSelected = selectedSuppliers.includes(supplier.id);

              return (
                <article
                  className={`matching-supplier-card ${
                    isSelected ? "selected" : ""
                  }`}
                  key={supplier.id}
                >
                  <div className="matching-supplier-top">
                    <div className="matching-supplier-avatar">
                      {supplier.name.charAt(0)}
                    </div>
                    <span className="matching-rating">
                      ★ {supplier.rating}
                    </span>
                  </div>

                  <span className="matching-category">
                    {supplier.category}
                  </span>

                  <h3>{supplier.name}</h3>
                  <p className="matching-owner">
                    Managed by {supplier.owner}
                  </p>

                  <div className="matching-supplier-info">
                    <div>
                      <span>Location</span>
                      <strong>{supplier.location}</strong>
                    </div>
                    <div>
                      <span>Available capacity</span>
                      <strong>
                        {formatNumber(supplier.capacity)} {supplier.unit}
                      </strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`matching-select-button ${
                      isSelected ? "is-selected" : ""
                    }`}
                    onClick={() => toggleSupplier(supplier.id)}
                  >
                    {isSelected ? "✓ Selected" : "+ Select Supplier"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="matching-confirm-section">
          <div>
            <span className="matching-section-label">YOUR SELECTION</span>
            <h3>
              {selectedSuppliers.length} Supplier
              {selectedSuppliers.length === 1 ? "" : "s"} Selected
            </h3>
            <p>
              Combined capacity: {formatNumber(selectedCapacity)}{" "}
              {bulkOrder.unit}
            </p>
          </div>

          <button
            type="button"
            className="matching-confirm-button"
            onClick={handleConfirm}
          >
            Confirm Supplier Selection
          </button>
        </section>

        {message && (
          <div
            className={`matching-message ${
              selectedCapacity >= required && selectedSuppliers.length > 0
                ? "success"
                : ""
            }`}
          >
            {message}
          </div>
        )}
      </main>

      <footer className="matching-footer">
        <h3>RuralRise</h3>
        <p>SELL. SCALE. GROW.</p>
        <span>Empowering rural businesses, together.</span>
      </footer>
    </div>
  );
}

export default Matching;
