
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./OrderConfirmation.css";
import { useMemo, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

function OrderConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const order = location.state;
  const { user } = useAuth();

  const orderId = useMemo(
    () => `RR-${Date.now().toString().slice(-8)}`,
    []
  );

  useEffect(() => {
    if (!order?.product || !order?.formData || !user?.uid) return;

    try {
      const existingOrders = JSON.parse(
        localStorage.getItem("ruralrise_orders") || "[]"
      );

      if (existingOrders.some((item) => item.orderId === orderId)) return;

      const allocations = (order.sellerAllocations || []).map(
        (seller) => ({
          ...seller,
          sellerUid: seller.sellerUid || "",
          status: "Pending",
        })
      );

      const savedOrder = {
        orderId,
        buyerUid: user.uid,
        buyerName: order.formData.buyer_name || user.displayName || "Buyer",
        buyerEmail: user.email || "",
        productName: order.product.name || "Product",
        productId: order.product.id || "",
        quantity: Number(order.quantity) || 0,
        unit: order.product.unit || "",
        estimatedPrice: Number(order.estimatedPrice) || 0,
        deliveryLocation: order.formData.delivery_location || "",
        contact: order.formData.contact || "",
        requirements: order.formData.requirements || "",
        fulfilmentType:
          order.fulfilmentType === "single"
            ? "Single-Seller"
            : order.fulfilmentType === "multiple"
              ? "Multi-Seller"
              : "Partial Fulfilment",
        sellerAllocations: allocations,
        status: "Pending",
        paymentStatus: "Payment Pending",
        paymentMethod: "",
        transactionId: "",
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem(
        "ruralrise_orders",
        JSON.stringify([...existingOrders, savedOrder])
      );

      window.dispatchEvent(new Event("ruralrise-orders-updated"));
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

  const orderAllocations = Array.isArray(sellerAllocations)
    ? sellerAllocations
    : [];

  const orderTotal = Number(estimatedPrice) || 0;

  const proceedToPayment = () => {
    navigate("/payment", {
      state: {
        orderId,
        amount: orderTotal,
        productName: product.name,
      },
    });
  };

  return (
    <div className="confirmation-page">
      <nav className="confirmation-navbar">
        <Link to="/" className="confirmation-logo">
          ❋ RuralRise
        </Link>
        <div>
          <Link to="/my-dashboard">Dashboard</Link>
          <Link to="/marketplace">Marketplace</Link>
        </div>
      </nav>

      <main className="confirmation-container">
        <div className="confirmation-success-icon">✓</div>
        <span className="confirmation-eyebrow">
          SELL → SCALE → GROW
        </span>

        <h1>Order Request Submitted!</h1>
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
            <span className="demo-status">Awaiting Seller Response</span>
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
              <strong>{quantity} {product.unit}</strong>
            </div>
            <div>
              <small>Delivery Location</small>
              <strong>{formData.delivery_location || "Not provided"}</strong>
            </div>
            <div>
              <small>Contact Number</small>
              <strong>{formData.contact || "Not provided"}</strong>
            </div>
            <div>
              <small>Estimated Product Cost</small>
              <strong>₹{orderTotal.toLocaleString("en-IN")}</strong>
            </div>
            <div>
              <small>Fulfilment Type</small>
              <strong>{fulfilmentType || "Not specified"}</strong>
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

          {orderAllocations.length > 0 ? (
            orderAllocations.map((seller, index) => (
              <div
                className="confirmation-seller"
                key={`${seller.name}-${index}`}
              >
                <div>
                  <strong>{seller.name}</strong>
                  <small>{seller.location || "Location not provided"}</small>
                </div>
                <strong>
                  {Number(seller.allocated) || 0} {product.unit}
                </strong>
              </div>
            ))
          ) : (
            <p>No seller allocations are available.</p>
          )}

          <div className="confirmation-total">
            <strong>Combined Contribution</strong>
            <strong>{fulfilledQuantity} {product.unit}</strong>
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
              Additional sellers or stock may be required.
            </p>
          )}
        </section>

        <div className="confirmation-notice">
          <strong>Order status: Pending</strong>
          <p>
            The assigned sellers need to fulfil their contributions
            before the order can be marked Completed.
          </p>
          <strong>Payment status: Payment Pending</strong>
          <p>
            This is a simulated payment for the RuralRise MVP.
          </p>
        </div>

        <div className="confirmation-actions">
          <button
            type="button"
            className="confirmation-primary"
            onClick={proceedToPayment}
          >
            Proceed to Demo Payment →
          </button>
          <Link to="/my-orders" className="confirmation-secondary">
            View My Orders
          </Link>
          <Link to="/marketplace" className="confirmation-secondary">
            Continue Shopping
          </Link>
        </div>

        <p className="confirmation-disclaimer">
          Demo only: order and payment information are saved in this browser.
        </p>
      </main>
    </div>
  );
}

export default OrderConfirmation;
