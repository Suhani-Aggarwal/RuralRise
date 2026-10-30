
import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

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
  const [submitted, setSubmitted] = useState(false);

  if (!product) {
    return (
      <div className="order-not-found">
        <h2>Product not found</h2>
        <Link to="/marketplace">Back to Marketplace</Link>
      </div>
    );
  }

  const quantity = Number(formData.quantity);

  const estimatedPrice =
    quantity > 0 ? quantity * product.price : 0;

  function handleChange(e) {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setMessage("");
    setSubmitted(false);
  }

  function handleSubmit(e) {
  e.preventDefault();

  if (quantity <= 0) {
    setMessage("Please enter a valid quantity.");
    return;
  }

  setSubmitted(true);
  setMessage("Your order request has been prepared successfully!");

  console.log("Order request:", {
    product_id: product.id,
    product_name: product.name,
    ...formData,
    quantity,
    estimated_price: estimatedPrice,
  });
}
  // Demo seller allocation for frontend preview only.
  // Actual seller matching will be handled by the backend.
  const sampleSellers = [
    {
      name: "Ravi Kumar",
      location: "Ludhiana, Punjab",
      available: 40,
    },
    {
      name: "Aman Singh",
      location: "Patiala, Punjab",
      available: 35,
    },
    {
      name: "Gurpreet Kaur",
      location: "Amritsar, Punjab",
      available: 25,
    },
  ];

  function getSellerAllocation() {
    let remaining = quantity;

    return sampleSellers
      .map((seller) => {
        const allocated = Math.min(
          remaining,
          seller.available
        );

        remaining -= allocated;

        return {
          ...seller,
          allocated,
        };
      })
      .filter((seller) => seller.allocated > 0);
  }

  const sellerAllocations = getSellerAllocation();

  const totalDemoStock = sampleSellers.reduce(
    (total, seller) => total + seller.available,
    0
  );

  const fulfilledQuantity = sellerAllocations.reduce(
    (total, seller) => total + seller.allocated,
    0
  );

  const isFullyFulfilled = quantity <= totalDemoStock;

  return (
    <div className="order-request-page">

      {/* NAVBAR */}
      <nav className="order-navbar">
        <Link to="/" className="order-logo">
          ❋ RuralRise
        </Link>

        <div>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/marketplace">Marketplace</Link>
        </div>
      </nav>

      <main className="order-container">

        <Link
          to={`/product/${id}`}
          className="order-back"
        >
          ← Back to Product
        </Link>

        {/* PAGE HEADING */}
        <div className="order-heading">
          <span>LET'S MAKE A CONNECTION</span>
          <h1>Place Your Order</h1>
          <p>
            Tell the sellers what you need.
            Every order matters, big or small.
          </p>
        </div>

        <div className="order-layout">

          {/* ORDER FORM */}
          <section className="order-form-card">

            <h2>Order Requirements</h2>

            <p>
              Fill in your details to send a request
              through RuralRise.
            </p>

            <form onSubmit={handleSubmit}>

              {/* PRODUCT SUMMARY */}
              <div className="order-product-summary">
                <strong>{product.name}</strong>

                <span>
                  ₹{product.price.toLocaleString("en-IN")} /{" "}
                  {product.priceUnit.replace("per ", "")}
                </span>

                <small>
                  Initial seller stock: {product.available}{" "}
                  {product.unit}
                </small>
              </div>

              {/* QUANTITY */}
              <div className="order-field">
                <label>Required Quantity *</label>

                <input
                  type="number"
                  name="quantity"
                  min="0.01"
                  step="0.01"
                  placeholder="Enter the quantity you need"
                  value={formData.quantity}
                  onChange={handleChange}
                  required
                />

                <small>
                  Need more than one seller can supply?
                  No problem! RuralRise can combine quantities
                  from multiple MSMEs to fulfil larger orders.
                </small>
              </div>

              {/* BUYER NAME */}
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

              {/* DELIVERY LOCATION */}
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

              {/* CONTACT */}
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

              {/* ADDITIONAL REQUIREMENTS */}
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

              {/* PRICE ESTIMATE */}
              <div className="order-estimate">
                <span>Estimated Product Cost</span>

                <strong>
                  ₹{estimatedPrice.toLocaleString("en-IN")}
                </strong>

                <small>
                  Final amount may be confirmed by the sellers.
                </small>
              </div>

              <button
                type="submit"
                className="order-submit-btn"
              >
                Find Sellers & Send Request →
              </button>

              {message && (
                <div className="order-message">
                  {message}
                </div>
              )}

            </form>
          </section>

          {/* SIDE PANEL */}
          <aside className="order-side-panel">

            <span>SELL → SCALE → GROW</span>

            <h2>
              Every connection creates an opportunity.
            </h2>

            <p>
              Whether you need a few products or a large
              quantity, RuralRise helps connect buyers
              with local sellers.
            </p>

            <div className="order-tip">
              <strong>How it works</strong>

              <p>1. Enter your required quantity.</p>
              <p>2. Share your delivery details.</p>
              <p>3. RuralRise finds suitable sellers.</p>
              <p>4. Multiple MSMEs can combine their stock.</p>
            </div>

          </aside>
        </div>

        {/* MULTI-SELLER PREVIEW */}
        {submitted && (
          <section className="aggregation-preview">

            <div className="aggregation-heading">
              <span>RURALRISE SMART MATCHING</span>

              <h2>Multi-Seller Fulfilment Preview</h2>

              <p>
                Here's how multiple MSMEs could work together
                to fulfil your order.
              </p>
            </div>

            <div className="aggregation-summary">
              <div>
                <small>Requested Quantity</small>
                <strong>
                  {quantity} {product.unit}
                </strong>
              </div>

              <div>
                <small>Combined Demo Stock</small>
                <strong>
                  {totalDemoStock} {product.unit}
                </strong>
              </div>

              <div>
                <small>Estimated Cost</small>
                <strong>
                  ₹{estimatedPrice.toLocaleString("en-IN")}
                </strong>
              </div>
            </div>

            <h3>Potential Seller Contributions</h3>

            {sellerAllocations.map((seller, index) => (
              <div
                className="seller-allocation-card"
                key={seller.name}
              >
                <div>
                  <strong>{seller.name}</strong>
                  <small>{seller.location}</small>
                </div>

                <div className="seller-allocation-quantity">
                  <strong>
                    {seller.allocated} {product.unit}
                  </strong>

                  <small>Proposed contribution</small>
                </div>
              </div>
            ))}

            <div className="aggregation-total">
              <span>Combined Contribution</span>

              <strong>
                {fulfilledQuantity} {product.unit}
              </strong>
            </div>

            {isFullyFulfilled ? (
              <div className="aggregation-status success">
                Your requested quantity can be covered
                by the sample seller contributions.
              </div>
            ) : (
              <div className="aggregation-status warning">
                The sample sellers cannot fulfil the complete
                quantity. Additional sellers are needed for{" "}
                {quantity - fulfilledQuantity} {product.unit}.
              </div>
            )}
            <button
                className="confirm-order-btn"
                onClick={() =>
                    navigate("/order-confirmation", {
                    state: {
                        product,
                        formData,
                        quantity,
                        estimatedPrice,
                        sellerAllocations,
                        fulfilledQuantity,
                        isFullyFulfilled,
                    },
                    })
                }
                >
                Confirm Order →
                </button>
            <p className="demo-disclaimer">
              This is a frontend demonstration using sample
              sellers. Actual seller availability, matching,
              allocation and confirmation will be handled
              by the backend.
            </p>

          </section>
        )}

      </main>
    </div>
  );
}

export default OrderRequest;
