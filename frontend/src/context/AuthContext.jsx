import React, { createContext, useContext, useState, useEffect } from "react";
import { authApi } from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("sparepro_user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem("sparepro_token") || null);
  const [financialSummary, setFinancialSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync token & user from backend
  const refreshUser = async () => {
    const storedToken = localStorage.getItem("sparepro_token");
    if (!storedToken) {
      setLoading(false);
      return;
    }

    try {
      const res = await authApi.getMe();
      if (res.success && res.data?.user) {
        setUser(res.data.user);
        setFinancialSummary(res.data.financialSummary || null);
        localStorage.setItem("sparepro_user", JSON.stringify(res.data.user));
      }
    } catch (err) {
      console.warn("Session check failed or expired:", err.message);
      if (err.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    if (res.success && res.data?.token) {
      const newToken = res.data.token;
      const newUser = res.data.user;

      setToken(newToken);
      setUser(newUser);
      setFinancialSummary(res.data.financialSummary || null);

      localStorage.setItem("sparepro_token", newToken);
      localStorage.setItem("sparepro_user", JSON.stringify(newUser));
      return res;
    }
    throw new Error(res.message || "Login failed");
  };

  const register = async (formData) => {
    const res = await authApi.register(formData);
    if (res.success && res.data?.token) {
      const newToken = res.data.token;
      const newUser = res.data.user;

      setToken(newToken);
      setUser(newUser);

      localStorage.setItem("sparepro_token", newToken);
      localStorage.setItem("sparepro_user", JSON.stringify(newUser));
      return res;
    }
    throw new Error(res.message || "Registration failed");
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setFinancialSummary(null);
    localStorage.removeItem("sparepro_token");
    localStorage.removeItem("sparepro_user");
  };

  const isApproved = user?.role === "admin" || user?.approvalStatus === "approved";
  const isAdmin = user?.role === "admin";
  const isReseller = user?.role === "reseller";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        financialSummary,
        loading,
        isAuthenticated: !!user && !!token,
        isApproved,
        isAdmin,
        isReseller,
        role: user?.role || "guest",
        approvalStatus: user?.approvalStatus || "none",
        accountStatus: user?.accountStatus || "none",
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
