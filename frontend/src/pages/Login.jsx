import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from "firebase/auth";
import { auth } from "../firebase/firebase";
import "./Auth.css";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Login Function
  
async function handleLogin(e) {
  e.preventDefault();

  setError("");
  setMessage("");
  setLoading(true);

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );

    const loggedInUser = userCredential.user;

    // Fetch the user's saved role from Firestore
    const userRef = doc(db, "users", loggedInUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      setError("User profile not found. Please contact support.");
      return;
    }

    const userData = userSnap.data();
    const roleRoutes = {
      buyer: "/buyer-dashboard",
      seller: "/seller-dashboard",
      worker: "/worker-dashboard",
    };
    const destination = roleRoutes[userData.role] || "/my-dashboard";
    navigate(destination, { replace: true });

  } catch (error) {
    console.error("Login error:", error);

    if (
      error.code === "auth/invalid-credential" ||
      error.code === "auth/wrong-password" ||
      error.code === "auth/user-not-found"
    ) {
      setError("Invalid email or password. Please try again.");
    } else {
      setError("Something went wrong. Please try again.");
    }

  } finally {
    setLoading(false);
  }
}

  // Forgot Password Function
  async function handleForgotPassword() {
    setError("");
    setMessage("");

    if (!email) {
      setError("Please enter your email address first.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);

      setMessage("Password reset link sent! Check your email.");

    } catch (error) {
      console.error("Password reset error:", error);

      if (error.code === "auth/user-not-found") {
        setError("No account found with this email.");
      } else if (error.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError("Unable to send reset email. Please try again.");
      }
    }
  }

  return (
    <div className="auth-page">

      <div className="auth-brand">
        <Link to="/">❋ RuralRise</Link>
        <p>SELL → SCALE → GROW</p>
      </div>

      <div className="auth-card login-card">

        <div className="auth-heading">
          <span>WELCOME BACK</span>
          <h2>Login to RuralRise</h2>
          <p>Continue growing your opportunities with us.</p>
        </div>

        <form onSubmit={handleLogin}>

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
            <label>Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="forgot-password">
            <button
              type="button"
              onClick={handleForgotPassword}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                color: "inherit"
              }}
            >
              Forgot password?
            </button>
          </div>

          {error && (
            <p style={{ color: "red" }}>{error}</p>
          )}

          {message && (
            <p style={{ color: "green" }}>{message}</p>
          )}

          <button
            type="submit"
            className="btn gold-btn auth-submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login →"}
          </button>

        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Create Account</Link>
        </p>

      </div>

      <p className="auth-footer">
        © 2026 RuralRise. All rights reserved.
      </p>

    </div>
  );
}

export default Login;