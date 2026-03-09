"use client";

import { useState, useEffect } from "react";

interface OutputFile {
  file_name: string;
  file_type: string;
  frame_number: number | null;
  url: string | null;
}

export default function OutputPreview({ jobId }: { jobId: string }) {
  const [files, setFiles] = useState<OutputFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<OutputFile | null>(null);

  useEffect(() => {
    fetch(`/api/jobs/${jobId}/files`)
      .then((r) => r.json())
      .then((data) => {
        setFiles(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [jobId]);

  const compFiles = files.filter((f) => f.file_type === "comp" && f.url);

  if (loading) {
    return (
      <div className="text-sm text-zinc-500 py-4">Loading outputs...</div>
    );
  }

  if (compFiles.length === 0) {
    return (
      <div className="text-sm text-zinc-500 py-4">No output files yet.</div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-zinc-400 mb-3">
        Preview ({compFiles.length} frames)
      </h3>

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8 cursor-pointer"
          onClick={() => setSelected(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selected.url!}
            alt={selected.file_name}
            className="max-w-full max-h-full object-contain"
          />
          <div className="absolute bottom-4 text-xs text-zinc-500">
            {selected.file_name} — click to close
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {compFiles.map((f) => (
          <button
            key={f.file_name}
            onClick={() => setSelected(f)}
            className="aspect-video rounded border border-zinc-800 overflow-hidden hover:border-zinc-600 transition-colors bg-zinc-900"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={f.url!}
              alt={f.file_name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
