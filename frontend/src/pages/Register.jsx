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
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      accountCreated = true;
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: name.trim()
      });

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: name.trim(),
        email: user.email,
        location: location.trim(),
        role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      if (role === "buyer") {
  navigate("/buyer-dashboard");
} else if (role === "worker") {
  navigate("/worker-dashboard");
} else {
  navigate("/dashboard");
}

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

      {/* LEFT BRANDING PANEL */}
      <div className="auth-brand">
        <div>
          <Link to="/">RuralRise</Link>
          <p>SELL. SCALE. GROW.</p>
        </div>

        <div className="auth-brand-content">
          <h1>
            Empowering Rural Businesses.
            <span> Creating Opportunities.</span>
          </h1>

          <p className="brand-description">
            Connect with buyers, discover opportunities and
            grow your business with the RuralRise community.
          </p>
        </div>

        <div className="auth-footer">
          RuralRise
        </div>
      </div>

      {/* RIGHT REGISTRATION PANEL */}
      <div className="auth-card">

        <div className="auth-heading">
          <span>JOIN OUR COMMUNITY</span>
          <h2>Create Account</h2>
          <p>Join RuralRise and grow your business with us.</p>
        </div>

        {error && (
          <p className="error-message">{error}</p>
        )}

        <form onSubmit={handleRegister}>

          <label>Full Name</label>
          <input
            className="form-control"
            type="text"
            placeholder="Enter your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <label>Email Address</label>
          <input
            className="form-control"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Location</label>
          <input
            className="form-control"
            type="text"
            placeholder="Enter your location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />

          <label>Select Your Role</label>
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

          <label>Password</label>
          <input
            className="form-control"
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>

        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>

      </div>
    </div>
  );
}

export default Register;