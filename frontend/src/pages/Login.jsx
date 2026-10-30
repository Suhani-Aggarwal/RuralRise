async function handleLogin(e) {
  e.preventDefault();

  setError("");
  setMessage("");
  setLoading(true);

  try {
    // Firebase Authentication
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password
    );

    const loggedInUser = userCredential.user;

    // Generate Firebase ID Token
    const idToken = await loggedInUser.getIdToken();

    // Fetch the user's saved profile from Firestore
    const userRef = doc(db, "users", loggedInUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      setError("User profile not found. Please contact support.");
      return;
    }

    const userData = userSnap.data();

    console.log("Logged-in user:", loggedInUser.email);
    console.log("User role:", userData.role);

    // Redirect according to registered role
    if (userData.role === "buyer") {
      navigate("/buyer-dashboard");
    } else if (userData.role === "worker") {
      navigate("/worker-dashboard");
    } else {
      navigate("/dashboard");
    }

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