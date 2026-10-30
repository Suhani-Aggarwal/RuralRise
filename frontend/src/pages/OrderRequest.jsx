
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./OrderRequest.css";

const sampleProducts = [
  {
    id: "1",
    name: "Organic Wheat",
    price: 2400,
    priceUnit: "per quintal",
    unit: "quintal",
    available: 50,
  },
  {
    id: "2",
    name: "Handmade Pottery",
    price: 350,
    priceUnit: "per piece",
    unit: "pieces",
    available: 100,
  },
];

function OrderRequest() {
  const { id } = useParams();

  const product = sampleProducts.find(
    (item) => item.id === id
  );

  const [formData, setFormData] = useState({
    quantity: "",
    buyer_name: "",
    delivery_location: "",
    contact: "",
    requirements: "",
  });

  const [message, setMessage] = useState("");

  if (!product) {
    return (
      <div className="order-not-found">
        <h2>Product not found</h2>
        <Link to="/marketplace">Back to Marketplace</Link>
      </div>
    );
  }

  const quantity = Number(formData.quantity);
  const estimatedPrice = product.priceUnit === "per quintal"
    ? (quantity / 1) * product.price
    : quantity * product.price;

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
    setMessage("");
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (quantity > product.available) {
      setMessage(
        `Only ${product.available} ${product.unit} currently available.`
      );
      return;
    }

    console.log("Order request:", {
      product_id: product.id,
      product_name: product.name,
      ...formData,
      quantity,
      estimated_price: estimatedPrice,
    });

    setMessage(
      "Your order request has been captured! Backend integration will be connected next."
    );
  }

  return (
    <div className="order-request-page">
      <nav className="order-navbar">
        <Link to="/" className="order-logo">❋ RuralRise</Link>
        <div>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/marketplace">Marketplace</Link>
        </div>
      </nav>

      <main className="order-container">
        <Link to={`/product/${id}`} className="order-back">
          ← Back to Product
        </Link>

        <div className="order-heading">
          <span>LET'S MAKE A CONNECTION</span>
          <h1>Place Your Order</h1>
          <p>Tell the seller what you need. Every order matters, big or small.</p>
        </div>

        <div className="order-layout">
          <section className="order-form-card">
            <h2>Order Requirements</h2>
            <p>Fill in your details to send a request to the seller.</p>

            <form onSubmit={handleSubmit}>
              <div className="order-product-summary">
                <strong>{product.name}</strong>
                <span>₹{product.price.toLocaleString("en-IN")} / {product.priceUnit.replace("per ", "")}</span>
                <small>Available: {product.available} {product.unit}</small>
              </div>

              <div className="order-field">
                <label>Required Quantity *</label>
                <input
                  type="number"
                  name="quantity"
                  min="0.01"
                  max={product.available}
                  step="0.01"
                  placeholder="Enter quantity you need"
                  value={formData.quantity}
                  onChange={handleChange}
                  required
                />
                <small>Maximum available: {product.available} {product.unit}</small>
              </div>

              <div className="order-field">
                <label>Buyer Name *</label>
                <input
                  type="text"
                  name="buyer_name"
                  placeholder="Enter your name"
                  value={formData.buyer_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="order-field">
                <label>Delivery Location *</label>
                <input
                  type="text"
                  name="delivery_location"
                  placeholder="Village, city, state"
                  value={formData.delivery_location}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="order-field">
                <label>Contact Number *</label>
                <input
                  type="tel"
                  name="contact"
                  pattern="[0-9]{10}"
                  maxLength="10"
                  placeholder="10-digit mobile number"
                  value={formData.contact}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="order-field">
                <label>Additional Requirements</label>
                <textarea
                  name="requirements"
                  rows="4"
                  placeholder="Mention quality, packaging, delivery preferences, etc."
                  value={formData.requirements}
                  onChange={handleChange}
                />
              </div>

              <div className="order-estimate">
                <span>Estimated Product Cost</span>
                <strong>
                  ₹{formData.quantity && quantity > 0
                    ? estimatedPrice.toLocaleString("en-IN")
                    : "0"}
                </strong>
                <small>Final amount may be confirmed by the seller.</small>
              </div>

              <button type="submit" className="order-submit-btn">
                Send Order Request →
              </button>

              {message && (
                <div className="order-message">{message}</div>
              )}
            </form>
          </section>

          <aside className="order-side-panel">
            <span>SELL → SCALE → GROW</span>
            <h2>Every connection creates an opportunity.</h2>
            <p>
              Whether you need a few products or a large quantity,
              RuralRise helps connect buyers with local sellers.
            </p>

            <div className="order-tip">
              <strong>How it works</strong>
              <p>
                1. Enter your required quantity.
              </p>
              <p>
                2. Share your delivery details.
              </p>
              <p>
                3. The seller reviews your request.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default OrderRequest;
