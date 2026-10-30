
import { Link } from "react-router-dom";
import "./Auth.css";

function Login() {
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

        <form>
          <div className="mb-3">
            <label>Email Address</label>
            <input type="email" className="form-control" placeholder="Enter your email" />
          </div>

          <div className="mb-3">
            <label>Password</label>
            <input type="password" className="form-control" placeholder="Enter your password" />
          </div>

          <div className="forgot-password">
            <a href="#forgot-password">Forgot password?</a>
          </div>

          <button type="button" className="btn gold-btn auth-submit">
            Login →
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Create Account</Link>
        </p>
      </div>

      <p className="auth-footer">© 2026 RuralRise. All rights reserved.</p>
    </div>
  );
}

export default Login;
