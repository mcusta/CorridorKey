# CorridorKey Web App — Phase Tracker

## Overview

Building a private internal MVP web app around CorridorKey.
Each phase is designed to be done in a separate chat session with clean context.

---

## Phase 1 — Build All Code
**Status: COMPLETE**

Write all code for the web app, worker, and database schema.

- [x] Supabase schema SQL (`supabase/schema.sql`)
- [x] Scaffold Next.js app with Tailwind dark theme
- [x] Supabase client helpers (anon + service_role)
- [x] TypeScript types + constants
- [x] Auth middleware + login page
- [x] Job creation API routes (`POST`, `PATCH`, `GET`)
- [x] Signed upload URL route (`POST /api/upload`)
- [x] Job detail + files API routes
- [x] FileUploader component (drag-drop + signed URL upload)
- [x] NewJobForm component (2-step: config → upload)
- [x] Jobs list page + JobCard + StatusBadge
- [x] Job detail page + OutputPreview + DownloadButton
- [x] GPU worker: `worker.py`, `job_processor.py`, `supabase_client.py`, `frame_utils.py`
- [x] ARCHITECTURE.md + .env.example files + worker README
- [x] Next.js build passes clean

**Report:** `docs/webapp/PHASE1_REPORT.md`

---

## Phase 2 — Connect Supabase + Test Web App
**Status: COMPLETE**

Connect to real Supabase project and test the web app locally.

- [x] Run `supabase/schema.sql` in Supabase SQL Editor
- [x] Create `job-assets` private storage bucket
- [x] Set storage policies (authenticated upload, service_role bypass)
- [x] Create user account in Supabase Auth dashboard
- [x] Fill in `web/.env.local` with real keys
- [x] Run `npm run dev` and test login
- [x] Test job creation flow (draft → upload → queued)
- [x] Verify job appears in jobs list
- [x] Verify signed upload URLs work
- [x] Fix any issues found

**Report:** `docs/webapp/PHASE2_REPORT.md`

---

## Phase 3 — GPU Worker Test
**Status: NEXT**

Deploy worker to a GPU machine and test end-to-end processing.

- [ ] Set up Runpod (or equivalent) with 24GB+ VRAM
- [ ] Clone repo, install deps, download CorridorKey model weights
- [ ] Configure `worker/.env` with Supabase keys
- [ ] Run `python worker.py`
- [ ] Submit a real job through web UI
- [ ] Verify: queued → preparing → processing → uploading → completed
- [ ] Verify output files appear in Supabase Storage
- [ ] Verify comp PNG preview works in web UI
- [ ] Verify download works
- [ ] Test error handling (kill worker mid-job, verify stale recovery)

---

## Phase 4 — Fix + Polish
**Status: PENDING**

Fix whatever breaks in Phase 2-3 and polish the experience.

- [ ] Fix any upload/download edge cases
- [ ] Fix any auth/session issues
- [ ] Tune polling intervals
- [ ] Improve error messages shown to user
- [ ] Test with different video formats/sizes
- [ ] Verify progress bar updates correctly

---

## Phase 5 — Deploy for Real
**Status: PENDING**

Production deployment.

- [ ] Deploy web app to Vercel (or similar)
- [ ] Set up worker as persistent service on Runpod
- [ ] Final end-to-end verification
- [ ] Document any production-specific config

---

## Key Files Reference

| Component | Key Files |
|-----------|-----------|
| DB Schema | `supabase/schema.sql` |
| Web App | `web/src/` (Next.js App Router) |
| API Routes | `web/src/app/api/jobs/route.ts`, `web/src/app/api/upload/route.ts` |
| Worker | `worker/worker.py`, `worker/job_processor.py` |
| Architecture | `ARCHITECTURE.md` |
| Plan | `docs/webapp/PLAN.md` |
| Phase Reports | `docs/webapp/PHASE{N}_REPORT.md` |
