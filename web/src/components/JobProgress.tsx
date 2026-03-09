export default function JobProgress({
  processed,
  total,
}: {
  processed: number;
  total: number | null;
}) {
  if (!total || total === 0) return null;

  const pct = Math.min(Math.round((processed / total) * 100), 100);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-zinc-400">
        <span>
          Frame {processed} of {total}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
