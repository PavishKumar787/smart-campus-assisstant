// src/pages/Profile.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import api from "../lib/api";
import { toast } from "react-toastify";

type UserObj =
  | {
      _id?: string;
      name?: string;
      email?: string;
      created_at?: string;
      [key: string]: any;
    }
  | null;

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

  // sync html.dark with state
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    try {
      localStorage.setItem("darkMode", next ? "true" : "false");
      if (next) document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
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
    <div
      className="min-h-screen flex flex-col
                 bg-gradient-to-br from-[#2a0056] via-[#19002f] to-[#050013]
                 text-white"
    >
      {/* Glass header (same style as Home/Dashboard) */}
      <div className="px-4 md:px-10 pt-4 pb-2">
        <Header
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          onProfile={() => {
            /* already here */
          }}
        />
      </div>

      <main className="flex-1 px-4 md:px-10 pb-10 flex items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 border-4 border-pink-400/80 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-purple-100/90">Loading profile...</p>
          </div>
        ) : !user ? (
          <div className="text-center text-purple-100">
            Unable to load profile.
          </div>
        ) : (
          <div
            className="w-full max-w-xl rounded-2xl p-6
                       bg-white/5 border border-white/10
                       backdrop-blur-xl shadow-[0_18px_45px_rgba(0,0,0,0.7)]"
          >
            <h2 className="text-2xl font-semibold text-purple-50 mb-4">
              Profile
            </h2>

            <div className="space-y-4 text-sm">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-purple-200/80 mb-1">
                  Name
                </div>
                <div className="font-medium text-purple-50">
                  {user.name ?? "—"}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-purple-200/80 mb-1">
                  Email
                </div>
                <div className="font-medium text-purple-50 break-all">
                  {user.email ?? "—"}
                </div>
              </div>

              {createdAt && (
                <div>
                  <div className="text-xs uppercase tracking-[0.25em] text-purple-200/80 mb-1">
                    Joined
                  </div>
                  <div className="font-medium text-purple-50">
                    {createdAt}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                onClick={() => navigate("/home")}
                className="px-4 py-2 rounded-full border border-white/25 text-xs font-medium
                           text-purple-100 bg-white/5 hover:bg-white/10 transition"
              >
                ← Back to Home
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-full text-xs font-semibold
                           bg-red-500 hover:bg-red-400 text-white
                           shadow-[0_10px_25px_rgba(248,113,113,0.4)] transition"
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
