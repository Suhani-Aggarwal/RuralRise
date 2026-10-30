
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Payment.css";

function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { orderId, amount, productName } = location.state || {};

  const [method, setMethod] = useState("UPI");
  const [processing, setProcessing] = useState(false);

  if (!orderId || amount === undefined || !user?.uid) {
    return (
      <div className="payment-page">
        <div className="payment-card">
          <h2>Checkout information unavailable</h2>
          <p>Please open payment from your My Orders page.</p>
          <Link to="/my-orders">Go to My Orders</Link>
        </div>
      </div>
    );
  }

  const simulatePayment = (result) => {
    if (processing) return;

    setProcessing(true);

    try {
      const savedOrders = JSON.parse(
        localStorage.getItem("ruralrise_orders") || "[]"
      );

      const orderExists = savedOrders.some(
        (item) =>
          item.orderId === orderId && item.buyerUid === user.uid
      );

      if (!orderExists) {
        alert("Order not found. Please create your order again.");
        setProcessing(false);
        return;
      }

      const isCancelled = result === "cancelled";
      const isCOD = method === "Cash on Delivery";
      const isSuccessful = result === "success" && !isCancelled;

      const transactionId =
        isSuccessful && !isCOD
          ? `DEMO-TXN-${Date.now()}`
          : "";

      let paymentStatus;

      if (isCancelled) {
        paymentStatus = "Cancelled";
      } else if (isCOD) {
        paymentStatus = "Pay on Delivery";
      } else if (result === "success") {
        paymentStatus = "Demo Successful";
      } else {
        paymentStatus = "Failed";
      }

      const updatedOrders = savedOrders.map((item) => {
        if (
          item.orderId !== orderId ||
          item.buyerUid !== user.uid
        ) {
          return item;
        }

        return {
          ...item,
          paymentMethod: method,
          paymentStatus,
          transactionId,
          paymentUpdatedAt: new Date().toISOString(),

          // Payment does not mean the seller has accepted the order.
          // Preserve the existing order status until seller response.
          status: item.status || "Pending",
        };
      });

      localStorage.setItem(
        "ruralrise_orders",
        JSON.stringify(updatedOrders)
      );

      const paymentResult = isCancelled
        ? "cancelled"
        : isCOD
          ? "cod"
          : result;

      navigate("/payment-result", {
        replace: true,
        state: {
          orderId,
          amount: Number(amount),
          productName,
          method,
          result: paymentResult,
          transactionId,
        },
      });
    } catch (error) {
      console.error("Demo payment error:", error);
      alert("Unable to update payment status. Please try again.");
      setProcessing(false);
    }
  };

  return (
    <div className="payment-page">
      <div className="payment-card">
        <Link to="/my-orders" className="payment-back">
          ← My Orders
        </Link>

        <div className="payment-brand">❋ RuralRise</div>
        <span className="payment-demo-label">MVP DEMO CHECKOUT</span>

        <h1>Complete Your Order</h1>
        <p className="payment-description">
          Choose a payment method and test the checkout experience.
          No real payment will be made.
        </p>

        <div className="payment-summary">
          <span>Order reference</span>
          <strong>{orderId}</strong>

          <span>Product</span>
          <strong>{productName || "RuralRise order"}</strong>

          <span>Total amount</span>
          <strong className="payment-amount">
            ₹{Number(amount).toLocaleString("en-IN")}
          </strong>
        </div>

        <h2>Select Payment Method</h2>

        <div className="payment-methods">
          {[
            {
              name: "UPI",
              icon: "📱",
              detail: "Simulated UPI checkout",
            },
            {
              name: "Debit / Credit Card",
              icon: "💳",
              detail: "Simulated card checkout",
            },
            {
              name: "Net Banking",
              icon: "🏦",
              detail: "Simulated net banking",
            },
            {
              name: "Cash on Delivery",
              icon: "💵",
              detail: "Pay when the order arrives",
            },
          ].map((item) => (
            <label
              className={`payment-method ${
                method === item.name ? "selected" : ""
              }`}
              key={item.name}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={item.name}
                checked={method === item.name}
                onChange={() => setMethod(item.name)}
                disabled={processing}
              />

              <span className="payment-method-icon">{item.icon}</span>

              <span className="payment-method-copy">
                <strong>{item.name}</strong>
                <small>{item.detail}</small>
              </span>
            </label>
          ))}
        </div>

        <div className="payment-demo-warning">
          <strong>Demo mode only</strong>
          <p>
            These buttons simulate payment outcomes. Do not enter actual
            payment credentials. No money will be transferred.
          </p>
        </div>

        {method === "Cash on Delivery" ? (
          <button
            type="button"
            className="payment-action"
            disabled={processing}
            onClick={() => simulatePayment("success")}
          >
            {processing ? "Please wait..." : "Confirm Cash on Delivery"}
          </button>
        ) : (
          <div className="payment-test-actions">
            <button
              type="button"
              className="payment-action"
              disabled={processing}
              onClick={() => simulatePayment("success")}
            >
              {processing
                ? "Please wait..."
                : "Simulate Successful Payment"}
            </button>

            <button
              type="button"
              className="payment-fail-action"
              disabled={processing}
              onClick={() => simulatePayment("failed")}
            >
              Simulate Failed Payment
            </button>
          </div>
        )}

        <button
          type="button"
          className="payment-cancel-action"
          disabled={processing}
          onClick={() => simulatePayment("cancelled")}
        >
          Cancel Payment
        </button>
      </div>
    </div>
  );
}

export default Payment;
