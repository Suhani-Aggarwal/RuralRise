
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleDashboardRedirect from "./components/RoleDashboardRedirect";
import RoleProtectedRoute from "./components/RoleProtectedRoute";

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
import MyOrders from "./pages/MyOrders";
import Payment from "./pages/Payment";
import PaymentResult from "./pages/PaymentResult";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Routes for all logged-in users */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<RoleDashboardRedirect />} />
            <Route path="/my-dashboard" element={<RoleDashboardRedirect />} />

            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/bulk-requests" element={<BulkRequests />} />
            <Route path="/product/:id" element={<ProductDetails />} />
            <Route path="/matching" element={<Matching />} />

            {/* Buyer and Seller Dashboard Routes */}
<Route element={<RoleProtectedRoute allowedRoles={["buyer", "seller"]} />}>
  <Route path="/seller-dashboard" element={<Dashboard />} />
  <Route path="/buyer-dashboard" element={<BuyerDashboard />} />
</Route>

{/* Seller-only Routes */}
<Route element={<RoleProtectedRoute allowedRoles={["seller"]} />}>
  <Route path="/add-product" element={<AddProduct />} />
  <Route path="/msme-profile" element={<MSMEProfile />} />
</Route>

{/* Buyer-only Routes */}
<Route element={<RoleProtectedRoute allowedRoles={["buyer"]} />}>
  <Route path="/order-request/:id" element={<OrderRequest />} />
  <Route path="/order-confirmation" element={<OrderConfirmation />} />
  <Route path="/my-orders" element={<MyOrders />} />
  <Route path="/payment" element={<Payment />} />
  <Route path="/payment-result" element={<PaymentResult />} />
</Route>

            {/* Worker Routes */}
            <Route element={<RoleProtectedRoute allowedRoles={["worker"]} />}>
              <Route path="/worker-dashboard" element={<WorkerDashboard />} />
              <Route path="/worker-profile" element={<WorkerProfile />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
