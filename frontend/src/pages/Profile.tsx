// src/pages/Profile.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import api from "../lib/api";
import { toast } from "react-toastify";

type UserObj = {
  _id?: string;
  name?: string;
  email?: string;
  created_at?: string;
  [key: string]: any;
} | null;

const Profile: React.FC = () => {
  const [user, setUser] = useState<UserObj>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem("darkMode") === "true";
    } catch {
      return false;
    }
  });

  const navigate = useNavigate();

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    try {
      localStorage.setItem("darkMode", next ? "true" : "false");
    } catch {}
  };

  useEffect(() => {
    const fetchMe = async () => {
      setLoading(true);
      try {
        const res = await api.me();
        const u = res?.user ?? res ?? null;
        if (!u || (typeof u === "object" && Object.keys(u).length === 0)) {
          toast.error("Session expired, please log in again");
          navigate("/", { replace: true });
          return;
        }
        setUser(u);
      } catch (err: any) {
        console.error(err);
        toast.error("Not authenticated, please log in");
        navigate("/", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await api.logout();
      api._setToken?.(null);
      toast.success("Logged out");
      navigate("/", { replace: true });
    } catch (err: any) {
      console.error(err);
      toast.error("Logout failed");
    }
  };

  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleString()
    : undefined;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        onProfile={() => {
          /* already here, do nothing */
        }}
      />

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-300">
                Loading profile...
              </p>
            </div>
          </div>
        ) : !user ? (
          <div className="text-center text-slate-700 dark:text-slate-200">
            Unable to load profile.
          </div>
        ) : (
          <div className="max-w-xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
              Profile
            </h2>

            <div className="space-y-4 text-sm">
              <div>
                <div className="text-slate-500 dark:text-slate-400">
                  Name
                </div>
                <div className="font-medium text-slate-900 dark:text-slate-50">
                  {user.name ?? "—"}
                </div>
              </div>

              <div>
                <div className="text-slate-500 dark:text-slate-400">
                  Email
                </div>
                <div className="font-medium text-slate-900 dark:text-slate-50 break-all">
                  {user.email ?? "—"}
                </div>
              </div>

              {createdAt && (
                <div>
                  <div className="text-slate-500 dark:text-slate-400">
                    Joined
                  </div>
                  <div className="font-medium text-slate-900 dark:text-slate-50">
                    {createdAt}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                onClick={() => navigate("/home")}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-slate-700 dark:text-slate-100 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                ← Back to Home
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Profile;
