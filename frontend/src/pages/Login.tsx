// src/pages/Login.tsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../lib/api";
import { MessageCircle } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.login({ email, password });
      if (res?.token) {
        localStorage.setItem("sca_token", res.token);
        toast.success("Logged in");
        navigate("/home", { replace: true });
      } else {
        toast.error("Login failed");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Login error: " + (err.message || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#2a0056] via-[#19002f] to-[#050013] text-white">
      {/* Top navigation */}
      <header className="flex items-center justify-between px-8 md:px-16 py-6 text-sm">
        <div className="flex items-center gap-2 font-semibold tracking-wide">
          <MessageCircle className="h-6 w-6 text-pink-400" />
          <span>Smart Campus Assistant</span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs uppercase tracking-[0.25em] text-purple-200/80">
          <button className="hover:text-white transition">Home</button>
          <button className="hover:text-white transition">Blog</button>
          <button className="hover:text-white transition">Contacts</button>
        </nav>

        <Link
          to="/register"
          className="px-4 py-2 text-xs font-medium rounded-full border border-pink-400/70 
                     text-pink-200 hover:bg-pink-500 hover:text-white transition"
        >
          Sign up
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col md:flex-row items-center px-8 md:px-16 pb-12 gap-10">
        {/* Left: Text + form */}
        <section className="w-full md:w-1/2 max-w-md space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-pink-300 mb-2">
              Welcome back
            </p>
            <h1 className="text-3xl md:text-4xl font-bold leading-tight">
              Chat bot for your
              <span className="text-pink-400"> Smart Campus</span>
            </h1>
            <p className="mt-3 text-sm text-purple-100/80">
              Log in to ask questions about your notes, get summaries, and
              auto-generated quizzes powered by your own documents.
            </p>
          </div>

          <form
            onSubmit={submit}
            className="mt-2 space-y-4 bg-white/5 backdrop-blur-xl border border-white/10 
                       rounded-2xl p-5 shadow-[0_18px_45px_rgba(0,0,0,0.5)]"
          >
            <div className="space-y-1">
              <label className="text-xs font-medium text-purple-100/90">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15
                           text-sm text-white placeholder:text-purple-200/60
                           focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                placeholder="you@college.edu"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-purple-100/90">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15
                           text-sm text-white placeholder:text-purple-200/60
                           focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 rounded-full text-sm font-semibold
                         bg-pink-500 hover:bg-pink-400 text-white
                         disabled:opacity-60 disabled:cursor-not-allowed
                         shadow-[0_12px_30px_rgba(236,72,153,0.45)] transition"
            >
              {loading ? "Signing in..." : "Login"}
            </button>

            <p className="text-[11px] text-center text-purple-100/80 mt-1">
              Don&apos;t have an account?{" "}
              <Link
                to="/register"
                className="text-pink-300 hover:text-pink-200 underline underline-offset-2"
              >
                Create one
              </Link>
            </p>
          </form>
        </section>

        {/* Right: Bot illustration / visual */}
        <section className="w-full md:w-1/2 flex justify-center mt-8 md:mt-0">
          <div className="relative w-72 h-72 md:w-80 md:h-80">
            {/* Glowing background disc */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-blue-500 blur-3xl opacity-40" />

            {/* Bot body */}
            <div className="absolute inset-6 rounded-[40%] bg-gradient-to-b from-[#1b022f] to-[#050013] border border-purple-500/40 flex flex-col items-center justify-center shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
              <div className="w-24 h-16 rounded-full bg-gradient-to-b from-[#f5f2ff] to-[#d2c9ff] flex items-center justify-center">
                <div className="w-16 h-10 rounded-full bg-[#19002f] flex items-center justify-center">
                  <div className="flex gap-2">
                    <span className="w-3 h-1 rounded-full bg-pink-400 rotate-12" />
                    <span className="w-3 h-1 rounded-full bg-pink-400 -rotate-12" />
                  </div>
                </div>
              </div>
              <div className="mt-3 w-24 h-16 rounded-b-full bg-gradient-to-b from-[#f5f2ff] to-[#d2c9ff]" />
            </div>

            {/* Floating chips */}
            <div className="absolute -left-4 top-8 w-20 h-1.5 rounded-full bg-pink-400/70" />
            <div className="absolute -right-6 top-16 w-10 h-10 rounded-xl bg-blue-500/60" />
            <div className="absolute right-2 bottom-10 w-16 h-1.5 rounded-full bg-purple-300/70" />
          </div>
        </section>
      </main>
    </div>
  );
}
