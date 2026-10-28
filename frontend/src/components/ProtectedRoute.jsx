import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
//import { getToken, getUser } from "../utils/auth";

const ProtectedRoute = ({
  children,
  staffOnly = false,
  customerOnly = false,
  permission = null,
}) => {
  const { authLoading, isAuthenticated, user, hasPermission } = useAuth();
  /*==========================================
  console.log("ProtectedRoute", {
    authLoading,
    isAuthenticated,
    user,
    path: window.location.pathname,
  });

  const auth = useAuth();

  console.log("ProtectedRoute render", {
    auth,
    pathname: window.location.pathname,
  });
  =========================================== */

  if (authLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (staffOnly && user.loginType !== "staff") {
    return <Navigate to="/customer-home" replace />;
  }

  if (customerOnly && user.loginType !== "customer") {
    return <Navigate to="/dashboard" replace />;
  }

  if (permission && !hasPermission(permission))
    return <Navigate to="/unauthorized" replace />;
  return children;
};

export default ProtectedRoute;
