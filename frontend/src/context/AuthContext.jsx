
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [activeRole, setActiveRole] = useState(
    () => localStorage.getItem("activeRole") || ""
  );
  const [loading, setLoading] = useState(true);

  const switchRole = (role) => {
    const normalizedRole = String(role).trim().toLowerCase();

    if (!["buyer", "seller"].includes(normalizedRole)) return;

    setActiveRole(normalizedRole);
    localStorage.setItem("activeRole", normalizedRole);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setUserProfile(null);

      if (currentUser) {
        try {
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const profile = userSnap.data();
            setUserProfile(profile);

            const savedRole = localStorage.getItem("activeRole");

            if (
              savedRole &&
              ["buyer", "seller"].includes(savedRole.toLowerCase())
            ) {
              setActiveRole(savedRole.toLowerCase());
            } else {
              const initialRole = String(profile.role || "")
                .trim()
                .toLowerCase();

              setActiveRole(initialRole);
              localStorage.setItem("activeRole", initialRole);
            }
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setUserProfile(null);
        setActiveRole("");
        localStorage.removeItem("activeRole");
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, userProfile, activeRole, switchRole, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
