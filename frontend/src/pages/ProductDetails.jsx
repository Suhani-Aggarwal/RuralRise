
import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import "./ProductDetails.css";

const sampleProducts = [
  {
    id: "1",
    name: "Organic Wheat",
    category: "Agriculture",
    price: 2400,
    priceUnit: "per quintal",
    quantity: 50,
    unit: "quintals",
    location: "Punjab",
    seller: "Green Fields Farm",
    description:
      "Naturally grown organic wheat, carefully harvested and stored. Suitable for household consumption and bulk buyers.",
    image:
      "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "2",
    name: "Handmade Pottery",
    category: "Handicrafts",
    price: 350,
    priceUnit: "per piece",
    quantity: 120,
    unit: "pieces",
    location: "Rajasthan",
    seller: "Mittika Crafts",
    description:
      "Traditional handmade clay pottery crafted by local artisans.",
    image:
      "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "3",
    name: "Fresh Mangoes",
    category: "Food",
    price: 80,
    priceUnit: "per kg",
    quantity: 200,
    unit: "kg",
    location: "Uttar Pradesh",
    seller: "Sunrise Orchards",
    description:
      "Fresh seasonal mangoes sourced from local orchards.",
    image:
      "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "4",
    name: "Handwoven Baskets",
    category: "Handicrafts",
    price: 220,
    priceUnit: "per piece",
    quantity: 75,
    unit: "pieces",
    location: "Haryana",
    seller: "Village Weaves",
    description:
      "Handwoven baskets made by rural artisans.",
    image:
      "https://static.india.gov.in/npiprod/odop/uploads/bamboo_art_4c88180af9.jpg",
  },
  {
    id: "5",
    name: "Mustard Seeds",
    category: "Agriculture",
    price: 5600,
    priceUnit: "per quintal",
    quantity: 30,
    unit: "quintals",
    location: "Haryana",
    seller: "Kisan Growers",
    description:
      "Quality mustard seeds suitable for food processing and agricultural use.",
    image:
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=85",
  },
  {
    id: "6",
    name: "Homemade Pickles",
    category: "Food",
    price: 180,
    priceUnit: "per jar",
    quantity: 90,
    unit: "jars",
    location: "Punjab",
    seller: "Grandma's Kitchen",
    description:
      "Homemade pickles prepared in small batches using traditional recipes.",
    image:
      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85",
  },
];

function ProductDetails() {
  const { id } = useParams();
  const [products, setProducts] = useState(sampleProducts);

  useEffect(() => {
    try {
      const savedProducts = JSON.parse(
        localStorage.getItem("ruralrise_products") || "[]"
      );

      const formattedProducts = savedProducts.map((product) => ({
        id: String(product.id),
        name: product.product_name,
        category: product.category,
        price: Number(product.price),
        priceUnit: product.price_unit || "per unit",
        quantity: Number(product.quantity),
        unit: product.unit || "units",
        location:
          product.location ||
          `${product.village || ""}, ${product.state || ""}`,
        seller: product.seller || "RuralRise Seller",
        description:
          product.description || "No description available.",
        image: product.image_url || "",
      }));

      setProducts([...sampleProducts, ...formattedProducts]);
    } catch (error) {
      console.error("Error loading products:", error);
      setProducts(sampleProducts);
    }
  }, []);

  const product = products.find(
    (item) => String(item.id) === String(id)
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
          <Link to="/my-dashboard">Dashboard</Link>
          <Link to="/marketplace">Marketplace</Link>
        </div>
      </nav>

      <main className="details-container">
        <Link to="/marketplace" className="back-link">
          ← Back to Marketplace
        </Link>

        <div className="details-layout">
          <div className="details-image">
            {product.image ? (
              <img src={product.image} alt={product.name} />
            ) : (
              <div className="details-image-placeholder">
                No image available
              </div>
            )}
          </div>

          <div className="details-info">
            <span className="details-category">
              {product.category}
            </span>

            <h1>{product.name}</h1>

            <div className="details-price">
              ₹{Number(product.price).toLocaleString("en-IN")}
              <span>
                {" / "}
                {String(product.priceUnit || "per unit").replace("per ", "")}
              </span>
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
