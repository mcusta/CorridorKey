import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// GET /api/jobs — list all jobs for current user
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceClient();
  const { data, error } = await admin
    .from("jobs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/jobs — create a new job (status: draft)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, config } = body;

  if (!name) {
    return NextResponse.json({ error: "Job name is required" }, { status: 400 });
  }

  const admin = createServiceClient();
  const { data, error } = await admin
    .from("jobs")
    .insert({
      user_id: user.id,
      name,
      status: "draft",
      config: config || undefined,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// PATCH /api/jobs — flip draft → queued after uploads complete
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, input_storage_path, alpha_storage_path } = body;

  if (!id || !input_storage_path || !alpha_storage_path) {
    return NextResponse.json(
      { error: "id, input_storage_path, and alpha_storage_path are required" },
      { status: 400 }
    );
  }

  const admin = createServiceClient();

  // Verify job belongs to user and is in draft status
  const { data: existing, error: fetchError } = await admin
    .from("jobs")
    .select("id, user_id, status")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (existing.user_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (existing.status !== "draft") {
    return NextResponse.json(
      { error: `Cannot queue job with status '${existing.status}'` },
      { status: 400 }
    );
  }

  const { data, error } = await admin
    .from("jobs")
    .update({
      status: "queued",
      input_storage_path,
      alpha_storage_path,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
