
import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import "./OrderRequest.css";

// Temporary demo products
const sampleProducts = [
  {
    id: "1",
    name: "Organic Wheat",
    price: 2400,
    priceUnit: "per quintal",
    unit: "quintal",
    available: 40,
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

// Demo seller inventory for sample products
const sampleSellers = [
  {
    name: "Ravi Kumar",
    location: "Ludhiana, Punjab",
    productName: "Organic Wheat",
    available: 40,
  },
  {
    name: "Aman Singh",
    location: "Patiala, Punjab",
    productName: "Organic Wheat",
    available: 35,
  },
  {
    name: "Gurpreet Kaur",
    location: "Amritsar, Punjab",
    productName: "Organic Wheat",
    available: 25,
  },
  {
    name: "Meera Devi",
    location: "Jaipur, Rajasthan",
    productName: "Handmade Pottery",
    available: 100,
  },
];

function OrderRequest() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [availableSellers, setAvailableSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    quantity: "",
    buyer_name: "",
    delivery_location: "",
    contact: "",
    requirements: "",
  });

  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Load product and matching sellers
  useEffect(() => {
    try {
      const savedProducts = JSON.parse(
        localStorage.getItem("ruralrise_products") || "[]"
      );

      const formattedProducts = savedProducts.map((item) => ({
        id: String(item.id),
        name: item.product_name,
        category: item.category,
        price: Number(item.price),
        priceUnit: item.price_unit || "per unit",
        unit: item.unit || "units",
        available: Number(item.quantity),
        location:
          item.location ||
          `${item.village || ""}, ${item.state || ""}`,
        seller: item.seller || "RuralRise Seller",
        description: item.description || "",
        image: item.image_url || "",
      }));

      const allProducts = [
        ...sampleProducts,
        ...formattedProducts,
      ];

      const foundProduct = allProducts.find(
        (item) => String(item.id) === String(id)
      );

      setProduct(foundProduct || null);

      if (foundProduct) {
        // For demo products, use their matching demo sellers.
        const isDemoProduct = sampleProducts.some(
          (item) => String(item.id) === String(id)
        );

        if (isDemoProduct) {
          const matchingDemoSellers = sampleSellers.filter(
            (seller) =>
              seller.productName.toLowerCase() ===
              foundProduct.name.toLowerCase()
          );

          setAvailableSellers(matchingDemoSellers);
        } else {
          // For user-added products, find listings of the same product.
          const matchingSavedSellers = savedProducts
            .filter(
              (item) =>
                item.product_name?.trim().toLowerCase() ===
                foundProduct.name.trim().toLowerCase()
            )
            .map((item) => ({
              name: item.seller || "RuralRise Seller",
              location:
                item.location ||
                `${item.village || ""}, ${item.state || ""}`,
              available: Number(item.quantity),
            }));

          setAvailableSellers(matchingSavedSellers);
        }
      }
    } catch (error) {
      console.error("Error loading product:", error);
      setProduct(null);
      setAvailableSellers([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="order-not-found">
        <h2>Loading product...</h2>
      </div>
    );
  }

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

  // Handle form changes
  function handleChange(e) {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setMessage("");
    setSubmitted(false);
  }

  // Allocate stock to sellers
  function getSellerAllocation() {
    if (quantity <= 0 || availableSellers.length === 0) {
      return [];
    }

    // First check whether one seller can fulfil the entire order.
    const singleSeller = availableSellers.find(
      (seller) => seller.available >= quantity
    );

    if (singleSeller) {
      return [
        {
          ...singleSeller,
          allocated: quantity,
        },
      ];
    }

    // If no single seller can fulfil it, combine multiple sellers.
    let remaining = quantity;

    return availableSellers
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

  const totalAvailableStock = availableSellers.reduce(
    (total, seller) => total + seller.available,
    0
  );

  const fulfilledQuantity = sellerAllocations.reduce(
    (total, seller) => total + seller.allocated,
    0
  );

  const isFullyFulfilled =
    quantity > 0 && fulfilledQuantity >= quantity;

  const fulfilmentType = !isFullyFulfilled
    ? "partial"
    : sellerAllocations.length === 1
      ? "single"
      : "multiple";

  // Submit order request
  function handleSubmit(e) {
    e.preventDefault();

    if (quantity <= 0) {
      setMessage("Please enter a valid quantity.");
      return;
    }

    if (sellerAllocations.length === 0) {
      setMessage("No matching sellers are currently available.");
      return;
    }

    setSubmitted(true);
    setMessage(
      "Your order request has been prepared successfully!"
    );

    console.log("Order request:", {
      product_id: product.id,
      product_name: product.name,
      ...formData,
      quantity,
      estimated_price: estimatedPrice,
      fulfilment_type: fulfilmentType,
      seller_allocations: sellerAllocations,
    });
  }

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
                  Total matching stock: {totalAvailableStock}{" "}
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
                  If one seller cannot fulfil your order,
                  RuralRise can combine stock from multiple
                  matching MSMEs.
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
              <p>3. RuralRise checks available sellers.</p>
              <p>4. Multiple MSMEs combine stock when needed.</p>
            </div>

          </aside>
        </div>

        {/* FULFILMENT PREVIEW */}
        {submitted && (
          <section className="aggregation-preview">

            <div className="aggregation-heading">
              <span>RURALRISE SMART MATCHING</span>

              <h2>
                {fulfilmentType === "single"
                  ? "Single-Seller Fulfilment"
                  : fulfilmentType === "multiple"
                    ? "Multi-Seller Fulfilment Preview"
                    : "Partial Fulfilment"}
              </h2>

              <p>
                {fulfilmentType === "single"
                  ? "One seller has enough stock to fulfil your complete order."
                  : fulfilmentType === "multiple"
                    ? "Multiple sellers are combining their stock to fulfil your order."
                    : "The currently available sellers cannot fulfil your complete order."}
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
                <small>Total Matching Stock</small>
                <strong>
                  {totalAvailableStock} {product.unit}
                </strong>
              </div>

              <div>
                <small>Estimated Cost</small>
                <strong>
                  ₹{estimatedPrice.toLocaleString("en-IN")}
                </strong>
              </div>
            </div>

            <h3>
              {fulfilmentType === "single"
                ? "Selected Seller"
                : "Seller Contributions"}
            </h3>

            {sellerAllocations.map((seller, index) => (
              <div
                className="seller-allocation-card"
                key={`${seller.name}-${seller.location}-${index}`}
              >
                <div>
                  <strong>{seller.name}</strong>
                  <small>{seller.location}</small>
                </div>

                <div className="seller-allocation-quantity">
                  <strong>
                    {seller.allocated} {product.unit}
                  </strong>

                  <small>
                    {fulfilmentType === "single"
                      ? "Fulfilling complete order"
                      : "Proposed contribution"}
                  </small>
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
                {fulfilmentType === "single"
                  ? "One seller can fulfil your entire order. No additional sellers are needed."
                  : "Your requested quantity can be covered by the combined seller contributions."}
              </div>
            ) : (
              <div className="aggregation-status warning">
                More sellers are needed for{" "}
                {quantity - fulfilledQuantity} {product.unit}.
                Your order is currently only partially fulfilable.
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
                    fulfilmentType,
                    totalAvailableStock,
                  },
                })
              }
            >
              {isFullyFulfilled
                ? "Confirm Order →"
                : "Continue with Partial Fulfilment →"}
            </button>

            <p className="demo-disclaimer">
              This is a frontend demonstration using sample
              seller inventory. Actual seller availability,
              matching, allocation and confirmation will be
              handled by the backend.
            </p>

          </section>
        )}

      </main>
    </div>
  );
}

export default OrderRequest;
