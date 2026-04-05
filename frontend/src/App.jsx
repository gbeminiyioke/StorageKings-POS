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
import Suppliers from "./pages/Suppliers";
import Customers from "./pages/Customers";
import ReceiveItems from "./pages/ReceiveItems";
import PurchasesReport from "./pages/PurchasesReport";
import SalesPage from "./pages/SalesPage";
import SalesInvoicePage from "./pages/SalesInvoicePage";
import Transfers from "./pages/Transfers";
import StoragePage from "./pages/StoragePage";
import DischargePage from "./pages/DischargePage";

export default function App() {
  return (
    <Routes>
      {/* ============= PUBLIC ROUTES ============= */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/reports/purchases" element={<PurchasesReport />} />

      <Route path="/sales/invoice/:sale_id" element={<SalesInvoicePage />} />

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

        {/*============== SALES =============== */}
        <Route
          path="sales"
          element={
            <ProtectedRoute permission="sales">
              <SalesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="transfer"
          element={
            <ProtectedRoute permission="transfer">
              <Transfers />
            </ProtectedRoute>
          }
        />

        <Route
          path="storage"
          element={
            <ProtectedRoute permission="storage">
              <StoragePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="discharge-items"
          element={
            <ProtectedRoute permission="discharge_items">
              <DischargePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="products"
          element={
            <ProtectedRoute permission="inventory">
              <Products />
            </ProtectedRoute>
          }
        />

        <Route
          path="suppliers"
          element={
            <ProtectedRoute permission="suppliers">
              <Suppliers />
            </ProtectedRoute>
          }
        />

        <Route
          path="receive-items"
          element={
            <ProtectedRoute permission="receive_items">
              <ReceiveItems />
            </ProtectedRoute>
          }
        />

        <Route
          path="customers"
          element={
            <ProtectedRoute permission="customers">
              <Customers />
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
