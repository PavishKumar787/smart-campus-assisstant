// src/components/DocumentList.tsx
import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { FileText, X } from "lucide-react";
import { toast } from "react-toastify";

/** exported type */
export type DocItem = {
  _id?: string;
  file_id?: string;
  title?: string;
  filename?: string;
  num_pages?: number;
  num_chunks?: number;
};

type Props = {
  onSelect?: (doc: DocItem) => void;
  showRemove?: boolean;
  /** when this value changes, list will reload */
  reloadKey?: number;
};

export default function DocumentList({
  onSelect,
  showRemove = false,
  reloadKey,
}: Props) {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDocuments();
      const list = Array.isArray(res) ? res : res?.documents ?? res?.docs ?? [];
      if (!Array.isArray(list)) throw new Error("Invalid documents response");
      setDocs(list);
    } catch (err: any) {
      console.error("Failed to load documents", err);
      setError(err?.message || "Failed to load documents");
      toast.error("Failed to load documents: " + (err?.message ?? ""));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [reloadKey]);

  const handleSelect = (doc: DocItem) => onSelect?.(doc);

  const handleRemove = async (doc: DocItem) => {
    if (!doc?._id && !doc?.file_id) return;
    if (!confirm("Remove this document? This cannot be undone.")) return;

    try {
      const id = doc._id ?? doc.file_id;
      if (id) {
        try {
          await api.deleteDocument(id);
          toast.success("Removed from server");
        } catch (e) {
          console.warn("Server delete failed", e);
          toast.info("Removed locally");
        }
      }
      setDocs((prev) => prev.filter((d) => d !== doc));
    } catch (err: any) {
      console.error(err);
      toast.error("Delete failed: " + (err?.message || ""));
    }
  };

  return (
    <div
      className="p-3 rounded-2xl h-full flex flex-col
                 bg-white/5 text-purple-50
                 border border-white/10
                 shadow-[0_12px_30px_rgba(0,0,0,0.45)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold tracking-wide text-purple-100">
          Documents
        </h3>

        <button
          onClick={load}
          className="text-[11px] px-3 py-1 rounded-full transition
                     bg-white/10 text-purple-100 border border-white/20
                     hover:bg-white/15"
        >
          Refresh
        </button>
      </div>

      {/* States */}
      {loading && (
        <div className="text-sm text-purple-200/80">Loading...</div>
      )}

      {error && (
        <div className="text-sm text-red-400">Error: {error}</div>
      )}

      {!loading && docs.length === 0 && (
        <div className="text-sm text-purple-200/80">
          No documents uploaded yet.
        </div>
      )}

      {/* Document list */}
      <div className="space-y-2 overflow-y-auto mt-1">
        {docs.map((d, i) => {
          const key = d._id ?? d.file_id ?? `doc_${i}`;
          const title =
            d.title ?? (d.filename ? d.filename.split("/").pop() : "Untitled");
          const pages =
            typeof d.num_pages === "number" ? `${d.num_pages} pages` : "";

          return (
            <div
              key={key}
              className="flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition
                         bg-white/5 hover:bg-white/10
                         border border-white/10"
              onClick={() => handleSelect(d)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSelect(d);
              }}
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-pink-300" />

                <div>
                  <div className="text-sm font-medium text-purple-50">
                    {title}
                  </div>
                  <div className="text-[11px] text-purple-200/80">
                    {pages}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {showRemove && (
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      handleRemove(d);
                    }}
                    title="Remove"
                    className="p-1 rounded-full transition
                               hover:bg-white/10"
                  >
                    <X className="h-4 w-4 text-purple-200" />
                  </button>
                )}

                <div className="text-[11px] text-purple-300/80">
                  #{i + 1}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
