
import { Link, useLocation } from "react-router-dom";
import "./PaymentResult.css";

function PaymentResult() {
  const location = useLocation();

  const {
    orderId,
    amount,
    productName,
    method,
    result,
    transactionId,
  } = location.state || {};

  if (!orderId || !result) {
    return (
      <div className="payment-result-page">
        <div className="payment-result-card">
          <h2>Payment result unavailable</h2>
          <p>Please check your orders for the latest status.</p>
          <Link to="/my-orders">Go to My Orders</Link>
        </div>
      </div>
    );
  }

  const isSuccess = result === "success";
  const isCOD = result === "cod";
  const isFailed = result === "failed";
  const isCancelled = result === "cancelled";

  const heading = isCOD
    ? "Cash on Delivery Selected!"
    : isSuccess
      ? "Demo Payment Successful!"
      : isFailed
        ? "Demo Payment Failed"
        : "Payment Cancelled";

  const message = isCOD
    ? "Your order has been placed with Cash on Delivery. Payment will be due upon delivery."
    : isSuccess
      ? "Your simulated payment was completed successfully. No real money was transferred."
      : isFailed
        ? "The simulated payment was unsuccessful. You can return to My Orders and try again."
        : "You cancelled the simulated payment. You can retry from My Orders.";

  const paymentStatus = isCOD
    ? "Pay on Delivery"
    : isSuccess
      ? "Demo Successful"
      : isFailed
        ? "Failed"
        : "Cancelled";

  const isPositiveResult = isSuccess || isCOD;

  return (
    <div className="payment-result-page">
      <div className="payment-result-card">
        <span
          className={`payment-result-icon ${
            isPositiveResult ? "success" : "failure"
          }`}
        >
          {isPositiveResult ? "✓" : "!"}
        </span>

        <span className="payment-result-demo">
          RURALRISE · DEMO PAYMENT
        </span>

        <h1>{heading}</h1>
        <p>{message}</p>

        <div className="payment-result-details">
          <div>
            <span>Order ID</span>
            <strong>{orderId}</strong>
          </div>

          <div>
            <span>Product</span>
            <strong>{productName || "RuralRise order"}</strong>
          </div>

          <div>
            <span>Amount</span>
            <strong>
              ₹{Number(amount || 0).toLocaleString("en-IN")}
            </strong>
          </div>

          <div>
            <span>Payment Method</span>
            <strong>{method || "Not available"}</strong>
          </div>

          <div>
            <span>Payment Status</span>
            <strong>{paymentStatus}</strong>
          </div>

          {transactionId && (
            <div>
              <span>Demo Transaction ID</span>
              <strong>{transactionId}</strong>
            </div>
          )}
        </div>

        <div className="payment-result-disclaimer">
          This is a simulated transaction. No real money was transferred.
          Payment success does not mean the seller has accepted the order.
        </div>

        <div className="payment-result-actions">
          <Link to="/my-orders" className="payment-result-primary">
            {isFailed || isCancelled
              ? "Return to My Orders & Retry"
              : "View My Orders"}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PaymentResult;
