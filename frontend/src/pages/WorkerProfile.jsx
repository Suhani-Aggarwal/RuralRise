
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import "./WorkerProfile.css";

function WorkerProfile() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  const [skills, setSkills] = useState(
    userProfile?.skills?.join(", ") || ""
  );
  const [experience, setExperience] = useState(
    userProfile?.experience || ""
  );
  const [bio, setBio] = useState(userProfile?.bio || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      setMessage("Please log in first.");
      return;
    }

    const skillsArray = skills
      .split(",")
      .map((skill) => skill.trim())
      .filter((skill) => skill !== "");

    if (skillsArray.length === 0) {
      setMessage("Please enter at least one skill.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      await updateDoc(doc(db, "users", user.uid), {
        skills: skillsArray,
        experience: experience.trim(),
        bio: bio.trim(),
        updatedAt: new Date()
      });

      setMessage("Your worker profile has been saved!");

    } catch (error) {
      console.error("Profile update error:", error);
      setMessage("Could not save your profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="worker-profile-page">
      <div className="worker-profile-card">
        <p className="worker-profile-eyebrow">RURALRISE · WORKER</p>
        <h1>View & Update Your Worker Profile</h1>
        <p className="worker-profile-description">
          Share your skills and experience so businesses can discover
          opportunities that match your abilities.
        </p>

        <form onSubmit={handleSubmit}>
          <label>Skills</label>
          <input
            type="text"
            placeholder="e.g. Stitching, weaving, pottery"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
          />
          <small>Separate multiple skills with commas.</small>

          <label>Experience</label>
          <input
            type="text"
            placeholder="e.g. 2 years, Beginner, 5+ years"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
          />

          <label>About You</label>
          <textarea
            rows="4"
            placeholder="Briefly describe your work and abilities..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />

          {message && <p className="worker-profile-message">{message}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Profile Changes"}
          </button>
        </form>

        <button
          className="worker-profile-back"
          onClick={() => navigate("/worker-dashboard")}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

export default WorkerProfile;
