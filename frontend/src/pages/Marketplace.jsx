
import { useState } from "react";
import { Link } from "react-router-dom";
import "./Marketplace.css";

const products = [
  {
    id: 1,
    name: "Organic Wheat",
    category: "Agriculture",
    price: "₹2,400",
    unit: "per quintal",
    quantity: "50 quintals available",
    location: "Punjab",
    image:
      "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=900&q=85",
    seller: "Green Fields Farm",
  },
  {
    id: 2,
    name: "Handmade Pottery",
    category: "Handicrafts",
    price: "₹350",
    unit: "per piece",
    quantity: "120 pieces available",
    location: "Rajasthan",
    image:
      "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=900&q=85",
    seller: "Mittika Crafts",
  },
  {
    id: 3,
    name: "Fresh Mangoes",
    category: "Food",
    price: "₹80",
    unit: "per kg",
    quantity: "200 kg available",
    location: "Uttar Pradesh",
    image:
      "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=900&q=85",
    seller: "Sunrise Orchards",
  },
  {
    id: 4,
    name: "Handwoven Baskets",
    category: "Handicrafts",
    price: "₹220",
    unit: "per piece",
    quantity: "75 pieces available",
    location: "Haryana",
    image:
      "https://static.india.gov.in/npiprod/odop/uploads/bamboo_art_4c88180af9.jpg",
    seller: "Village Weaves",
  },
  {
    id: 5,
    name: "Mustard Seeds",
    category: "Agriculture",
    price: "₹5,600",
    unit: "per quintal",
    quantity: "30 quintals available",
    location: "Haryana",
    image:
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=85",
    seller: "Kisan Growers",
  },
  {
    id: 6,
    name: "Homemade Pickles",
    category: "Food",
    price: "₹180",
    unit: "per jar",
    quantity: "90 jars available",
    location: "Punjab",
    image:
      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85",
    seller: "Grandma's Kitchen",
  },
];

const categories = ["All", "Agriculture", "Handicrafts", "Food", "Textiles", "Dairy", "Livestock", "Organic Products", "Spices & Herbs", "Flowers & Plants", "Forest Products", "Household Products", "Rural Services", "Other"];

function Marketplace() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.location.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      selectedCategory === "All" ||
      product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="marketplace-page">
      <nav className="market-navbar">
        <Link to="/" className="market-logo">❋ RuralRise</Link>

        <div className="market-nav-links">
          <Link to="/">Home</Link>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/marketplace" className="active">Marketplace</Link>
          <Link to="/login" className="market-login">Login</Link>
        </div>
      </nav>

      <section className="market-hero">
        <span className="market-eyebrow">THE RURAL MARKETPLACE</span>
        <h1>Discover Local. <span>Buy Better.</span></h1>
        <p>
          Explore products made and grown by local communities.
          Every purchase creates an opportunity to grow.
        </p>

        <div className="market-search">
          <span>⌕</span>
          <input
            type="text"
            placeholder="Search products or locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </section>

      <main className="market-content">
        <div className="market-heading">
          <div>
            <span className="market-section-label">EXPLORE OPPORTUNITIES</span>
            <h2>Products from our communities</h2>
            <p>Find quality products directly from local sellers.</p>
          </div>

          <Link to="/add-product" className="sell-button">
            + List Your Product
          </Link>
        </div>

        <div className="market-filters">
          <div className="category-filters">
            {categories.map((category) => (
              <button
                key={category}
                className={
                  selectedCategory === category
                    ? "category-button selected"
                    : "category-button"
                }
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <span className="product-count">
            {filteredProducts.length} products found
          </span>
        </div>

        <div className="product-grid">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-image">
                  <img src={product.image} alt={product.name} />
                  <span className="product-category">
                    {product.category}
                  </span>
                </div>

                <div className="product-details">
                  <div className="product-location">
                    <span>⌖</span> {product.location}
                  </div>

                  <h3>{product.name}</h3>
                  <p className="product-seller">
                    Sold by {product.seller}
                  </p>

                  <div className="product-quantity">
                    {product.quantity}
                  </div>

                  <div className="product-card-footer">
                    <div className="product-price">
                      <strong>{product.price}</strong>
                      <span>{product.unit}</span>
                    </div>

                <Link
                to={`/product/${product.id}`}
                className="connect-btn"
                >
                View Details →
                </Link>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="no-products">
              <span>⌕</span>
              <h3>No products found</h3>
              <p>Try another search term or category.</p>
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("All");
                }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="market-footer">
        <span>❋ RuralRise</span>
        <p>SELL → SCALE → GROW</p>
        <small>© 2026 RuralRise. Growing together.</small>
      </footer>
    </div>
  );
}

export default Marketplace;
