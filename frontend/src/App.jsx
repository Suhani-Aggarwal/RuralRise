import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Marketplace from "./pages/Marketplace";
import AddProduct from "./pages/AddProduct";
import BulkRequests from "./pages/BulkRequests";
import ProductDetails from "./pages/ProductDetails";
import OrderRequest from "./pages/OrderRequest";
import OrderConfirmation from "./pages/OrderConfirmation";
import MSMEProfile from "./pages/MSMEProfile";
import Matching from "./pages/Matching";
import BuyerDashboard from "./pages/BuyerDashboard";
import WorkerDashboard from "./pages/WorkerDashboard";
import WorkerProfile from "./pages/WorkerProfile";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/add-product" element={<AddProduct />} />
            <Route path="/bulk-requests" element={<BulkRequests />} />
            <Route path="/product/:id" element={<ProductDetails />} />
            <Route path="/order-request/:id" element={<OrderRequest />} />
            <Route path="/order-confirmation" element={<OrderConfirmation />} />
            <Route path="/msme-profile" element={<MSMEProfile />} />
            <Route path="/matching" element={<Matching />} />
            <Route path="/buyer-dashboard" element={<BuyerDashboard />}/>
            <Route path="/worker-dashboard" element={<WorkerDashboard />}/>
            <Route path="/worker-profile" element={<WorkerProfile />} />
          </Route>

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;