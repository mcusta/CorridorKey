#!/usr/bin/env python3
"""
CorridorKey GPU Worker — polls Supabase for queued jobs and runs inference.

Usage:
    python worker.py

Requires:
    - CorridorKey repo in PYTHONPATH (parent directory)
    - CUDA GPU with 24GB+ VRAM
    - Environment variables from .env
"""

import os
import sys
import time
import logging
import signal

# Enable EXR support in OpenCV — must be set before import
os.environ["OPENCV_IO_ENABLE_OPENEXR"] = "1"

from dotenv import load_dotenv

load_dotenv()

# Add CorridorKey repo root to Python path
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from supabase_client import get_client, claim_next_job_fallback, recover_stale_jobs
from job_processor import process_job

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("worker")

# Graceful shutdown
_running = True


def _handle_signal(signum, frame):
    global _running
    logger.info("Received signal %d, shutting down after current job...", signum)
    _running = False


signal.signal(signal.SIGINT, _handle_signal)
signal.signal(signal.SIGTERM, _handle_signal)


def main():
    worker_id = os.environ.get("WORKER_ID", "worker-01")
    stale_minutes = int(os.environ.get("HEARTBEAT_STALE_MINUTES", "5"))
    poll_interval = int(os.environ.get("POLL_INTERVAL", "5"))

    logger.info("Worker '%s' starting...", worker_id)

    # Initialize Supabase client
    client = get_client()

    # Recover stale jobs from previous crashes
    recovered = recover_stale_jobs(client, stale_minutes)
    if recovered:
        logger.info("Recovered %d stale jobs on startup", recovered)

    # Load CorridorKey engine (expensive — ~22.7GB VRAM)
    logger.info("Loading CorridorKey engine...")
    from CorridorKeyModule.backend import create_engine

    device = os.environ.get("CORRIDORKEY_DEVICE", "cuda")
    backend = os.environ.get("CORRIDORKEY_BACKEND", "torch")

    engine = create_engine(backend=backend, device=device)
    logger.info("Engine loaded on %s (%s)", device, backend)

    # Poll loop
    logger.info("Worker ready, polling for jobs every %ds...", poll_interval)

    while _running:
        try:
            job = claim_next_job_fallback(client, worker_id)
            if job:
                logger.info(
                    "Claimed job %s: '%s'", job["id"], job.get("name", "")
                )
                process_job(job, engine, client)
            else:
                time.sleep(poll_interval)
        except KeyboardInterrupt:
            break
        except Exception as e:
            logger.error("Poll loop error: %s", e, exc_info=True)
            time.sleep(poll_interval)

    logger.info("Worker shut down cleanly.")


if __name__ == "__main__":
    main()
