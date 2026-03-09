"use client";

import { useState, useCallback } from "react";

interface FileUploaderProps {
  label: string;
  accept: string;
  jobId: string;
  fileType: "input" | "alpha";
  onUploaded: (storagePath: string) => void;
}

export default function FileUploader({
  label,
  accept,
  jobId,
  fileType,
  onUploaded,
}: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    async (f: File) => {
      setFile(f);
      setError(null);
      setUploading(true);
      setProgress(0);

      try {
        // 1. Get signed upload URL from server
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_id: jobId,
            file_type: fileType,
            file_name: f.name,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to get upload URL");
        }

        const { signed_url, storage_path, token } = await res.json();

        // 2. Upload file to Supabase Storage using signed URL
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", signed_url);
        xhr.setRequestHeader("x-upsert", "true");
        if (token) {
          xhr.setRequestHeader("x-supabase-upload-token", token);
        }

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };

        await new Promise<void>((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error("Upload failed"));
          xhr.send(f);
        });

        setDone(true);
        onUploaded(storage_path);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [jobId, fileType, onUploaded]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-zinc-400 mb-2">
        {label}
      </label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragOver
            ? "border-blue-500 bg-blue-500/5"
            : done
            ? "border-emerald-600 bg-emerald-600/5"
            : "border-zinc-700 hover:border-zinc-600"
        }`}
      >
        {done && file ? (
          <div className="text-sm text-emerald-400">
            {file.name}{" "}
            <span className="text-zinc-500">
              ({(file.size / 1024 / 1024).toFixed(1)} MB)
            </span>
          </div>
        ) : uploading && file ? (
          <div className="space-y-2">
            <div className="text-sm text-zinc-400">{file.name}</div>
            <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-xs text-zinc-500">{progress}%</div>
          </div>
        ) : (
          <>
            <input
              type="file"
              accept={accept}
              onChange={handleChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="text-sm text-zinc-500">
              Drop file here or click to browse
            </div>
            <div className="text-xs text-zinc-600 mt-1">{accept}</div>
          </>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
