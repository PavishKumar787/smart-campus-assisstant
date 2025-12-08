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
    <div
      className="min-h-screen flex flex-col
                 bg-gradient-to-br from-[#2a0056] via-[#19002f] to-[#050013]
                 text-white"
    >
      {/* Header in a glass card */}
      <div className="px-4 md:px-10 pt-4 pb-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl 
                        shadow-[0_18px_45px_rgba(0,0,0,0.6)] px-5 py-3">
          <Header
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
            onProfile={() => navigate("/profile")}
          />
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 px-4 md:px-10 pb-8 flex flex-col gap-6 relative">
        {/* Top hero / intro row */}
        <section className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-pink-300">
              Your AI workspace
            </p>
            <h1 className="text-2xl md:text-3xl font-bold leading-tight">
              Smart Campus Assistant{" "}
              <span className="text-pink-400">Home</span>
            </h1>
            <p className="text-sm text-purple-100/80 max-w-xl">
              Upload PDFs, explore your documents, ask questions, generate
              summaries and quizzes – all in one intelligent panel.
            </p>
          </div>

          <div className="flex md:justify-end">
            <div
              className="w-full md:w-64 rounded-2xl border border-pink-400/40 
                         bg-gradient-to-br from-pink-500/30 via-purple-700/40 to-blue-500/30
                         px-4 py-3 text-sm shadow-[0_15px_40px_rgba(0,0,0,0.7)]"
            >
              <p className="text-[11px] uppercase tracking-[0.3em] text-pink-200/90 mb-1">
                Workspace status
              </p>
              <p className="text-sm font-medium">
                {hasUploadedFiles ? (
                  <>
                    <span className="text-emerald-200 font-semibold">
                      Documents connected
                    </span>{" "}
                    – start chatting with your notes.
                  </>
                ) : (
                  <>
                    <span className="text-amber-200 font-semibold">
                      No documents yet
                    </span>{" "}
                    – upload a PDF to begin.
                  </>
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Documents button (like ChatGPT history) */}
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-full shadow 
                     bg-white/10 border border-white/20 text-xs font-medium
                     text-purple-100 w-max"
          onClick={() => setSidebarOpen(true)}
        >
          <PanelLeftOpen className="w-4 h-4" />
          Documents
        </button>

        {/* Main grid: upload + chat */}
        {!hasUploadedFiles ? (
          // First-time view: big upload card centered
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 
                            backdrop-blur-xl shadow-[0_18px_45px_rgba(0,0,0,0.6)] p-6 text-center">
              <FileUpload
                onUploaded={handleUploadSuccess}
                onUploadSuccess={handleUploadSuccess}
              />
              <p className="text-sm text-purple-100/80 mt-4">
                Upload your PDF documents to start asking questions, generating
                summaries, and building quizzes.
              </p>
            </div>
          </div>
        ) : (
          // Normal workspace view
          <section className="flex-1 grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] gap-6">
            {/* Left: upload + small docs info */}
            <div className="flex flex-col gap-4">
              <div
                className="rounded-2xl border border-white/10 bg-white/5 
                           backdrop-blur-xl shadow-[0_18px_45px_rgba(0,0,0,0.6)]"
              >
                <FileUpload
                  onUploaded={handleUploadSuccess}
                  onUploadSuccess={handleUploadSuccess}
                />
              </div>

              <div
                className="rounded-2xl border border-white/10 bg-white/5 
                           backdrop-blur-xl shadow-[0_18px_45px_rgba(0,0,0,0.6)] p-3 text-xs"
              >
                <div className="text-purple-100/90 mb-1 font-semibold">
                  Active document
                </div>
                <div className="text-[13px] text-purple-100/80">
                  {selectedDoc
                    ? selectedDoc.title ??
                      selectedDoc.filename ??
                      "Untitled document"
                    : "Open the Documents panel to pick a file, or ask about any uploaded document."}
                </div>
              </div>
            </div>

            {/* Right: Chat panel */}
            <div
              className="rounded-2xl border border-white/10 bg-white/5 
                         backdrop-blur-xl shadow-[0_18px_45px_rgba(0,0,0,0.6)]
                         min-h-[380px] flex flex-col"
            >
              <ChatBox />
            </div>
          </section>
        )}

        {/* Slide-over documents panel */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 flex">
            {/* Backdrop */}
            <div
              className="flex-1 bg-black/40"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Panel */}
            <div
              className="w-80 max-w-[80%] h-full bg-[#0b0217] text-white 
                         shadow-xl flex flex-col border-l border-purple-500/40"
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-purple-500/40 bg-white/5">
                <span className="text-sm font-semibold">Documents</span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 rounded hover:bg-white/10"
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
