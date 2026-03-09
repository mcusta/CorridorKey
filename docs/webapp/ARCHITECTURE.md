# CorridorKey Web App — Architecture

Private internal MVP for running CorridorKey green screen keying jobs via a web UI.

## System Overview

```
┌──────────────┐       ┌──────────────────┐       ┌────────────────┐
│  Next.js App │──────▶│     Supabase     │◀──────│   GPU Worker   │
│  (web/)      │       │  - Auth          │       │  (worker/)     │
│              │       │  - Postgres DB   │       │                │
│              │       │  - Storage (S3)  │       │                │
└──────────────┘       └──────────────────┘       └────────────────┘
```

- **Next.js App** (`web/`): Frontend UI + API routes. Handles auth, job creation, file uploads via signed URLs, job status display, output preview and download.
- **GPU Worker** (`worker/`): Python service running on a Runpod (or similar) machine with 24GB+ VRAM. Polls for queued jobs, downloads files, runs CorridorKey inference, uploads results.
- **Supabase**: Auth (email/password), Postgres (jobs + job_files tables), Storage (private bucket for uploads/outputs).

## Security Model

- Browser only uses the **anon key** (safe for client-side)
- Server API routes use **service_role key** for DB writes and generating signed Storage URLs
- Worker uses **service_role key** for all DB/Storage operations
- All Storage access goes through signed URLs — bucket is private

## Job Flow

```
1. User creates job (POST /api/jobs)         → status: draft
2. Server returns signed upload URLs          → client uploads to Storage
3. User submits job (PATCH /api/jobs)         → status: queued
4. Worker polls and claims job                → status: preparing
5. Worker downloads files, extracts frames    → status: processing
6. Worker runs inference frame-by-frame       → progress updates
7. Worker uploads output files                → status: uploading
8. Worker marks complete                      → status: completed
9. Frontend displays preview + download links
```

## Database

Two tables with RLS enabled:

- `jobs` — job metadata, status, config, progress tracking, worker heartbeat
- `job_files` — single source of truth for all file references (input, alpha, matte, fg, processed, comp)

See `supabase/schema.sql` for the full schema.

## Key Directories

```
web/              Next.js app (frontend + API)
worker/           GPU worker service (Python)
supabase/         Database schema SQL
CorridorKeyModule/  Core inference engine (untouched)
```

## Running Locally

### Web App
```bash
cd web
cp .env.local.example .env.local  # fill in Supabase keys
npm install
npm run dev
```

### Worker
```bash
cd worker
cp .env.example .env              # fill in Supabase keys
pip install -r requirements.txt
python worker.py                  # requires GPU
```

## Deployment

- **Web**: Deploy to Vercel or any Node.js host
- **Worker**: Run on Runpod or equivalent GPU machine (see `worker/README.md`)
- **Supabase**: Run `supabase/schema.sql` in SQL Editor, create `job-assets` storage bucket (private)
