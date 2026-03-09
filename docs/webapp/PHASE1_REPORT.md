# Phase 1 — Implementation Report

**Status:** COMPLETE
**Date:** 2026-03-09

---

## What Was Built

35 files created across 3 components. Next.js build passes clean with zero errors.

### Web App (`web/`) — Next.js 16 + TypeScript + Tailwind

**Pages (4):**
- `src/app/login/page.tsx` — Email/password login via Supabase Auth
- `src/app/jobs/page.tsx` — Job list with auto-refresh every 5s
- `src/app/jobs/new/page.tsx` — 2-step job creation (config → upload)
- `src/app/jobs/[id]/page.tsx` — Job detail with progress, preview, download

**API Routes (5):**
- `POST /api/jobs` — Create draft job
- `PATCH /api/jobs` — Flip draft → queued after uploads
- `GET /api/jobs` — List user's jobs
- `GET /api/jobs/[id]` — Single job with files
- `GET /api/jobs/[id]/files` — Signed download URLs for outputs
- `POST /api/upload` — Generate signed upload URL for Storage

**Components (8):**
- `Navbar.tsx` — Top nav with sign out
- `JobCard.tsx` — Job summary card for list view
- `StatusBadge.tsx` — Colored status pill (draft/queued/processing/completed/failed)
- `FileUploader.tsx` — Drag-drop file upload via server-generated signed URLs
- `NewJobForm.tsx` — 2-step form: config sliders → file uploads
- `JobProgress.tsx` — Progress bar (frame X of Y)
- `OutputPreview.tsx` — Grid of comp PNGs with lightbox
- `DownloadButton.tsx` — Download outputs by type (matte/fg/processed/comp)

**Lib (4):**
- `lib/supabase/client.ts` — Browser client (anon key only)
- `lib/supabase/server.ts` — Server client (service_role) + admin client
- `lib/types.ts` — Job, JobFile, JobConfig TypeScript types
- `lib/constants.ts` — Status labels, colors, terminal statuses

**Middleware:**
- `middleware.ts` — Redirects unauthenticated users to `/login`

### Worker (`worker/`) — Python

- `worker.py` — Main entry: poll loop, engine init (once), graceful SIGINT/SIGTERM shutdown, stale job recovery on startup
- `job_processor.py` — Full pipeline: download → extract frames → inference (mirrors `clip_manager.py:611-733`) → upload → complete
- `supabase_client.py` — DB/storage helpers: atomic claiming, heartbeat, progress updates, file upload/download
- `frame_utils.py` — Video → frame extraction via OpenCV VideoCapture

### Database (`supabase/schema.sql`)

- `jobs` table: 16 columns including draft status, worker_id, heartbeat tracking
- `job_files` table: single source of truth for all file references
- RLS policies: users see only own jobs
- Indexes: queued job polling, stale heartbeat detection
- `updated_at` auto-trigger

### Documentation

- `ARCHITECTURE.md` — System overview, security model, run instructions
- `.env.example` — Root env template
- `web/.env.local.example` — Web app env template
- `worker/.env.example` — Worker env template
- `worker/README.md` — Runpod setup instructions

---

## Security Decisions Implemented

1. **Service role key isolation** — Browser only sees anon key. All Storage operations go through server-generated signed URLs. `SUPABASE_SERVICE_ROLE_KEY` is never in a `NEXT_PUBLIC_*` variable.

2. **Single source of truth** — `job_files` table is the only place file locations are stored. No `output_paths` jsonb on the `jobs` table.

3. **Atomic job claiming** — Worker uses `UPDATE ... WHERE status='queued'` guard with `worker_id`, `claimed_at`, `last_heartbeat`. Race-safe even with multiple workers.

4. **Stale job recovery** — On startup, worker marks jobs with stale heartbeats (>5min) as failed.

5. **Draft → queued flow** — DB row created before uploads (no orphaned files). Status only flips to `queued` after both files are confirmed uploaded.

---

## Build Verification

```
$ npx next build
✓ Compiled successfully
✓ Generating static pages (9/9)

Route (app)
├ ○ /login
├ ○ /jobs
├ ○ /jobs/new
├ ƒ /jobs/[id]
├ ƒ /api/jobs
├ ƒ /api/jobs/[id]
├ ƒ /api/jobs/[id]/files
├ ƒ /api/upload
```

Zero TypeScript errors. Zero build warnings (except Next.js middleware deprecation notice — cosmetic only).

---

## File Inventory

```
supabase/schema.sql
web/src/app/layout.tsx
web/src/app/page.tsx
web/src/app/globals.css
web/src/app/login/page.tsx
web/src/app/jobs/page.tsx
web/src/app/jobs/new/page.tsx
web/src/app/jobs/[id]/page.tsx
web/src/app/api/jobs/route.ts
web/src/app/api/jobs/[id]/route.ts
web/src/app/api/jobs/[id]/files/route.ts
web/src/app/api/upload/route.ts
web/src/lib/supabase/client.ts
web/src/lib/supabase/server.ts
web/src/lib/types.ts
web/src/lib/constants.ts
web/src/components/Navbar.tsx
web/src/components/JobCard.tsx
web/src/components/StatusBadge.tsx
web/src/components/FileUploader.tsx
web/src/components/NewJobForm.tsx
web/src/components/JobProgress.tsx
web/src/components/OutputPreview.tsx
web/src/components/DownloadButton.tsx
web/src/middleware.ts
web/.env.local.example
worker/worker.py
worker/job_processor.py
worker/supabase_client.py
worker/frame_utils.py
worker/requirements.txt
worker/.env.example
worker/README.md
ARCHITECTURE.md
.env.example
```

---

## What's Next (Phase 2)

Connect to real Supabase project and test the web app locally.
See `docs/webapp/PHASES.md` for the full phase tracker.

**Prerequisites for Phase 2:**
1. Supabase project URL
2. Anon key
3. Service role key
4. Run `supabase/schema.sql` in SQL Editor
5. Create `job-assets` private storage bucket
6. Create user account in Supabase Auth
