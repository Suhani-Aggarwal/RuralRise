
import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import "./OrderRequest.css";

const sampleProducts = [
  { id: "1", name: "Organic Wheat", price: 2400, priceUnit: "per quintal", unit: "quintal", available: 50 },
  { id: "2", name: "Handmade Pottery", price: 350, priceUnit: "per piece", unit: "pieces", available: 120 },
  { id: "3", name: "Fresh Mangoes", price: 80, priceUnit: "per kg", unit: "kg", available: 200 },
  { id: "4", name: "Handwoven Baskets", price: 220, priceUnit: "per piece", unit: "pieces", available: 75 },
  { id: "5", name: "Mustard Seeds", price: 5600, priceUnit: "per quintal", unit: "quintal", available: 30 },
  { id: "6", name: "Homemade Pickles", price: 180, priceUnit: "per jar", unit: "jars", available: 90 },
];

const sampleSellers = [
  { name: "Ravi Kumar", location: "Ludhiana, Punjab", productName: "Organic Wheat", available: 40 },
  { name: "Aman Singh", location: "Patiala, Punjab", productName: "Organic Wheat", available: 35 },
  { name: "Gurpreet Kaur", location: "Amritsar, Punjab", productName: "Organic Wheat", available: 25 },
  { name: "Meera Devi", location: "Jaipur, Rajasthan", productName: "Handmade Pottery", available: 100 },
  { name: "Sunrise Orchards", location: "Uttar Pradesh", productName: "Fresh Mangoes", available: 200 },
  { name: "Village Weaves", location: "Haryana", productName: "Handwoven Baskets", available: 75 },
  { name: "Kisan Growers", location: "Haryana", productName: "Mustard Seeds", available: 30 },
  { name: "Grandma's Kitchen", location: "Punjab", productName: "Homemade Pickles", available: 90 },
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
        const isDemoProduct = sampleProducts.some(
          (item) => String(item.id) === String(id)
        );

        if (isDemoProduct) {
          const matchingSellers = sampleSellers.filter(
            (seller) =>
              seller.productName.toLowerCase() ===
              foundProduct.name.toLowerCase()
          );

          setAvailableSellers(matchingSellers);
        } else {
          const matchingSellers = savedProducts
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

          setAvailableSellers(matchingSellers);
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

  function handleChange(e) {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setMessage("");
  }

  function getSellerAllocation() {
    if (quantity <= 0 || availableSellers.length === 0) {
      return [];
    }

    const singleSeller = availableSellers.find(
      (seller) => seller.available >= quantity
    );

    if (singleSeller) {
      return [{
        ...singleSeller,
        allocated: quantity,
      }];
    }

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
    });
  }

  return (
    <div className="order-request-page">
      <nav className="order-navbar">
        <Link to="/" className="order-logo">
          ❋ RuralRise
        </Link>

        <div>
          <Link to="/my-dashboard">Dashboard</Link>
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

        <div className="order-heading">
          <span>LET'S MAKE A CONNECTION</span>
          <h1>Place Your Order</h1>
          <p>
            Tell the sellers what you need.
            Every order matters, big or small.
          </p>
        </div>

        <div className="order-layout">
          <section className="order-form-card">
            <h2>Order Requirements</h2>

            <p>
              Fill in your details to send a request
              through RuralRise.
            </p>

            <form onSubmit={handleSubmit}>
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
                  Multiple sellers can combine their stock
                  to fulfil a larger order.
                </small>
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
                  ? "Multiple sellers can combine their stock to fulfil your order."
                  : "The currently available sellers cannot fulfil your complete order."}
            </p>
          </div>

          <div className="aggregation-summary">
            <div>
              <small>Requested Quantity</small>
              <strong>
                {quantity || 0} {product.unit}
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

          <h3>Seller Contributions</h3>

          {sellerAllocations.length === 0 ? (
            <p>Enter a quantity to see suggested seller contributions.</p>
          ) : (
            sellerAllocations.map((seller, index) => (
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
                  <small>Proposed contribution</small>
                </div>
              </div>
            ))
          )}

          <div className="aggregation-total">
            <span>Combined Contribution</span>
            <strong>
              {fulfilledQuantity} {product.unit}
            </strong>
          </div>

          {quantity > 0 && (
            <div
              className={`aggregation-status ${
                isFullyFulfilled ? "success" : "warning"
              }`}
            >
              {isFullyFulfilled
                ? "The suggested sellers can cover your requested quantity."
                : `Short by ${quantity - fulfilledQuantity} ${product.unit}. More stock is needed.`}
            </div>
          )}

          <button
            className="confirm-order-btn"
            disabled={!quantity || quantity <= 0 || !sellerAllocations.length}
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
              ? "Continue to Order Confirmation →"
              : "Continue with Partial Fulfilment →"}
          </button>

          <p className="demo-disclaimer">
            This is a frontend demonstration using sample seller
            inventory. Actual seller availability, matching,
            allocation and confirmation will be handled by the backend.
          </p>
        </section>
      </main>
    </div>
  );
}

export default OrderRequest;
