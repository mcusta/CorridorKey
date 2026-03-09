import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { STORAGE_BUCKET } from "@/lib/constants";

// GET /api/jobs/[id]/files — get signed download URLs for job output files
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceClient();

  // Verify ownership
  const { data: job, error: jobError } = await admin
    .from("jobs")
    .select("user_id")
    .eq("id", id)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.user_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Get output files
  const { data: files, error: filesError } = await admin
    .from("job_files")
    .select("*")
    .eq("job_id", id)
    .in("file_type", ["matte", "fg", "processed", "comp"])
    .order("file_type")
    .order("frame_number", { ascending: true, nullsFirst: false });

  if (filesError) {
    return NextResponse.json({ error: filesError.message }, { status: 500 });
  }

  if (!files || files.length === 0) {
    return NextResponse.json([]);
  }

  // Generate signed URLs (1 hour expiry)
  const signedFiles = await Promise.all(
    files.map(async (file: { storage_path: string; file_name: string; file_type: string; frame_number: number | null }) => {
      const { data } = await admin.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(file.storage_path, 3600);

      return {
        file_name: file.file_name,
        file_type: file.file_type,
        frame_number: file.frame_number,
        url: data?.signedUrl || null,
      };
    })
  );

  return NextResponse.json(signedFiles);
}
