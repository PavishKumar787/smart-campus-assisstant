// src/components/Register.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { toast } from "react-toastify";

export default function Register({ onRegistered }: { onRegistered?: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.register({ name, email, password });
      if (res?.token) {
        localStorage.setItem("sca_token", res.token);
        toast.success("Registered");
        onRegistered && onRegistered();
      } else {
        toast.error("Registration failed");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Register error: " + (err.message || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-md mx-auto p-4 bg-white rounded shadow">
      <h2 className="text-lg font-semibold mb-3">Register</h2>
      <input className="w-full mb-2 px-3 py-2 border rounded" placeholder="Full name" value={name} onChange={(e)=>setName(e.target.value)} />
      <input className="w-full mb-2 px-3 py-2 border rounded" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
      <input className="w-full mb-2 px-3 py-2 border rounded" placeholder="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
      <button disabled={loading} className="w-full bg-green-600 text-white py-2 rounded">{loading ? "Creating account..." : "Create account"}</button>
      <p className="mt-3 text-center text-sm">
        Already have an account? <Link to="/" className="text-blue-600 hover:underline">Login here</Link>
      </p>
    </form>
  );
}
