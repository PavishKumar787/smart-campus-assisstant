// src/pages/Login.tsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { toast } from "react-toastify";

export default function Login({ onLogin }: { onLogin?: () => void }) {
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
        // Save token
        localStorage.setItem("sca_token", res.token);

        toast.success("Logged in");

        // optional callback if you ever pass it
        onLogin && onLogin();

        // 🔥 redirect to home page
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
    <form
      onSubmit={submit}
      className="max-w-md mx-auto p-4 bg-white rounded shadow"
    >
      <h2 className="text-lg font-semibold mb-3">Login</h2>

      <input
        className="w-full mb-2 px-3 py-2 border rounded"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="w-full mb-2 px-3 py-2 border rounded"
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>

      <p className="mt-3 text-center text-sm">
        Don't have an account?{" "}
        <Link to="/register" className="text-blue-600 hover:underline">
          Register here
        </Link>
      </p>
    </form>
  );
}
