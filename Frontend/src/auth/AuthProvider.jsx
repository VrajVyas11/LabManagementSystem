/* eslint-disable no-unused-vars */
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useEffect, useState } from "react";
import { api } from "../api";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const me = await api.me();
          setUser(me);
        } catch {
          localStorage.removeItem("token");
          setUser(null);
        }
      }
      setReady(true);
    }
    init();
  }, []);

  const login = (token, role) => {
    localStorage.setItem("token", token);
    // fetch profile
    return api.me().then((me) => {
      setUser(me);
      return me;
    });
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const register = async (payload) => {
    const res = await api.register(payload);
    localStorage.setItem("token", res.token);
    return login(res.token);
  };

  const value = { user, ready, login, logout, register };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}