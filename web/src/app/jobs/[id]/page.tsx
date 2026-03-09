"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import JobProgress from "@/components/JobProgress";
import OutputPreview from "@/components/OutputPreview";
import DownloadButton from "@/components/DownloadButton";
import { TERMINAL_STATUSES } from "@/lib/constants";
import type { Job, JobConfig } from "@/lib/types";

function ConfigDisplay({ config }: { config: JobConfig }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
      <div>
        <span className="text-zinc-500">Despill</span>
        <div className="text-zinc-300 mt-0.5">
          {(config.despill_strength * 10).toFixed(0)}/10
        </div>
      </div>
      <div>
        <span className="text-zinc-500">Refiner</span>
        <div className="text-zinc-300 mt-0.5">
          {config.refiner_scale.toFixed(1)}x
        </div>
      </div>
      <div>
        <span className="text-zinc-500">Despeckle</span>
        <div className="text-zinc-300 mt-0.5">
          {config.auto_despeckle ? "On" : "Off"}
        </div>
      </div>
      <div>
        <span className="text-zinc-500">Input</span>
        <div className="text-zinc-300 mt-0.5">
          {config.input_is_linear ? "Linear" : "sRGB"}
        </div>
      </div>
    </div>
  );
}

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchJob() {
    try {
      const res = await fetch(`/api/jobs/${id}`);
      if (!res.ok) {
        setError("Job not found");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setJob(data);
    } catch {
      setError("Failed to load job");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchJob();

    // Poll while job is in progress
    const interval = setInterval(() => {
      if (job && TERMINAL_STATUSES.includes(job.status)) return;
      fetchJob();
    }, 3000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, job?.status]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-sm text-zinc-500">Loading...</div>
        </main>
      </>
    );
  }

  if (error || !job) {
    return (
      <>
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-sm text-red-400">{error || "Job not found"}</div>
          <Link
            href="/jobs"
            className="text-sm text-zinc-500 hover:text-zinc-300 mt-2 inline-block"
          >
            Back to jobs
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <Link
            href="/jobs"
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Jobs
          </Link>
          <div className="flex items-start justify-between gap-3 mt-2">
            <h1 className="text-lg font-semibold">{job.name}</h1>
            <StatusBadge status={job.status} />
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Created {new Date(job.created_at).toLocaleString()}
            {job.completed_at && (
              <> &middot; Completed {new Date(job.completed_at).toLocaleString()}</>
            )}
          </div>
        </div>

        {/* Config */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
            Settings
          </h2>
          <ConfigDisplay config={job.config} />
        </div>

        {/* Progress */}
        {(job.status === "processing" || job.status === "uploading") &&
          job.total_frames && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <JobProgress
                processed={job.processed_frames}
                total={job.total_frames}
              />
            </div>
          )}

        {/* Error */}
        {job.status === "failed" && job.error_message && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-4">
            <h2 className="text-xs font-medium text-red-400 uppercase tracking-wider mb-1">
              Error
            </h2>
            <p className="text-sm text-red-300 whitespace-pre-wrap">
              {job.error_message}
            </p>
          </div>
        )}

        {/* Outputs */}
        {job.status === "completed" && (
          <div className="space-y-6">
            <OutputPreview jobId={job.id} />
            <DownloadButton jobId={job.id} />
          </div>
        )}
      </main>
    </>
  );
}
