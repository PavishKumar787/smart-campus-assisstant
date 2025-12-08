// src/components/FileUpload.tsx
import React, { useCallback, useState, useRef } from "react";
import api from "../lib/api";
import { Upload, FileText, X } from "lucide-react";
import { toast } from "react-toastify";

interface Props {
  onUploaded?: () => void;
  onUploadSuccess?: () => void;
}

const FileUpload: React.FC<Props> = ({ onUploaded, onUploadSuccess }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(e.target.files || []);
    setFiles(chosen);
    if (chosen[0]) setTitle(chosen[0].name.replace(/\.[^.]+$/, ""));
  }, []);

  const upload = async () => {
    if (!files.length) return toast.info("Please choose a file");
    setIsUploading(true);

    try {
      for (const f of files) {
        await api.uploadFile(f, title || f.name);
      }

      toast.success("Uploaded successfully");
      setFiles([]);
      setTitle("");
      onUploaded?.();
      onUploadSuccess?.();
    } catch (err: any) {
      console.error(err);
      toast.error("Upload failed: " + (err.message || String(err)));
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="mt-1">
          <Upload className="h-6 w-6 text-pink-300" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-purple-50">
            Upload PDF
          </div>
          <div className="text-xs text-purple-200/80">
            Drag & drop or choose a PDF. Give a friendly title for easy
            identification.
          </div>
        </div>
      </div>

      {/* File Input */}
      <div className="mt-3">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          multiple
          onChange={onSelect}
          className="hidden"
          id="file-input"
        />

        <label
          htmlFor="file-input"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer text-xs font-medium
                     bg-white/10 border border-white/20 text-purple-100
                     hover:bg-white/15 hover:border-white/30 transition"
        >
          Choose files
        </label>
      </div>

      {/* Selected Files */}
      <div className="mt-3 space-y-2">
        {files.map((f, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-3 py-2 rounded-xl transition
                       bg-white/5 hover:bg-white/10 border border-white/10"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-pink-300" />
              <div>
                <div className="text-sm text-purple-50">{f.name}</div>
                <div className="text-[11px] text-purple-200/80">
                  {(f.size / 1024).toFixed(1)} KB
                </div>
              </div>
            </div>

            <button
              onClick={() =>
                setFiles((prev) => prev.filter((_, idx) => idx !== i))
              }
              className="p-1 rounded-full transition hover:bg-white/10"
            >
              <X className="h-4 w-4 text-purple-200" />
            </button>
          </div>
        ))}
      </div>

      {/* Title + Upload Button */}
      <div className="mt-3 flex flex-col sm:flex-row gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Document title (optional)"
          className="flex-1 px-3 py-2 rounded-xl text-sm
                     bg-black/30 border border-white/20
                     text-purple-50 placeholder:text-purple-200/60
                     focus:outline-none focus:ring-2 focus:ring-pink-500/70"
        />

        <button
          onClick={upload}
          disabled={isUploading}
          className="sm:w-auto w-full px-4 py-2 rounded-full text-sm font-semibold
                     bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500
                     hover:brightness-110 text-white
                     shadow-[0_10px_25px_rgba(236,72,153,0.45)]
                     disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {isUploading ? "Uploading..." : "Upload"}
        </button>
      </div>
    </div>
  );
};

export default FileUpload;
