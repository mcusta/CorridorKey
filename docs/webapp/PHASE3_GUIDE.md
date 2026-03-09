# Phase 3 — GPU Worker Test Guide

## Overview

Deploy the Python worker to a RunPod GPU instance, connect it to Supabase, and process the queued "Shot02-Close" job end-to-end.

---

## What Mutlu Does (Before Phase 3 Chat)

### 1. Create RunPod Account
- Go to https://www.runpod.io and sign up
- Add **$5–10** in credits (Settings → Billing → Add Credits)

### 2. Create a GPU Pod
- Go to **Pods → Deploy**
- Pick **Community Cloud** (cheaper)
- GPU: **RTX 4090 (24GB)** — or RTX 3090 if 4090 is unavailable
- Template: **RunPod Pytorch 2.x** (comes with CUDA + Python pre-installed)
- Container disk: **30GB** (need space for model weights ~1.5GB + video frames)
- Volume disk: **0GB** (not needed, we're not persisting between runs)
- Click **Deploy**

### 3. Connect to the Pod
- Once running, click **Connect → Start Web Terminal** (or use SSH)
- You'll get a terminal on the GPU machine

### 4. Clone the Repo
```bash
git clone https://github.com/cmoyates/CorridorKey.git
cd CorridorKey
```

### 5. Install Worker Dependencies
```bash
cd worker
pip install -r requirements.txt
```

### 6. Download Model Weights
The CorridorKey checkpoint needs to be at `CorridorKeyModule/checkpoints/CorridorKey_v1.0.pth`.
```bash
cd /workspace/CorridorKey
# Follow the model download instructions from the main README
# (Google Drive or HuggingFace link)
```

### 7. Create Worker Env File
```bash
cat > worker/.env << 'EOF'
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-secret-key-here
CORRIDORKEY_DEVICE=cuda
CORRIDORKEY_BACKEND=torch
WORKER_ID=worker-runpod-01
TEMP_DIR=/tmp/ck_jobs
HEARTBEAT_STALE_MINUTES=5
EOF
```

### 8. Tell Claude "Do Phase 3"
- Open a new chat
- Say: **"Do Phase 3. I have a RunPod pod running with the repo cloned."**
- Claude will review the worker code, help you run it, and troubleshoot

---

## What Claude Does (During Phase 3 Chat)

1. Read phase docs + previous reports for context
2. Review worker code (`worker.py`, `job_processor.py`, etc.)
3. Verify worker dependencies and imports are correct
4. Help run `python worker.py` and debug any issues
5. Monitor job status progression: queued → preparing → processing → uploading → completed
6. Verify output files in Supabase Storage
7. Verify web UI shows results (preview + download)
8. Test error handling if time permits
9. Write `PHASE3_REPORT.md` and update `PHASES.md`

---

## Expected Job Flow

```
Worker starts
  → Recovers any stale jobs (heartbeat > 5min)
  → Polls for queued jobs every 5s
  → Finds "Shot02-Close" job
  → Claims it (status: preparing)
  → Downloads input.mp4 + alpha.mp4 from Supabase Storage
  → Extracts frames via OpenCV
  → Loads CorridorKey engine (takes ~10-20s, uses ~22.7GB VRAM)
  → Processes frames one by one (status: processing, progress updates)
  → Uploads outputs to Storage (status: uploading)
  → Inserts job_files rows for each output
  → Marks job completed
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `CUDA out of memory` | Scale up to A40 (48GB) — just stop pod, deploy new one |
| `ModuleNotFoundError` | Missing pip package — install it |
| `Checkpoint not found` | Model weights not downloaded to correct path |
| `Connection refused` (Supabase) | Check `worker/.env` has correct URL and key |
| Worker hangs on poll | Check Supabase `jobs` table has a row with `status=queued` |

---

## Cost Estimate

| Item | Cost |
|------|------|
| RunPod RTX 4090, ~1hr setup + test | ~$0.34 |
| Processing one job (~10-30min) | ~$0.06–0.17 |
| **Total Phase 3** | **< $1.00** |

Stop the pod immediately after testing to avoid charges.

---

## Checklist

- [ ] RunPod account created + credits added
- [ ] GPU pod deployed (RTX 4090 or equivalent)
- [ ] Repo cloned on pod
- [ ] Worker deps installed
- [ ] Model weights downloaded
- [ ] `worker/.env` configured
- [ ] Worker runs and picks up queued job
- [ ] Job completes successfully
- [ ] Output files visible in Supabase Storage
- [ ] Web UI shows completed job with preview + download
- [ ] Phase 3 report written
