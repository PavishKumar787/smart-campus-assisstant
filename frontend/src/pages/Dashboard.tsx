// src/pages/Dashboard.tsx
import React, { useState } from "react";
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        onProfile={() => navigate("/profile")}
      />

      <main className="container mx-auto px-4 py-8 h-[calc(100vh-80px)] flex gap-6">
        {/* Sidebar */}
        <aside className="w-80 space-y-4">
          <div className="p-3 bg-white rounded shadow">
            <div className="text-sm font-medium">Signed in as</div>
            <div className="mt-2 text-sm break-words">
              {user?.name ?? user?.displayName ?? user?.email ?? "Unknown"}
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={async () => {
                  await onLogout();
                }}
                className="px-3 py-2 bg-red-500 text-white rounded"
              >
                Logout
              </button>
              <button
                onClick={() => navigate("/profile")}
                className="px-3 py-2 bg-gray-100 rounded"
              >
                Profile
              </button>
            </div>
          </div>

          <div className="p-3 bg-white rounded shadow">
            <div className="text-sm font-medium mb-2">Upload documents</div>
            <FileUpload
              onUploadSuccess={() => {
                setHasUploaded(true);
              }}
            />
          </div>

          <div>
            <DocumentList
              onSelect={(d) => setSelectedDoc(d)}
              showRemove={true}
            />
          </div>
        </aside>

        {/* Main content */}
        <section className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Assistant</h2>
              <div className="text-xs text-gray-500">
                {selectedDoc
                  ? `Selected: ${selectedDoc.title ?? selectedDoc.filename}`
                  : "Ask questions about your documents"}
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
