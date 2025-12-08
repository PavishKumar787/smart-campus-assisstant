// src/lib/api.ts
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

type Json = Record<string, any> | null;
type HeadersObj = Record<string, string>;

function getToken(): string | null {
  return localStorage.getItem("sca_token");
}

function setToken(token: string | null) {
  if (token) localStorage.setItem("sca_token", token);
  else localStorage.removeItem("sca_token");
}

function authHeaders(): HeadersObj {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Convert HeadersInit -> plain object (Record<string,string>) */
function toHeaderObj(headers?: HeadersInit | undefined): HeadersObj {
  if (!headers) return {};
  if (headers instanceof Headers) {
    const out: HeadersObj = {};
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  if (Array.isArray(headers)) {
    // string[][]
    return Object.fromEntries(headers);
  }
  // Record<string,string>
  return headers as HeadersObj;
}

async function callJson(path: string, opts: RequestInit = {}) {
  const defaultHeaders: HeadersObj = {
    "Content-Type": "application/json",
    ...authHeaders(),
  };

  const incomingHeaders = toHeaderObj(opts.headers);
  const mergedHeaders: HeadersObj = { ...defaultHeaders, ...incomingHeaders };

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: mergedHeaders as HeadersInit,
    
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) throw json || { status: res.status, text };
  return json;
}

/** For multipart FormData uploads.
 * We intentionally do NOT set Content-Type header so browser sets boundary.
 */
async function callForm(path: string, form: FormData, opts: RequestInit = {}) {
  const defaultHeaders = {
    ...authHeaders(),
  };

  const incomingHeaders = toHeaderObj(opts.headers);
  // ensure we DO NOT overwrite Content-Type here (FormData needs boundary)
  if ("Content-Type" in incomingHeaders) {
    delete incomingHeaders["Content-Type"];
  }

  const mergedHeaders: HeadersObj = { ...defaultHeaders, ...incomingHeaders };

  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    method: opts.method || "POST",
    headers: mergedHeaders as HeadersInit,
    body: form,
    
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) throw json || { status: res.status, text };
  return json;
}

/* ---------- AUTH ---------- */

export async function register(payload: { name: string; email: string; password: string }) {
  const res = await callJson("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (res?.token) setToken(res.token);
  return res;
}

export async function login(payload: { email: string; password: string }) {
  const res = await callJson("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (res?.token) setToken(res.token);
  return res;
}

export async function me() {
  return callJson("/auth/me", { method: "GET" });
}

export async function logout() {
  setToken(null);
}

/* ---------- DOCUMENTS ---------- */

export async function uploadFile(file: File, title?: string) {
  const fd = new FormData();
  fd.append("file", file);
  if (title) fd.append("title", title);
  return callForm("/upload", fd);
}

export async function getDocuments() {
  return callJson("/documents", { method: "GET" });
}

export async function deleteDocument(id: string) {
  return callJson(`/documents/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/* ---------- QA ---------- */

export async function answer(question: string, top_k = 6, length = "short") {
  return callJson("/answer", {
    method: "POST",
    body: JSON.stringify({ question, top_k, length }),
  });
}

export async function summarize(payload: { question?: string; doc_id?: string }, top_k = 10, length = "short") {
  return callJson("/summarize", {
    method: "POST",
    body: JSON.stringify({ ...payload, top_k, length }),
  });
}

export async function generateQuiz(payload: { question?: string; doc_id?: string }, q_type = "mcq", count = 5, top_k = 10) {
  return callJson("/generate_quiz", {
    method: "POST",
    body: JSON.stringify({ ...payload, q_type, count, top_k }),
  });
}

export default {
  register,
  login,
  me,
  logout,
  uploadFile,
  getDocuments,
  deleteDocument,
  answer,
  summarize,
  generateQuiz,
  _setToken: setToken,
  _getToken: getToken,
};
