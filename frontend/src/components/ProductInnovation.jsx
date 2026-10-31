
import React, { useState } from "react";
import "./ProductInnovation.css";

// Temporary fallback ideas for the frontend.
// These can later be replaced by suggestions from your FastAPI AI endpoint.
const innovationIdeas = {
  bamboo: [
    {
      name: "Eco-Friendly Gift Boxes",
      description: "Beautiful reusable gift boxes made from bamboo.",
      materials: "Bamboo, natural rope, eco-friendly adhesive",
      difficulty: "Easy",
      market: "Gift shops and sustainable brands"
    },
    {
      name: "Modern Bamboo Lamps",
      description: "Decorative lamps with handcrafted bamboo designs.",
      materials: "Bamboo, LED lights, electrical fittings",
      difficulty: "Medium",
      market: "Home decor stores"
    },
    {
      name: "Bamboo Storage Organizers",
      description: "Stylish storage solutions for homes and offices.",
      materials: "Bamboo strips, natural polish",
      difficulty: "Easy",
      market: "Home and lifestyle market"
    },
    {
      name: "Bamboo Planters",
      description: "Handmade decorative planters for indoor plants.",
      materials: "Bamboo, waterproof coating",
      difficulty: "Easy",
      market: "Garden and home decor stores"
    },
    {
      name: "Sustainable Packaging",
      description: "Reusable packaging alternatives for small businesses.",
      materials: "Bamboo, natural fibre",
      difficulty: "Medium",
      market: "Eco-conscious businesses"
    }
  ],
  textile: [
    {
      name: "Handcrafted Tote Bags",
      description: "Reusable bags with traditional textile patterns.",
      materials: "Cotton fabric, thread, handles",
      difficulty: "Easy",
      market: "Lifestyle and fashion stores"
    },
    {
      name: "Decorative Cushion Covers",
      description: "Modern cushion covers using traditional embroidery.",
      materials: "Fabric, embroidery thread",
      difficulty: "Easy",
      market: "Home decor market"
    },
    {
      name: "Ethnic Table Runners",
      description: "Decorative table runners with handmade patterns.",
      materials: "Cotton or handloom fabric",
      difficulty: "Medium",
      market: "Home and gifting market"
    }
  ],
  pottery: [
    {
      name: "Decorative Ceramic Planters",
      description: "Handcrafted planters with modern finishes.",
      materials: "Clay, glaze, natural colours",
      difficulty: "Medium",
      market: "Home decor and gardening"
    },
    {
      name: "Handmade Tea Sets",
      description: "Unique pottery tea sets for everyday use.",
      materials: "Clay, glaze",
      difficulty: "Advanced",
      market: "Lifestyle and gifting"
    },
    {
      name: "Decorative Wall Art",
      description: "Handcrafted pottery wall decorations.",
      materials: "Clay, paint, glaze",
      difficulty: "Medium",
      market: "Interior design market"
    }
  ],
  general: [
    {
      name: "Customized Gift Hampers",
      description: "Create curated handmade gift collections using your products.",
      materials: "Existing products, packaging materials",
      difficulty: "Easy",
      market: "Corporate and personal gifting"
    },
    {
      name: "Decorative Home Accessories",
      description: "Transform your existing craftsmanship into modern decor.",
      materials: "Your existing production materials",
      difficulty: "Medium",
      market: "Home decor market"
    },
    {
      name: "Customized Corporate Gifts",
      description: "Create personalized products for business gifting.",
      materials: "Existing product materials, packaging",
      difficulty: "Medium",
      market: "Corporate buyers"
    }
  ]
};

function getIdeas(product) {
  const value = (
    typeof product === "string"
      ? product
      : `${product?.name || ""} ${product?.product_name || ""} ${product?.category || ""}`
  ).toLowerCase();

  if (value.includes("bamboo")) return innovationIdeas.bamboo;
  if (value.includes("textile") || value.includes("cloth") || value.includes("fabric") || value.includes("handloom"))
    return innovationIdeas.textile;
  if (value.includes("pottery") || value.includes("clay") || value.includes("ceramic"))
    return innovationIdeas.pottery;

  return innovationIdeas.general;
}

export default function ProductInnovation({ products = [] }) {
  const [selectedProduct, setSelectedProduct] = useState("");
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generateIdeas = () => {
    if (!selectedProduct) {
      setError("Please select a product first.");
      return;
    }

    setError("");
    setLoading(true);
    setIdeas([]);

    // Simulates a short generation delay for this frontend-only demo.
    setTimeout(() => {
      const product = products.find(
        (p, index) => String(p.id || p._id || index) === selectedProduct
      );

      setIdeas(getIdeas(product || selectedProduct));
      setLoading(false);
    }, 700);
  };

  return (
    <section className="innovation-section">
      <div className="innovation-header">
        <div>
          <span className="innovation-tag">AI POWERED</span>
          <h2>AI Product Innovation</h2>
          <p>
            Discover new products you can create using your existing
            skills and resources.
          </p>
        </div>
        <div className="innovation-icon">✦</div>
      </div>

      <div className="innovation-controls">
        <label htmlFor="innovation-product">
          Choose one of your existing products
        </label>

        <select
          id="innovation-product"
          value={selectedProduct}
          onChange={(e) => {
            setSelectedProduct(e.target.value);
            setIdeas([]);
            setError("");
          }}
        >
          <option value="">Select a product</option>

          {products.map((product, index) => (
            <option
              key={product.id || product._id || index}
              value={String(product.id || product._id || index)}
            >
              {product.product_name || product.name || "Unnamed product"}
            </option>
          ))}
        </select>

        <button
          className="innovation-generate-btn"
          onClick={generateIdeas}
          disabled={loading || products.length === 0}
        >
          {loading ? "Generating..." : "✦ Generate Product Ideas"}
        </button>

        {products.length === 0 && (
          <p className="innovation-message">
            Add a product to your listings to explore new ideas.
          </p>
        )}

        {error && <p className="innovation-error">{error}</p>}
      </div>

      {loading && (
        <div className="innovation-loading">
          Finding new possibilities for your business...
        </div>
      )}

      {ideas.length > 0 && (
        <div className="innovation-results">
          <div className="innovation-results-heading">
            <div>
              <h3>New opportunities for you</h3>
              <p>{ideas.length} product ideas to explore</p>
            </div>

            <button onClick={generateIdeas} className="innovation-refresh">
              ↻ Generate Again
            </button>
          </div>

          <div className="innovation-grid">
            {ideas.map((idea, index) => (
              <article className="innovation-card" key={index}>
                <span className="innovation-number">
                  IDEA 0{index + 1}
                </span>

                <h4>{idea.name}</h4>
                <p>{idea.description}</p>

                <div className="innovation-detail">
                  <strong>Materials</strong>
                  <span>{idea.materials}</span>
                </div>

                <div className="innovation-detail">
                  <strong>Potential market</strong>
                  <span>{idea.market}</span>
                </div>

                <span className={`difficulty ${idea.difficulty.toLowerCase()}`}>
                  {idea.difficulty} to make
                </span>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
