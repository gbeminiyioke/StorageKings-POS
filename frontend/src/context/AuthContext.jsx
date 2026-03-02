import React, { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [branchId, setBranchId] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  /*---------------------------------------
    LOAD FROM LOCAL STORAGE ON APP START
  -----------------------------------------*/
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    const storedRole = localStorage.getItem("role");
    const storedPermissions = localStorage.getItem("permissions");
    const storedBranch = localStorage.getItem("branch_id");

    if (!token) return;

    try {
      const decoded = jwtDecode(token);

      if (decoded.exp * 1000 < Date.now()) {
        logout();
        return;
      }

      let parsedUser = null;

      if (storedUser && storedUser !== "undefined") {
        parsedUser = JSON.parse(storedUser);
      }

      setUser(parsedUser || decoded);
      setPermissions(parsedUser?.permissions || {});
      setRole(parsedUser?.role || null);
      setBranchId(parsedUser?.branch_id || null);
      setIsAuthenticated(true);

      //setUser(decoded);
      //setIsAuthenticated(true);
    } catch (err) {
      console.error("Invalid token:", err);
      logout();
    }
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
      branch_id: data.branch_id || null,
      name: data.name,
      roleName: data.roleName,
      defaultPage: data.defaultPage,
    };

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(userData));
    /*
    localStorage.setItem("role", JSON.stringify(role));
    localStorage.setItem("permissions", JSON.stringify(permissions));
    localStorage.setItem("branch_id", branch_id);
    */
    setUser(userData);
    setRole(userData.role);
    setPermissions(userData.permissions);
    setBranchId(userData.branch_id);
    setIsAuthenticated(true);
  };

  /*------------------------------------
    LOGOUT
  --------------------------------------*/
  const logout = () => {
    /*
    localStorage.clear();
    setUser(null);
    setRole(null);
    setPermissions({});
    setBranchId(null);
    setIsAuthenticated(false);
    */
    localStorage.removeItem("token");

    setUser(null);
    setIsAuthenticated(false);
  };

  /*------------------------------------
    PERMISSION CHECK
  --------------------------------------*/
  const hasPermission = (key) => {
    return Boolean(permissions?.[key]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
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
