
import { Link, useLocation } from "react-router-dom";
import "./OrderConfirmation.css";
import { useMemo, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

function OrderConfirmation() {
  const location = useLocation();
  const order = location.state;
  const { user } = useAuth();

  const orderId = useMemo(
    () => `RR-${Date.now().toString().slice(-8)}`,
    []
  );
  useEffect(() => {
  if (!order || !user?.uid) return;

  try {
    const existingOrders = JSON.parse(
      localStorage.getItem("ruralrise_orders") || "[]"
    );

    // Prevent saving the same order twice
    const alreadySaved = existingOrders.some(
      (savedOrder) => savedOrder.orderId === orderId
    );

    if (alreadySaved) return;

    const savedOrder = {
      orderId,
      buyerUid: user.uid,
      buyerName: order.formData?.buyer_name || user.displayName || "Buyer",
      productName: order.product?.name || "Product",
      quantity: Number(order.quantity) || 0,
      unit: order.product?.unit || order.product?.priceUnit || "",
      estimatedPrice: Number(order.estimatedPrice) || 0,
      fulfilmentType:
        order.fulfilmentType === "single"
          ? "Single-Seller"
          : order.fulfilmentType === "multiple"
            ? "Multi-Seller"
            : "Partial Fulfilment",
      sellerAllocations: order.sellerAllocations || [],
      status: "Pending",
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(
      "ruralrise_orders",
      JSON.stringify([...existingOrders, savedOrder])
    );

  } catch (error) {
    console.error("Unable to save order:", error);
  }
}, [order, orderId, user]);

  if (!order || !order.product || !order.formData) {
    return (
      <div className="confirmation-not-found">
        <h2>No order information found</h2>
        <p>Please create an order request first.</p>
        <Link to="/marketplace">Go to Marketplace</Link>
      </div>
    );
  }

  const {
    product,
    formData,
    quantity = 0,
    estimatedPrice = 0,
    sellerAllocations = [],
    fulfilledQuantity = 0,
    isFullyFulfilled = false,
    fulfilmentType,
  } = order;

  const safeAllocations = Array.isArray(sellerAllocations)
    ? sellerAllocations
    : [];

  const totalQuantity = Number(fulfilledQuantity) || 0;
  const requestedQuantity = Number(quantity) || 0;
  const totalPrice = Number(estimatedPrice) || 0;

  const displayFulfilmentType =
    fulfilmentType ||
    (safeAllocations.length > 1
      ? "Multi-Seller Fulfilment"
      : "Single-Seller Fulfilment");

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
          Your order request has been prepared successfully.
          Review the details and proposed seller contributions below.
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

          <div className="confirmation-order-id">
            <small>Order Reference</small>
            <strong>{orderId}</strong>
          </div>

          <div className="confirmation-details">

            <div>
              <small>Buyer Name</small>
              <strong>{formData.buyer_name || "Not provided"}</strong>
            </div>

            <div>
              <small>Required Quantity</small>
              <strong>
                {requestedQuantity} {product.unit || product.priceUnit || ""}
              </strong>
            </div>

            <div>
              <small>Delivery Location</small>
              <strong>
                {formData.delivery_location || "Not provided"}
              </strong>
            </div>

            <div>
              <small>Contact Number</small>
              <strong>{formData.contact || "Not provided"}</strong>
            </div>

            <div>
              <small>Estimated Product Cost</small>
              <strong>
                ₹{totalPrice.toLocaleString("en-IN")}
              </strong>
            </div>

            <div>
              <small>Fulfilment Type</small>
              <strong>{displayFulfilmentType}</strong>
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

          {safeAllocations.length > 0 ? (
            safeAllocations.map((seller, index) => (
              <div
                className="confirmation-seller"
                key={`${seller.name}-${index}`}
              >
                <div>
                  <strong>{seller.name}</strong>
                  <small>{seller.location || "Location not provided"}</small>
                </div>

                <strong>
                  {Number(seller.allocated) || 0}{" "}
                  {product.unit || product.priceUnit || ""}
                </strong>
              </div>
            ))
          ) : (
            <p>No seller allocations are available.</p>
          )}

          <div className="confirmation-total">
            <strong>Combined Contribution</strong>
            <strong>
              {totalQuantity} {product.unit || product.priceUnit || ""}
            </strong>
          </div>

          <div className="confirmation-fulfilment-status">
            <small>Stock Availability</small>
            <strong>
              {isFullyFulfilled
                ? "Full quantity available"
                : "Partial quantity available"}
            </strong>
          </div>

          {!isFullyFulfilled && (
            <p className="confirmation-warning">
              The currently available sellers cannot fulfil the
              complete requested quantity. Additional sellers
              or stock may be required.
            </p>
          )}

        </section>

        <div className="confirmation-notice">
          <strong>What happens next?</strong>
          <p>
            In the final RuralRise system, this request will be
            shared with the selected MSMEs. They can review their
            proposed contributions and respond to the buyer.
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
          Frontend demonstration only. This request has not
          been saved to the database or sent to sellers.
        </p>

      </main>
    </div>
  );
}

export default OrderConfirmation;
