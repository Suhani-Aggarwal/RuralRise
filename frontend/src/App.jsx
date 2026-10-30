
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Marketplace from "./pages/Marketplace";
import AddProduct from "./pages/AddProduct";
import BulkRequests from "./pages/BulkRequests";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/add-product" element={<AddProduct />} />
        <Route path="/bulk-requests" element={<BulkRequests />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
