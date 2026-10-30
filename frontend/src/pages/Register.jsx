
import { Link } from "react-router-dom";
import "./Auth.css";

function Register() {
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

        <form>
          <div className="mb-3">
            <label>Full Name</label>
            <input type="text" className="form-control" placeholder="Enter your name" />
          </div>

          <div className="mb-3">
            <label>Email Address</label>
            <input type="email" className="form-control" placeholder="Enter your email" />
          </div>

          <div className="mb-3">
            <label>Location</label>
            <input type="text" className="form-control" placeholder="Your city or village" />
          </div>

          <div className="mb-3">
            <label>I want to join as</label>
            <select className="form-select" defaultValue="">
              <option value="" disabled>Select your role</option>
              <option value="seller">Seller / Producer</option>
              <option value="buyer">Buyer</option>
              <option value="worker">Skilled Worker</option>
            </select>
          </div>

          <div className="mb-3">
            <label>Password</label>
            <input type="password" className="form-control" placeholder="Create a password" />
          </div>

          <button type="button" className="btn gold-btn auth-submit">
            Create Account →
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>

      <p className="auth-footer">© 2026 RuralRise. All rights reserved.</p>
    </div>
  );
}

export default Register;
