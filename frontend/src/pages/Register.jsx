
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";

import { doc, setDoc, serverTimestamp } from "firebase/firestore";

import { auth, db } from "../firebase/firebase";
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

    let accountCreated = false;

    try {
      // Step 1: Create Firebase Authentication account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      accountCreated = true;

      const user = userCredential.user;

      // Step 2: Update user's display name
      await updateProfile(user, {
        displayName: name.trim()
      });

      // Step 3: Save user profile in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: name.trim(),
        email: user.email,
        location: location.trim(),
        role: role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Step 4: Redirect to dashboard
      navigate("/dashboard");

    } catch (error) {
      console.error("Registration error:", error);

      if (accountCreated) {
        setError(
          "Your account was created, but your profile could not be saved. Please contact support."
        );
      } else {
        setError(error.message);
      }

    } finally {
      setLoading(false);
    }
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
              <option value="" disabled>
                Select your role
              </option>
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
