# Phase 2 — Connect Supabase + Test Web App

**Status:** COMPLETE
**Date:** 2026-03-09

---

## What Was Done

Connected the web app to a live Supabase project and verified the full job creation flow end-to-end.

### Supabase Setup (Dashboard)

- Ran `supabase/schema.sql` in SQL Editor — tables, indexes, RLS policies, triggers all created
- Created `job-assets` private storage bucket
- Created user account in Supabase Auth

### Key Discovery: New Supabase API Keys

Supabase has replaced the legacy `anon` / `service_role` JWT keys with a new format:
- **Publishable key** (`sb_publishable_...`) → replaces anon key
- **Secret key** (`sb_secret_...`) → replaces service_role key

These are drop-in replacements — no code changes were needed. The Supabase client libraries accept both formats.

### Environment Configuration

- Created `web/.env.local` with:
  - `NEXT_PUBLIC_SUPABASE_URL` — project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — publishable key (client-side safe)
  - `SUPABASE_SERVICE_ROLE_KEY` — secret key (server-only)

---

## Test Results

| Test | Result |
|------|--------|
| Supabase connection (publishable key) | PASS — DB query returned successfully |
| Supabase connection (secret key) | PASS — storage buckets + auth users listed |
| Auth signInWithPassword | PASS — endpoint responds correctly |
| Login page render | PASS — loads at `/login` |
| Auth middleware redirect | PASS — unauthenticated `/jobs` redirects to `/login` |
| User login | PASS — signed in with real account |
| Job creation (POST /api/jobs) | PASS — draft job created in DB |
| Signed upload URLs (POST /api/upload) | PASS — URLs generated successfully |
| File upload to Storage | PASS — both input + alpha uploaded via signed URLs |
| Draft → Queued transition (PATCH /api/jobs) | PASS — status flipped after uploads confirmed |
| Jobs list page | PASS — job appears with "Queued" status badge |
| Storage verification | PASS — files present under `{job_id}/input/` and `{job_id}/alpha/` |

### Verified Job

```
ID:     0ee44b7c-761d-4119-94c8-9e1fde1d8640
Name:   Shot02-Close
Status: queued
Input:  0ee44b7c-.../input/Shot02-Close.mp4
Alpha:  0ee44b7c-.../alpha/Shot02-Close.mov_alpha_temp.mp4
```

---

## Issues Found

None. All features worked on first attempt with the new Supabase key format.

---

## What's Next (Phase 3)

Deploy the GPU worker to a machine with 24GB+ VRAM and test end-to-end processing:
1. Set up GPU environment (Runpod or equivalent)
2. Clone repo, install deps, download CorridorKey model weights
3. Configure `worker/.env` with Supabase keys
4. Run `python worker.py` and verify it picks up the queued job
5. Verify full pipeline: queued → preparing → processing → uploading → completed
6. Verify output files appear in Storage and are viewable/downloadable in the web UI
