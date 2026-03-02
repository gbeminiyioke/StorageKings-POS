import React from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";
import Login from "./pages/Login";
import StaffDashboard from "./pages/StaffDashboard";
import CustomerHome from "./pages/CustomerHome";
import Roles from "./pages/Roles";
import Business from "./pages/Business";
import Branches from "./pages/Branches";
import Users from "./pages/Users";
import Unauthorized from "./pages/Unauthorized";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminDashboard from "./pages/AdminDashboard";
import Products from "./pages/Products";

export default function App() {
  return (
    <Routes>
      {/* ============= PUBLIC ROUTES ============= */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* ================ CUSTOMER ================ */}
      <Route
        path="/customer-home"
        element={
          <ProtectedRoute customerOnly>
            <CustomerHome />
          </ProtectedRoute>
        }
      />

      {/* ================== STAFF ================== */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute staffOnly>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* ========= DASHBOARD HOME ========= */}
        <Route index element={<StaffDashboard />} />

        <Route
          path="products"
          element={
            <ProtectedRoute permission="inventory">
              <Products />
            </ProtectedRoute>
          }
        />

        {/* ============ SETTINGS ============ */}
        <Route
          path="users"
          element={
            <ProtectedRoute permission="users">
              <Users />
            </ProtectedRoute>
          }
        />

        <Route
          path="roles"
          element={
            <ProtectedRoute permission="roles">
              <Roles />
            </ProtectedRoute>
          }
        />

        <Route
          path="branches"
          element={
            <ProtectedRoute permission="branches">
              <Branches />
            </ProtectedRoute>
          }
        />

        <Route
          path="security"
          element={
            <ProtectedRoute permission="settings_security">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route
        path="business"
        element={
          <ProtectedRoute permission="settings_parameter_settings">
            <Business />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
