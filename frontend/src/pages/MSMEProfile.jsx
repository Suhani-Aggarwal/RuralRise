import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";

import { db } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";

import "./MSMEProfile.css";

function MSMEProfile() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

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
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Load the user's existing MSME profile
  useEffect(() => {
    async function loadMSMEProfile() {
      if (authLoading) return;

      if (!user) {
        setFetching(false);
        navigate("/login");
        return;
      }

      try {
        const profileRef = doc(db, "msmeProfiles", user.uid);
        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          const savedData = profileSnap.data();

          setFormData({
            business_name: savedData.business_name || "",
            products: savedData.products || "",
            skills: savedData.skills || "",
            materials: savedData.materials || "",
            state: savedData.state || "",
            village: savedData.village || "",
            capacity: savedData.capacity?.toString() || "",
            capacity_unit: savedData.capacity_unit || "",
          });
        }

      } catch (err) {
        console.error("Error loading MSME profile:", err);
        setError("Unable to load your business profile.");
      } finally {
        setFetching(false);
      }
    }

    loadMSMEProfile();
  }, [user, authLoading, navigate]);

  // Handle form changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // Save MSME profile to Firestore
  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!user) {
      setError("Please log in to save your business profile.");
      return;
    }

    if (Number(formData.capacity) <= 0) {
      setError("Production capacity must be greater than zero.");
      return;
    }

    try {
      setSaving(true);

      const profileRef = doc(db, "msmeProfiles", user.uid);

      // Check whether this profile already exists
      const profileSnap = await getDoc(profileRef);

      const profileData = {
        uid: user.uid,
        email: user.email || "",
        business_name: formData.business_name.trim(),
        products: formData.products.trim(),
        skills: formData.skills.trim(),
        materials: formData.materials.trim(),
        state: formData.state.trim(),
        village: formData.village.trim(),
        capacity: Number(formData.capacity),
        capacity_unit: formData.capacity_unit,
        updatedAt: serverTimestamp(),
      };

      // Preserve the original creation date when updating
      if (!profileSnap.exists()) {
        profileData.createdAt = serverTimestamp();
      }

      await setDoc(profileRef, profileData, { merge: true });

      setMessage("Your MSME profile has been saved successfully!");

    } catch (err) {
      console.error("MSME profile save error:", err);
      setError("Unable to save your business profile. Please try again.");

    } finally {
      setSaving(false);
    }
  };

  // Wait until Firebase checks the login status
  if (authLoading || fetching) {
    return <div className="msme-profile-page">Loading your business profile...</div>;
  }

  return (
    <div className="msme-profile-page">

      <nav className="profile-navbar">
        <h2>❋ RuralRise</h2>
        <span>SELL → SCALE → GROW</span>
        <button type="button" onClick={() => navigate("/seller-dashboard")}>Back to Dashboard</button>
      </nav>

      <div className="profile-container">

        <div className="profile-heading">
          <span className="profile-label">BUILD YOUR BUSINESS PROFILE</span>

          <h1>View & Update Your Business Profile.</h1>

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

          {error && (
            <div className="profile-error">
              {error}
            </div>
          )}

          {message && (
            <div className="profile-success">
              {message}
            </div>
          )}

          <button
            type="submit"
            className="profile-submit"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save My Business Profile →"}
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