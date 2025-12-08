// src/pages/Dashboard.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import FileUpload from "../components/FileUpload";
import DocumentList, { type DocItem } from "../components/DocumentList";
import ChatBox from "../components/ChatBox";

export default function Dashboard({
  user,
  onLogout,
}: {
  user: any;
  onLogout: () => Promise<void> | void;
}) {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem("darkMode") === "true";
    } catch {
      return false;
    }
  });

  const [selectedDoc, setSelectedDoc] = useState<DocItem | null>(null);
  const [hasUploaded, setHasUploaded] = useState<boolean>(false);
  const navigate = useNavigate();

  // Ensure <html> gets dark class initially if needed
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    try {
      localStorage.setItem("darkMode", next ? "true" : "false");
      if (next) document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    } catch (e) {
      console.warn("Failed to persist dark mode", e);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col
                 bg-gradient-to-br from-[#2a0056] via-[#19002f] to-[#050013]
                 text-white"
    >
      {/* Header in glass container (same as Home) */}
      <div className="px-4 md:px-10 pt-4 pb-2">
        <Header
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          onProfile={() => navigate("/profile")}
        />
      </div>

      <main className="flex-1 px-4 md:px-10 pb-8 flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <aside className="w-full md:w-80 space-y-4">
          {/* User card */}
          <div
            className="p-4 rounded-2xl bg-white/5 border border-white/10
                       backdrop-blur-xl shadow-[0_14px_40px_rgba(0,0,0,0.6)]"
          >
            <div className="text-xs uppercase tracking-[0.25em] text-pink-200/80 mb-1">
              Signed in as
            </div>
            <div className="text-sm font-semibold text-purple-50 break-words">
              {user?.name ?? user?.displayName ?? user?.email ?? "Unknown user"}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={async () => {
                  await onLogout();
                }}
                className="px-3 py-1.5 rounded-full text-xs font-medium
                           bg-red-500 hover:bg-red-400 text-white
                           shadow-[0_10px_25px_rgba(248,113,113,0.4)]"
              >
                Logout
              </button>
              <button
                onClick={() => navigate("/profile")}
                className="px-3 py-1.5 rounded-full text-xs font-medium
                           bg-white/10 border border-white/20 text-purple-100
                           hover:bg-white/15"
              >
                Profile
              </button>
            </div>
          </div>

          {/* Upload card */}
          <div
            className="p-4 rounded-2xl bg-white/5 border border-white/10
                       backdrop-blur-xl shadow-[0_14px_40px_rgba(0,0,0,0.6)]"
          >
            <div className="text-sm font-semibold text-purple-50 mb-2">
              Upload documents
            </div>
            <FileUpload
              onUploadSuccess={() => {
                setHasUploaded(true);
              }}
              onUploaded={() => setHasUploaded(true)}
            />
            {hasUploaded && (
              <p className="mt-2 text-[11px] text-emerald-200/90">
                New documents uploaded — you can now ask questions about them.
              </p>
            )}
          </div>

          {/* Documents list */}
          <div
            className="rounded-2xl bg-white/5 border border-white/10
                       backdrop-blur-xl shadow-[0_14px_40px_rgba(0,0,0,0.6)] p-3"
          >
            <DocumentList
              onSelect={(d) => setSelectedDoc(d)}
              showRemove={true}
            />
          </div>
        </aside>

        {/* Main content */}
        <section
          className="flex-1 flex flex-col rounded-2xl
                     bg-white/5 border border-white/10
                     backdrop-blur-xl shadow-[0_18px_45px_rgba(0,0,0,0.7)] p-4"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-purple-50">
                Assistant
              </h2>
              <div className="text-xs text-purple-200/80 mt-1">
                {selectedDoc
                  ? `Selected: ${
                      selectedDoc.title ??
                      selectedDoc.filename ??
                      "Untitled document"
                    }`
                  : "Ask questions about any of your uploaded documents."}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <ChatBox />
          </div>
        </section>
      </main>
    </div>
  );
}
