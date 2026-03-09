"use client";

import { useState } from "react";

interface DownloadFile {
  file_name: string;
  file_type: string;
  url: string | null;
}

export default function DownloadButton({ jobId }: { jobId: string }) {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<DownloadFile[] | null>(null);
  const [expanded, setExpanded] = useState(false);

  async function loadFiles() {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/files`);
      const data = await res.json();
      setFiles(data);
      setExpanded(true);
    } catch {
      // ignore
    }
    setLoading(false);
  }

  function downloadFile(url: string, name: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  }

  const fileTypes = ["matte", "fg", "processed", "comp"];

  if (!expanded) {
    return (
      <button
        onClick={loadFiles}
        disabled={loading}
        className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50"
      >
        {loading ? "Loading..." : "Download Outputs"}
      </button>
    );
  }

  if (!files || files.length === 0) {
    return <div className="text-sm text-zinc-500">No output files found.</div>;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-zinc-400">Download by Type</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {fileTypes.map((type) => {
          const typeFiles = files.filter(
            (f) => f.file_type === type && f.url
          );
          if (typeFiles.length === 0) return null;
          return (
            <button
              key={type}
              onClick={() => {
                // Download first file of this type as a sample
                // For full batch, user would iterate
                typeFiles.forEach((f) => {
                  if (f.url) downloadFile(f.url, f.file_name);
                });
              }}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors text-center"
            >
              {type.toUpperCase()}
              <span className="block text-zinc-500 mt-0.5">
                {typeFiles.length} files
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
