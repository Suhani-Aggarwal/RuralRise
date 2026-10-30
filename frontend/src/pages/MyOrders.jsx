
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./MyOrders.css";

function MyOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!user?.uid) {
      setOrders([]);
      return;
    }

    function loadOrders() {
      try {
        const savedOrders = JSON.parse(
          localStorage.getItem("ruralrise_orders") || "[]"
        );

        setOrders(
          savedOrders.filter((order) => order.buyerUid === user.uid)
        );
      } catch (error) {
        console.error("Unable to load orders:", error);
        setOrders([]);
      }
    }

    loadOrders();

    window.addEventListener("storage", loadOrders);
    window.addEventListener("ruralrise-orders-updated", loadOrders);

    return () => {
      window.removeEventListener("storage", loadOrders);
      window.removeEventListener("ruralrise-orders-updated", loadOrders);
    };
  }, [user?.uid]);

  function handlePayment(order) {
    navigate("/payment", {
      state: {
        orderId: order.orderId,
        amount: Number(order.estimatedPrice) || 0,
        productName: order.productName || "Product",
      },
    });
  }

  return (
    <div className="my-orders-page">
      <header className="my-orders-header">
        <Link to="/buyer-dashboard">← Back to Dashboard</Link>
        <span>RURALRISE · BUYER</span>
        <h1>My Orders</h1>
        <p>Track and review the orders you have placed.</p>
      </header>

      {orders.length === 0 ? (
        <div className="my-orders-empty">
          <h2>No orders yet</h2>
          <p>Your placed orders will appear here.</p>
          <Link to="/marketplace">Explore Marketplace →</Link>
        </div>
      ) : (
        <div className="my-orders-list">
          {orders.slice().reverse().map((order) => {
            const paymentStatus = order.paymentStatus || "Payment Pending";

            const paymentCompleted =
              paymentStatus === "Demo Successful" ||
              paymentStatus === "Pay on Delivery";

            const completedContributions = (
              order.sellerAllocations || []
            ).filter((allocation) => allocation.status === "Completed").length;

            const totalContributions = (
              order.sellerAllocations || []
            ).length;

            return (
              <article className="my-order-card" key={order.orderId}>
                <div className="my-order-details">
                  <span>{order.orderId}</span>
                  <h2>{order.productName}</h2>

                  <p>Quantity: {order.quantity} {order.unit}</p>
                  <p>Fulfilment: {order.fulfilmentType}</p>
                  <p>Delivery: {order.deliveryLocation || "Not provided"}</p>

                  <p>
                    Date:{" "}
                    {order.createdAt
                      ? new Date(order.createdAt).toLocaleDateString("en-IN")
                      : "Not available"}
                  </p>

                  <div className="my-order-payment">
                    <p>
                      <strong>Order Status:</strong>{" "}
                      {order.status || "Pending"}
                    </p>
                    {totalContributions > 0 && (
                      <p>
                        <strong>Seller contributions:</strong>{" "}
                        {completedContributions}/{totalContributions} completed
                      </p>
                    )}
                    <p>
                      <strong>Payment Status:</strong> {paymentStatus}
                    </p>
                    <p>
                      <strong>Payment Method:</strong>{" "}
                      {order.paymentMethod || "Not selected"}
                    </p>
                    {order.transactionId && (
                      <p>
                        <strong>Demo Transaction ID:</strong>{" "}
                        {order.transactionId}
                      </p>
                    )}
                  </div>

                  {!paymentCompleted && (
                    <button
                      type="button"
                      className="my-order-pay-button"
                      onClick={() => handlePayment(order)}
                    >
                      Proceed to Demo Payment
                    </button>
                  )}
                </div>

                <div className="my-order-summary">
                  <strong>
                    ₹{Number(order.estimatedPrice || 0).toLocaleString("en-IN")}
                  </strong>
                  <span>{order.status || "Pending"}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MyOrders;
