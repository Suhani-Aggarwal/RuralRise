
import { useParams, Link } from "react-router-dom";
import "./ProductDetails.css";


// Temporary sample data.
// Later, we will fetch this from MongoDB through FastAPI.
const sampleProducts = [
  {
    id: "1",
    name: "Organic Wheat",
    category: "Agriculture",
    price: 2400,
    priceUnit: "per quintal",
    quantity: 50,
    unit: "quintals",
    location: "Punjab, India",
    seller: "Ravi Kumar",
    description:
      "Naturally grown organic wheat, carefully harvested and stored. Suitable for household consumption and bulk buyers.",
    image:
      "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=1000&q=85",
  },
  {
    id: "2",
    name: "Handmade Pottery",
    category: "Handicrafts",
    price: 350,
    priceUnit: "per piece",
    quantity: 100,
    unit: "pieces",
    location: "Jaipur, Rajasthan",
    seller: "Meera Devi",
    description:
      "Traditional handmade clay pottery crafted by local artisans.",
    image:
      "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=1000&q=85",
  },
];

function ProductDetails() {
  const { id } = useParams();

  const product = sampleProducts.find(
    (item) => item.id === id
  );

  if (!product) {
    return (
      <div className="product-not-found">
        <h2>Product not found</h2>
        <Link to="/marketplace">Back to Marketplace</Link>
      </div>
    );
  }

  return (
    <div className="product-details-page">

      <nav className="details-navbar">
        <Link to="/" className="details-logo">
          ❋ RuralRise
        </Link>

        <div>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/marketplace">Marketplace</Link>
        </div>
      </nav>

      <main className="details-container">

        <Link to="/marketplace" className="back-link">
          ← Back to Marketplace
        </Link>

        <div className="details-layout">

          <div className="details-image">
            <img src={product.image} alt={product.name} />
          </div>

          <div className="details-info">

            <span className="details-category">
              {product.category}
            </span>

            <h1>{product.name}</h1>

            <div className="details-price">
              ₹{product.price.toLocaleString("en-IN")}
              <span> / {product.priceUnit.replace("per ", "")}</span>
            </div>

            <div className="details-divider"></div>

            <p className="details-description">
              {product.description}
            </p>

            <div className="details-meta">
              <div>
                <span>Available Quantity</span>
                <strong>
                  {product.quantity} {product.unit}
                </strong>
              </div>

              <div>
                <span>Location</span>
                <strong>{product.location}</strong>
              </div>

              <div>
                <span>Seller</span>
                <strong>{product.seller}</strong>
              </div>
            </div>

            <Link
              to={`/order-request/${product.id}`}
              className="bulk-request-btn"
            >
              Place an Order
            </Link>

            <p className="details-note">
              Interested in purchasing in bulk? Send a request
              to connect with the seller.
            </p>

          </div>
        </div>
      </main>
    </div>
  );
}

export default ProductDetails;
