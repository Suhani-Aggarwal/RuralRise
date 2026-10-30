
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MSMEProfile.css";

function MSMEProfile() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    business_name: "",
    products: "",
    skills: "",
    materials: "",
    state: "",
    village: "",
    capacity: "",
    capacity_unit: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log("MSME Profile:", formData);

    setMessage("Your MSME profile has been created successfully!");

    // Temporary frontend demonstration.
    // We will connect this to FastAPI and MongoDB later.
  };

  return (
    <div className="msme-profile-page">
      <nav className="profile-navbar">
        <h2>❋ RuralRise</h2>
        <span>SELL → SCALE → GROW</span>
      </nav>

      <div className="profile-container">
        <div className="profile-heading">
          <span className="profile-label">BUILD YOUR BUSINESS PROFILE</span>
          <h1>Tell us about your business.</h1>
          <p>
            Share your products, traditional skills and resources.
            Let's help your business reach bigger markets.
          </p>
        </div>

        <form className="msme-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>01. Business Information</h3>

            <label>MSME / Business Name *</label>
            <input
              type="text"
              name="business_name"
              placeholder="e.g. Green Valley Farms"
              value={formData.business_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-section">
            <h3>02. What Do You Produce?</h3>

            <label>Existing Products *</label>
            <textarea
              name="products"
              placeholder="e.g. Organic Wheat, Mustard Seeds, Pickles"
              value={formData.products}
              onChange={handleChange}
              required
            />
            <small>Separate multiple products with commas.</small>
          </div>

          <div className="form-section">
            <h3>03. Skills & Materials</h3>

            <label>Traditional Skills *</label>
            <textarea
              name="skills"
              placeholder="e.g. Bamboo Weaving, Pottery, Handloom"
              value={formData.skills}
              onChange={handleChange}
              required
            />

            <label>Available Materials *</label>
            <textarea
              name="materials"
              placeholder="e.g. Bamboo, Clay, Cotton, Wheat"
              value={formData.materials}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-section">
            <h3>04. Business Location</h3>

            <label>State *</label>
            <input
              type="text"
              name="state"
              placeholder="e.g. Punjab"
              value={formData.state}
              onChange={handleChange}
              required
            />

            <label>Village / Town *</label>
            <input
              type="text"
              name="village"
              placeholder="Enter your village or town"
              value={formData.village}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-section">
            <h3>05. Production Capacity</h3>

            <label>Available Production Capacity *</label>
            <input
              type="number"
              name="capacity"
              min="0.01"
              step="0.01"
              placeholder="e.g. 500"
              value={formData.capacity}
              onChange={handleChange}
              required
            />

            <label>Capacity Unit *</label>
            <select
              name="capacity_unit"
              value={formData.capacity_unit}
              onChange={handleChange}
              required
            >
              <option value="">Select a unit</option>
              <option value="kg">Kilograms (kg)</option>
              <option value="quintal">Quintals</option>
              <option value="tonnes">Tonnes</option>
              <option value="pieces">Pieces</option>
              <option value="litres">Litres</option>
              <option value="jars">Jars</option>
              <option value="packs">Packs</option>
              <option value="dozens">Dozens</option>
            </select>
          </div>

          {message && (
            <div className="profile-success">{message}</div>
          )}

          <button type="submit" className="profile-submit">
            Save My Business Profile →
          </button>
        </form>

        <div className="profile-note">
          <strong>Your skills have value.</strong>
          <p>
            RuralRise connects your existing capabilities with
            new opportunities, customers and markets.
          </p>
        </div>
      </div>
    </div>
  );
}

export default MSMEProfile;
