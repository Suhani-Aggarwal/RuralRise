
import { useState } from "react";
import { Link } from "react-router-dom";
import "./AddProduct.css";

function AddProduct() {
  const [formData, setFormData] = useState({
    product_name: "",
    category: "",
    state: "",
    village: "",
    quantity: "",
    unit: "",
    price: "",
    price_unit: "",
    description: "",
    image_url: "",
  });

  const [message, setMessage] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));

    setMessage("");
  }

 
function handleSubmit(e) {
  e.preventDefault();

  const quantity = Number(formData.quantity);
  const price = Number(formData.price);

  if (quantity <= 0 || price <= 0) {
    setMessage("Quantity and price must be greater than zero.");
    return;
  }

  try {
    const existingProducts = JSON.parse(
      localStorage.getItem("ruralrise_products") || "[]"
    );

    const newProduct = {
      ...formData,
      id: Date.now(),
      quantity,
      price,
      priceValue: price,
      seller: "RuralRise Seller",
      location: `${formData.village}, ${formData.state}`,
      createdAt: new Date().toISOString(),
    };

    const updatedProducts = [...existingProducts, newProduct];

    localStorage.setItem(
      "ruralrise_products",
      JSON.stringify(updatedProducts)
    );

    setMessage("Product published successfully!");

    setFormData({
      product_name: "",
      category: "",
      state: "",
      village: "",
      quantity: "",
      unit: "",
      price: "",
      price_unit: "",
      description: "",
      image_url: "",
    });

    console.log("Published product:", newProduct);
  } catch (error) {
    console.error("Error saving product:", error);
    setMessage("Unable to publish product. Please try again.");
  }
}


  return (
    <div className="add-product-page">
      <nav className="add-product-navbar">
        <Link to="/" className="add-product-logo">
          ❋ RuralRise
        </Link>

        <div className="add-product-nav-links">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/marketplace">Marketplace</Link>
          <Link to="/add-product" className="active">
            Add Product
          </Link>
        </div>
      </nav>

      <main className="add-product-container">
        <div className="add-product-heading">
          <span>GROW YOUR BUSINESS</span>
          <h1>List Your Product</h1>
          <p>
            Bring your local products to a bigger marketplace.
            Connect with buyers and grow your opportunities.
          </p>
        </div>

        <div className="add-product-layout">
          <section className="product-form-card">
            <div className="form-card-heading">
              <h2>Product Information</h2>
              <p>Enter the details of the product you want to sell.</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="product_name">Product Name *</label>
                <input
                  id="product_name"
                  name="product_name"
                  type="text"
                  placeholder="e.g. Organic Wheat"
                  value={formData.product_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="category">Category *</label>
                <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    >
                    <option value="">Select Category</option>
                    <option value="Agriculture">Agriculture</option>
                    <option value="Fruits & Vegetables">Fruits & Vegetables</option>
                    <option value="Grains & Pulses">Grains & Pulses</option>
                    <option value="Dairy Products">Dairy Products</option>
                    <option value="Livestock & Poultry">Livestock & Poultry</option>
                    <option value="Handicrafts">Handicrafts</option>
                    <option value="Handloom & Textiles">Handloom & Textiles</option>
                    <option value="Food & Beverages">Food & Beverages</option>
                    <option value="Spices & Herbs">Spices & Herbs</option>
                    <option value="Organic Products">Organic Products</option>
                    <option value="Flowers & Plants">Flowers & Plants</option>
                    <option value="Forest Products">Forest Products</option>
                    <option value="Household Products">Household Products</option>
                    <option value="Rural Services">Rural Services</option>
                    <option value="Other">Other</option>
                    </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="state">State *</label>
                  <input
                    id="state"
                    name="state"
                    type="text"
                    placeholder="e.g. Punjab"
                    value={formData.state}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="village">Village *</label>
                  <input
                    id="village"
                    name="village"
                    type="text"
                    placeholder="Enter village name"
                    value={formData.village}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="quantity">Available Quantity *</label>
                  <input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="e.g. 50"
                    value={formData.quantity}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="unit">Quantity Unit *</label>
                  <select
                    id="unit"
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select unit</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="quintal">Quintals</option>
                    <option value="pieces">Pieces</option>
                    <option value="jars">Jars</option>
                    <option value="litres">Litres</option>
                    <option value="packs">Packs</option>
                    <option value="dozens">Dozens</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="price">Price (₹) *</label>
                  <input
                    id="price"
                    name="price"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="e.g. 2400"
                    value={formData.price}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="price_unit">Price Unit *</label>
                  <select
                    id="price_unit"
                    name="price_unit"
                    value={formData.price_unit}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select price unit</option>
                    <option value="per kg">Per kg</option>
                    <option value="per quintal">Per quintal</option>
                    <option value="per piece">Per piece</option>
                    <option value="per jar">Per jar</option>
                    <option value="per litre">Per litre</option>
                    <option value="per pack">Per pack</option>
                    <option value="per dozen">Per dozen</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="description">Product Description *</label>
                <textarea
                  id="description"
                  name="description"
                  rows="4"
                  placeholder="Describe your product, its quality and other important details..."
                  value={formData.description}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="image_url">Product Image URL</label>
                <input
                  id="image_url"
                  name="image_url"
                  type="url"
                  placeholder="Paste your product image URL"
                  value={formData.image_url}
                  onChange={handleChange}
                />
                <small>
                  Image upload can be added later. This field is optional.
                </small>
              </div>

              <button type="submit" className="publish-button">
                Submit Product →
              </button>

              {message && (
                <div className="form-success-message">
                  {message}
                </div>
              )}
            </form>
          </section>

          <aside className="product-side-panel">
            <div className="side-panel-icon">❋</div>
            <span>SELL → SCALE → GROW</span>
            <h2>Your products deserve a bigger marketplace.</h2>

            <p>
              Share what you grow or create. Reach buyers beyond your
              village and discover bigger opportunities.
            </p>

            <div className="side-panel-tip">
              <strong>Tips for sellers</strong>
              <p>
                Use an accurate product name, select the correct category,
                and enter your actual available quantity and price.
              </p>
            </div>

            <Link to="/marketplace" className="back-marketplace-link">
              ← Back to Marketplace
            </Link>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default AddProduct;
