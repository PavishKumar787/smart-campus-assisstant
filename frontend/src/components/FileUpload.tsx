// src/components/FileUpload.tsx
import React, { useCallback, useState, useRef } from "react";
import api from "../lib/api";
import { Upload, FileText, X } from "lucide-react";
import { toast } from "react-toastify";

interface Props {
  onUploaded?: () => void; // existing callback
  onUploadSuccess?: () => void; // alias used elsewhere
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
    <div className="w-full max-w-2xl mx-auto">
      <div className="p-4 border rounded-lg bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <Upload className="h-6 w-6 text-blue-600" />
          <div className="flex-1">
            <div className="text-sm font-medium">Upload PDF</div>
            <div className="text-xs text-gray-500">Drag & drop or choose a PDF. Give a friendly title for easy identification.</div>
          </div>
        </div>

        <div className="mt-3">
          <input ref={inputRef} type="file" accept=".pdf" multiple onChange={onSelect} className="hidden" id="file-input"/>
          <label htmlFor="file-input" className="inline-block px-4 py-2 border rounded cursor-pointer text-sm bg-gray-50 hover:bg-gray-100">
            Choose files
          </label>
        </div>

        <div className="mt-3 space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-red-500"/>
                <div>
                  <div className="text-sm">{f.name}</div>
                  <div className="text-xs text-gray-500">{(f.size / 1024).toFixed(1)} KB</div>
                </div>
              </div>
              <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} className="p-1">
                <X className="h-4 w-4 text-gray-500"/>
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title (optional)" className="flex-1 px-3 py-2 border rounded" />
          <button onClick={upload} disabled={isUploading} className="px-4 py-2 bg-blue-600 text-white rounded">
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FileUpload;
