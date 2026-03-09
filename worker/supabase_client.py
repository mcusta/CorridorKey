"""
Supabase client wrapper for the GPU worker.
Uses service_role key to bypass RLS.
"""

import os
import logging
from datetime import datetime, timedelta, timezone

from supabase import create_client, Client

logger = logging.getLogger(__name__)

BUCKET = "job-assets"


def get_client() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


def claim_next_job(client: Client, worker_id: str) -> dict | None:
    """
    Atomically claim the oldest queued job.
    Returns the job dict or None if no jobs available.
    """
    # Use RPC for atomic claim with FOR UPDATE SKIP LOCKED
    result = client.rpc(
        "claim_next_job",
        {"p_worker_id": worker_id},
    ).execute()

    if result.data and len(result.data) > 0:
        return result.data[0]
    return None


def claim_next_job_fallback(client: Client, worker_id: str) -> dict | None:
    """
    Fallback claim without RPC — uses two queries.
    Less atomic but works without the DB function.
    """
    # Find oldest queued job
    result = (
        client.table("jobs")
        .select("*")
        .eq("status", "queued")
        .order("created_at")
        .limit(1)
        .execute()
    )

    if not result.data:
        return None

    job = result.data[0]

    # Try to claim it (status check prevents race)
    update = (
        client.table("jobs")
        .update(
            {
                "status": "preparing",
                "worker_id": worker_id,
                "claimed_at": datetime.now(timezone.utc).isoformat(),
                "last_heartbeat": datetime.now(timezone.utc).isoformat(),
                "started_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .eq("id", job["id"])
        .eq("status", "queued")  # atomic guard
        .execute()
    )

    if update.data and len(update.data) > 0:
        return update.data[0]
    return None


def update_job(client: Client, job_id: str, **fields) -> None:
    """Update job fields."""
    client.table("jobs").update(fields).eq("id", job_id).execute()


def update_progress(
    client: Client, job_id: str, processed_frames: int
) -> None:
    """Update frame progress and heartbeat."""
    client.table("jobs").update(
        {
            "processed_frames": processed_frames,
            "last_heartbeat": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("id", job_id).execute()


def fail_job(client: Client, job_id: str, error_message: str) -> None:
    """Mark job as failed with error message."""
    client.table("jobs").update(
        {
            "status": "failed",
            "error_message": error_message[:4000],  # truncate if huge
        }
    ).eq("id", job_id).execute()


def complete_job(client: Client, job_id: str) -> None:
    """Mark job as completed."""
    client.table("jobs").update(
        {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("id", job_id).execute()


def insert_job_file(
    client: Client,
    job_id: str,
    file_type: str,
    storage_path: str,
    file_name: str,
    frame_number: int | None = None,
) -> None:
    """Insert a job_files row."""
    row = {
        "job_id": job_id,
        "file_type": file_type,
        "storage_path": storage_path,
        "file_name": file_name,
    }
    if frame_number is not None:
        row["frame_number"] = frame_number
    client.table("job_files").insert(row).execute()


def download_file(client: Client, storage_path: str, local_path: str) -> None:
    """Download a file from Supabase Storage to local disk."""
    data = client.storage.from_(BUCKET).download(storage_path)
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    with open(local_path, "wb") as f:
        f.write(data)
    logger.info("Downloaded %s -> %s", storage_path, local_path)


def upload_file(client: Client, local_path: str, storage_path: str) -> None:
    """Upload a local file to Supabase Storage."""
    with open(local_path, "rb") as f:
        file_data = f.read()

    # Determine content type
    ext = os.path.splitext(local_path)[1].lower()
    content_types = {
        ".exr": "image/x-exr",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".mp4": "video/mp4",
    }
    content_type = content_types.get(ext, "application/octet-stream")

    client.storage.from_(BUCKET).upload(
        storage_path,
        file_data,
        {"content-type": content_type, "upsert": "true"},
    )
    logger.debug("Uploaded %s -> %s", local_path, storage_path)


def recover_stale_jobs(client: Client, stale_minutes: int = 5) -> int:
    """
    On worker startup, find jobs stuck in preparing/processing
    with stale heartbeats and mark them as failed.
    Returns count of recovered jobs.
    """
    cutoff = (
        datetime.now(timezone.utc) - timedelta(minutes=stale_minutes)
    ).isoformat()

    # Find stale preparing jobs
    stale = (
        client.table("jobs")
        .select("id")
        .in_("status", ["preparing", "processing"])
        .lt("last_heartbeat", cutoff)
        .execute()
    )

    count = 0
    for job in stale.data or []:
        fail_job(client, job["id"], "Worker crashed or timed out (stale heartbeat)")
        count += 1

    if count:
        logger.warning("Recovered %d stale jobs", count)
    return count
