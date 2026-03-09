import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { STORAGE_BUCKET } from "@/lib/constants";

// POST /api/upload — generate a signed upload URL for Supabase Storage
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { job_id, file_type, file_name } = body;

  if (!job_id || !file_type || !file_name) {
    return NextResponse.json(
      { error: "job_id, file_type, and file_name are required" },
      { status: 400 }
    );
  }

  if (!["input", "alpha"].includes(file_type)) {
    return NextResponse.json(
      { error: "file_type must be 'input' or 'alpha'" },
      { status: 400 }
    );
  }

  const admin = createServiceClient();

  // Verify job belongs to user
  const { data: job, error: jobError } = await admin
    .from("jobs")
    .select("user_id, status")
    .eq("id", job_id)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.user_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const storagePath = `${job_id}/${file_type}/${file_name}`;

  // Create signed upload URL (valid for 10 minutes)
  const { data, error } = await admin.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    signed_url: data.signedUrl,
    storage_path: storagePath,
    token: data.token,
  });
}
