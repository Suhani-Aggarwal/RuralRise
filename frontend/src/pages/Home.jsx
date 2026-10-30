
import { Link } from "react-router-dom";
import "./Home.css";

const features = [
  {
    icon: "♧",
    title: "Connect",
    description:
      "Connect rural producers, skilled workers and buyers on one platform.",
  },
  {
    icon: "🌾",
    title: "Sell",
    description:
      "Showcase your products, services and skills to more customers.",
  },
  {
    icon: "↗",
    title: "Scale",
    description:
      "Reach bulk buyers and combine capacities to fulfil larger orders.",
  },
  {
    icon: "✿",
    title: "Grow",
    description:
      "Build lasting opportunities and grow your rural business.",
  },
];

function Home() {
  return (
    <div className="home-page">

      {/* NAVBAR */}
      <nav className="navbar navbar-expand-lg rural-navbar">
        <div className="container">
          <Link className="navbar-brand rural-logo" to="/">
            <span className="logo-icon">❋</span>
            <span>
              RuralRise
              <small>SELL → SCALE → GROW</small>
            </span>
          </Link>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#ruralNavbar"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="ruralNavbar">
            <ul className="navbar-nav ms-auto align-items-lg-center">
              <li className="nav-item">
                <Link className="nav-link active" to="/">Home</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/marketplace">
                  Marketplace
                </Link>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#about">About</a>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/login">Login</Link>
              </li>
              <li className="nav-item ms-lg-4">
                <Link className="btn gold-btn navbar-cta" to="/register">
                  Get Started <span>→</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero-section">
        <div className="hero-overlay"></div>

        <div className="container hero-container">
          <div className="hero-content">

            <div className="hero-label">
              ✦ Rural Products · Skilled Workforce · Global Markets
            </div>

            <h1>
              Local Roots.
              <br />
              <span>Bigger Dreams.</span>
            </h1>

            <p className="hero-description">
              Connecting rural producers, skilled workers and
              businesses with buyers and opportunities. Because
              every great business deserves room to grow.
            </p>

            <div className="hero-buttons">
              <Link to="/marketplace" className="btn gold-btn hero-cta">
                Explore Marketplace <span>→</span>
              </Link>

              <Link to="/register" className="btn outline-btn hero-cta">
                ♙ Join as Seller
              </Link>
            </div>

            <div className="hero-tagline">
              <span></span>
              SELL <b>→</b> SCALE <b>→</b> GROW
              <span></span>
            </div>
          </div>

          <div className="hero-caption">
            <span>Real People.</span>
            <br />
            Real Progress.
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features-section" id="about">
        <div className="container">

          <div className="section-heading text-center">
            <div className="section-eyebrow">
              <span></span>
              WHAT WE DO
              <span></span>
            </div>

            <h2>One Platform. Endless Possibilities.</h2>

            <p>
              Helping rural communities connect, showcase their potential
              and grow beyond boundaries.
            </p>
          </div>

          <div className="row g-4">
            {features.map((feature, index) => (
              <div className="col-md-6 col-lg-3" key={feature.title}>
                <div
                  className="feature-card"
                  style={{ "--card-delay": `${index * 0.12}s` }}
                >
                  <div className="feature-icon">
                    {feature.icon}
                  </div>

                  <h4>{feature.title}</h4>
                  <p>{feature.description}</p>

                  <div className="feature-arrow">→</div>
                  <div className="feature-decoration">✧</div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="rural-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="footer-logo">❋ RuralRise</div>
              <span>SELL → SCALE → GROW</span>
            </div>

            <div className="footer-links">
              <Link to="/">Home</Link>
              <Link to="/marketplace">Marketplace</Link>
              <a href="#about">About</a>
              <Link to="/login">Login</Link>
            </div>
          </div>

          <div className="footer-bottom">
            © 2026 RuralRise. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}

export default Home;
