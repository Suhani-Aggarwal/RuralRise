import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../firebase/firebase";
import "./Auth.css";

function Register() {

  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await updateProfile(userCredential.user, {
        displayName: name
      });

      navigate("/dashboard");

    } catch (error) {
      setError(error.message);
    }

    setLoading(false);
  }

  return (
    <div className="auth-page">

      <div className="auth-brand">
        <Link to="/">❋ RuralRise</Link>
        <p>SELL → SCALE → GROW</p>

        <div className="auth-brand-content">
          <h1>
            Local Roots.<br />
            <span>Bigger Dreams.</span>
          </h1>

          <div className="brand-description">
            Discover opportunities, connect with buyers,
            and take your local business to new heights.
          </div>
        </div>
      </div>

      <div className="auth-card">

        <div className="auth-heading">
          <span>JOIN OUR COMMUNITY</span>
          <h2>Create Your Account</h2>
          <p>Start your journey towards bigger opportunities.</p>
        </div>

        <form onSubmit={handleRegister}>

          <div className="mb-3">
            <label>Full Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label>Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label>Location</label>
            <input
              type="text"
              className="form-control"
              placeholder="Your city or village"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label>I want to join as</label>
            <select
              className="form-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="" disabled>Select your role</option>
              <option value="seller">Seller / Producer</option>
              <option value="buyer">Buyer</option>
              <option value="worker">Skilled Worker</option>
            </select>
          </div>

          <div className="mb-3">
            <label>Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p style={{ color: "red" }}>{error}</p>
          )}

          <button
            type="submit"
            className="btn gold-btn auth-submit"
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Create Account →"}
          </button>

        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>

      </div>

      <p className="auth-footer">
        © 2026 RuralRise. All rights reserved.
      </p>

    </div>
  );
}

export default Register;