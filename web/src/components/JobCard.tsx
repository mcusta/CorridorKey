import Link from "next/link";
import StatusBadge from "./StatusBadge";
import JobProgress from "./JobProgress";
import type { Job } from "@/lib/types";

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function JobCard({ job }: { job: Job }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{job.name}</div>
          <div className="text-xs text-zinc-500 mt-1">
            {timeAgo(job.created_at)}
          </div>
        </div>
        <StatusBadge status={job.status} />
      </div>

      {(job.status === "processing" || job.status === "uploading") &&
        job.total_frames && (
          <div className="mt-3">
            <JobProgress
              processed={job.processed_frames}
              total={job.total_frames}
            />
          </div>
        )}

      {job.status === "failed" && job.error_message && (
        <div className="mt-2 text-xs text-red-400 truncate">
          {job.error_message}
        </div>
      )}
    </Link>
  );
}
