import React, { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import api from "../api/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [branchId, setBranchId] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  /*---------------------------------------
    LOAD FROM LOCAL STORAGE ON APP START
  -----------------------------------------*/
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("token");
      const refreshToken = localStorage.getItem("refreshToken");

      /*
    No saved session.
  */
      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        let activeToken = token;

        /*
      Check whether the access token has expired.
    */
        const decoded = jwtDecode(token);

        if (decoded.exp * 1000 <= Date.now()) {
          /*
        Access token expired.
        Try to refresh it.
      */
          if (!refreshToken) {
            throw new Error("Missing refresh token.");
          }

          const res = await api.post("/auth/refresh", {
            refreshToken,
          });

          activeToken = res.data.token;

          localStorage.setItem("token", activeToken);
          localStorage.setItem("refreshToken", res.data.refreshToken);
        }

        /*
      Restore user information.
    */
        const finalDecoded = jwtDecode(activeToken);

        const storedUser = localStorage.getItem("user");

        const parsedUser = storedUser ? JSON.parse(storedUser) : finalDecoded;

        setUser(parsedUser);

        setPermissions(parsedUser.permissions || {});

        setRole(parsedUser.role || null);

        /*
      Use the same property name everywhere.
    */
        setBranchId(parsedUser.branchId || null);

        setIsAuthenticated(true);
      } catch (err) {
        console.error("Auth initialization failed:", err);

        /*
      If we're offline, keep the stored session.
      api.js will recover automatically when
      connectivity returns.
    */
        if (!navigator.onLine) {
          return;
        }

        /*
      Session is genuinely invalid.
    */
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");

        setUser(null);
        setPermissions({});
        setRole(null);
        setBranchId(null);
        setIsAuthenticated(false);
      } finally {
        /*
      Allow ProtectedRoute to render.
    */
        setAuthLoading(false);
      }
    };
    initializeAuth();
  }, []);

  /*-----------------------------------
    LOGIN
  -------------------------------------*/
  const login = (data) => {
    //const { token, user, role, permissions, branch_id } = data;
    const decoded = jwtDecode(data.token);

    const userData = {
      ...decoded,
      permissions: data.permissions || {},
      role: data.role || null,
      branchId: decoded.branchId || null,
      branchName: decoded.branchName || null,
      name: data.name,
      roleName: data.roleName,
      defaultPage: data.defaultPage,
    };

    localStorage.setItem("token", data.token);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("user", JSON.stringify(userData));
    /*
    localStorage.setItem("role", JSON.stringify(role));
    localStorage.setItem("permissions", JSON.stringify(permissions));
    localStorage.setItem("branch_id", branch_id);
    */
    setUser(userData);
    setRole(userData.role);
    setPermissions(userData.permissions);
    setBranchId(userData.branchId);
    setIsAuthenticated(true);
  };

  /*------------------------------------
    LOGOUT
  --------------------------------------*/
  const logout = async () => {
    try {
      /*==================================
      console.trace("LOGOUT CALLED");
      ================================== */

      const token = localStorage.getItem("token");

      if (token) {
        await api.post("/auth/logout");
      }
    } catch (err) {
      console.error(err);
    } finally {
      //localStorage.clear();
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      setUser(null);
      setRole(null);
      setPermissions({});
      setBranchId(null);
      setIsAuthenticated(false);
    }
  };

  /*------------------------------------
    PERMISSION CHECK
  --------------------------------------*/
  const hasPermission = (key) => {
    return Boolean(permissions?.[key]);
  };

  /*===================================
  console.log("AuthContext state", {
    authLoading,
    isAuthenticated,
    user,
  });
  =================================== */

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        branchId,
        permissions,
        authLoading,
        isAuthenticated,
        login,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
