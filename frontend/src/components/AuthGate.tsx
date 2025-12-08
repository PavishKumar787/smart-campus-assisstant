// src/components/AuthGate.tsx
import React, { useCallback, useEffect, useState } from "react";
import api from "../lib/api";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import { toast } from "react-toastify";

export default function AuthGate() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const checkTokenAndFetch = useCallback(async () => {
    setLoading(true);
    const token = api._getToken?.();
    if (!token) {
      console.debug("AuthGate: no token -> show Login");
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      console.debug("AuthGate: token present, calling /auth/me");
      const res = await api.me();
      // normalize: maybe backend returns { user } or user object directly
      const u = res?.user ?? res ?? null;
      // if backend returns empty object or null -> treat as not-authenticated
      if (!u || (typeof u === "object" && Object.keys(u).length === 0)) {
        console.warn("AuthGate: /auth/me returned empty user, clearing token and showing Login", res);
        api._setToken(null);
        setUser(null);
      } else {
        console.debug("AuthGate: logged in user:", u);
        setUser(u);
      }
    } catch (err: any) {
      console.error("AuthGate: /auth/me failed", err);
      // treat as not-authenticated
      api._setToken?.(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkTokenAndFetch();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "sca_token") {
        console.debug("AuthGate: storage event for sca_token, re-checking");
        checkTokenAndFetch();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [checkTokenAndFetch]);

  const handleLogout = async () => {
    try {
      await api.logout();
      api._setToken?.(null);
      setUser(null);
      toast.success("Logged out successfully");
    } catch (err) {
      console.error("Logout error", err);
      toast.error("Failed to log out");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const LoginAny = Login as any;
    return <LoginAny onLogin={checkTokenAndFetch} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}
