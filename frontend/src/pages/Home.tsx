// src/pages/Home.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import FileUpload from "../components/FileUpload";
import ChatBox from "../components/ChatBox";
import DocumentList, { type DocItem } from "../components/DocumentList";
import { PanelLeftOpen, PanelLeftClose } from "lucide-react";
import api from "../lib/api";

const HAS_DOCS_KEY = "sca_has_docs";

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);
  const [hasUploadedFiles, setHasUploadedFiles] = useState<boolean>(() => {
    try {
      return localStorage.getItem(HAS_DOCS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedDoc, setSelectedDoc] = useState<DocItem | null>(null);

  const navigate = useNavigate();

  // dark mode + check if any docs exist on mount
  useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add("dark");
    }

    (async () => {
      try {
        const res = await api.getDocuments();
        const list = Array.isArray(res)
          ? res
          : res?.documents ?? res?.docs ?? [];

        if (Array.isArray(list) && list.length > 0) {
          setHasUploadedFiles(true);
          try {
            localStorage.setItem(HAS_DOCS_KEY, "1");
          } catch {}
        }
      } catch (err) {
        console.warn("Failed to fetch documents on Home mount", err);
      }
    })();
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem("darkMode", newDarkMode.toString());

    if (newDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleUploadSuccess = () => {
    setHasUploadedFiles(true);
    setReloadKey((k) => k + 1); // tell DocumentList to reload
    try {
      localStorage.setItem(HAS_DOCS_KEY, "1");
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        // ✅ profile button now works again
        onProfile={() => navigate("/profile")}
      />

      <main className="container mx-auto px-4 py-8 h-[calc(100vh-80px)] flex flex-col relative">
        {/* button to open docs panel (like ChatGPT history) */}
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-full shadow bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-800 dark:text-gray-100 w-max mb-4"
          onClick={() => setSidebarOpen(true)}
        >
          <PanelLeftOpen className="w-4 h-4" />
          Documents
        </button>

        {/* main content */}
        {!hasUploadedFiles ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center w-full max-w-xl">
              {/* ⚠️ FileUpload was originally using onUploaded prop */}
              <FileUpload onUploaded={handleUploadSuccess} />
              <p className="text-gray-600 dark:text-gray-400 mt-4">
                Upload your PDF documents to start asking questions
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="mb-4">
              <FileUpload onUploaded={handleUploadSuccess} />
            </div>

            <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
              {selectedDoc
                ? `Selected document: ${
                    selectedDoc.title ??
                    selectedDoc.filename ??
                    "Untitled document"
                  }`
                : "Open the Documents panel to pick a file, or ask about any of your uploads."}
            </div>

            <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <ChatBox />
            </div>
          </div>
        )}

        {/* slide-over documents panel (hidden until you click the button) */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 flex">
            {/* backdrop */}
            <div
              className="flex-1 bg-black/40"
              onClick={() => setSidebarOpen(false)}
            />
            {/* panel */}
            <div className="w-80 max-w-[80%] h-full bg-white dark:bg-gray-900 shadow-xl flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  Documents
                </span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 p-3 overflow-y-auto">
                <DocumentList
                  onSelect={(doc) => {
                    setSelectedDoc(doc);
                    setSidebarOpen(false);
                  }}
                  showRemove={true}
                  reloadKey={reloadKey}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
