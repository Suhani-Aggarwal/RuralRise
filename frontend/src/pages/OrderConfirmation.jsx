
import { Link, useLocation } from "react-router-dom";
import "./OrderConfirmation.css";

function OrderConfirmation() {
  const location = useLocation();

  const order = location.state;

  if (!order) {
    return (
      <div className="confirmation-not-found">
        <h2>No order information found</h2>
        <p>Please create an order first.</p>
        <Link to="/marketplace">Go to Marketplace</Link>
      </div>
    );
  }

  const {
    product,
    formData,
    quantity,
    estimatedPrice,
    sellerAllocations,
    fulfilledQuantity,
    isFullyFulfilled,
  } = order;

  return (
    <div className="confirmation-page">

      <nav className="confirmation-navbar">
        <Link to="/" className="confirmation-logo">
          ❋ RuralRise
        </Link>

        <div>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/marketplace">Marketplace</Link>
        </div>
      </nav>

      <main className="confirmation-container">

        <div className="confirmation-success-icon">
          ✓
        </div>

        <span className="confirmation-eyebrow">
          SELL → SCALE → GROW
        </span>

        <h1>Order Request Prepared!</h1>

        <p className="confirmation-intro">
          Your order details have been recorded in this
          frontend demo. Here's your order summary.
        </p>

        <section className="confirmation-card">

          <div className="confirmation-card-heading">
            <div>
              <span>ORDER SUMMARY</span>
              <h2>{product.name}</h2>
            </div>

            <span className="demo-status">
              Demo Preview
            </span>
          </div>

          <div className="confirmation-details">

            <div>
              <small>Buyer Name</small>
              <strong>{formData.buyer_name}</strong>
            </div>

            <div>
              <small>Required Quantity</small>
              <strong>
                {quantity} {product.unit}
              </strong>
            </div>

            <div>
              <small>Delivery Location</small>
              <strong>{formData.delivery_location}</strong>
            </div>

            <div>
              <small>Contact Number</small>
              <strong>{formData.contact}</strong>
            </div>

            <div>
              <small>Estimated Product Cost</small>
              <strong>
                ₹{estimatedPrice.toLocaleString("en-IN")}
              </strong>
            </div>

            <div>
              <small>Fulfilment Status</small>
              <strong>
                {isFullyFulfilled
                  ? "Sample stock sufficient"
                  : "Additional sellers needed"}
              </strong>
            </div>

          </div>

          {formData.requirements && (
            <div className="confirmation-requirements">
              <small>Additional Requirements</small>
              <p>{formData.requirements}</p>
            </div>
          )}

          <div className="confirmation-divider" />

          <h3>Proposed Seller Contributions</h3>

          {sellerAllocations.map((seller) => (
            <div
              className="confirmation-seller"
              key={seller.name}
            >
              <div>
                <strong>{seller.name}</strong>
                <small>{seller.location}</small>
              </div>

              <strong>
                {seller.allocated} {product.unit}
              </strong>
            </div>
          ))}

          <div className="confirmation-total">
            <strong>Combined Contribution</strong>
            <strong>
              {fulfilledQuantity} {product.unit}
            </strong>
          </div>

          {!isFullyFulfilled && (
            <p className="confirmation-warning">
              The sample sellers cannot fulfil the entire
              order. Additional sellers would be required.
            </p>
          )}

        </section>

        <div className="confirmation-notice">
          <strong>What happens next?</strong>
          <p>
            In the final system, RuralRise will send the
            request to the selected sellers. They can review
            their proposed contributions before the order
            is confirmed.
          </p>
        </div>

        <div className="confirmation-actions">
          <Link to="/marketplace" className="confirmation-primary">
            Continue Shopping
          </Link>

          <Link to="/dashboard" className="confirmation-secondary">
            Go to Dashboard
          </Link>
        </div>

        <p className="confirmation-disclaimer">
          Frontend demonstration only. No actual order has
          been saved, sent to sellers or confirmed yet.
        </p>

      </main>
    </div>
  );
}

export default OrderConfirmation;
