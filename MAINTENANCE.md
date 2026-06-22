# Maintaining the Leibinger → VideoJet app

## The short version
It mostly runs itself. The **only** thing that can take it offline is the free
**Supabase project pausing after ~1 week of no use**. Keep it used (or upgrade),
and you're fine. Everything else is occasional.

---

## What actually keeps it running (uptime)

| Piece | Needs attention? |
|---|---|
| **Vercel** (hosting) | No — always on, nothing to do. |
| **Supabase** (login + data) | ⚠️ **Yes** — free projects **pause after ~7 days of inactivity**. When paused, login + the team library stop working until you resume it. |
| The code | No — runs as-is. |

**If Supabase pauses:** Supabase dashboard → your project → click **Restore / Resume** (takes ~1 minute). It's back.
**To avoid pausing:** the team using it at least once a week keeps it awake (every login counts as activity). Or upgrade to Supabase **Pro ($25/mo, never pauses)**. Or ask me to set up an automatic **weekly keep-alive ping**.

> Important: the GitHub token expiring does **NOT** take the app down. It only blocks *new updates*. The live app keeps running regardless.

---

## Monthly 2-minute check
1. Open the app, sign in, convert a test `.job`. (Confirms the whole chain works.)
2. **Vercel** dashboard → project: is the latest deployment "Ready"? Any errors?
3. **Supabase** dashboard → is it **Active** (not paused)? Glance at usage (Database < 500 MB, Storage < 1 GB).

## Making changes later
- Just ask me — I edit → commit → push → Vercel rebuilds in ~1–2 min.
- Your GitHub login is cached on your Mac, so normally **no token needed**.
- **If a deploy ever fails with an "authentication" error**, your token expired. Create a fresh fine-grained token (repo `leibinger-to-videojet`, **Contents: Read and write**, longer expiry like 90 days) and I'll re-cache it. One-time, then automatic again.

## Free-tier limits (when you might start paying)
- **Supabase free:** 500 MB database, 1 GB file storage, pauses when idle. Each saved conversion ≈ 50 KB → roughly **20,000 saves** before storage fills.
- **Vercel Hobby:** free, but technically for non-commercial use — heavy company use may eventually prompt **Pro (~$20/mo)**.
- Supabase/Vercel email you (at vorrathep@tomco.co.th) before you hit limits — **watch that inbox**.

## Security & updates
- Every few months, ask me to **update the libraries** (Next.js / React / Supabase) for security patches — I'll bump versions and redeploy.
- Never paste your Supabase **service_role / secret** key or GitHub tokens anywhere public.

## Backups
- **Code:** safely on GitHub (that's your backup of the whole app).
- **Saved conversions (data):** live in Supabase. Free tier keeps limited backups; if the library becomes business-critical, Supabase **Pro** adds daily backups.

## Where everything lives (your logins)
- **GitHub** (code): https://github.com/pvtomco/leibinger-to-videojet
- **Vercel** (hosting): https://vercel.com — team "Tomco System"
- **Supabase** (login + data): https://supabase.com — project `tjnkuapfrysxmuwqfche`
- **Google** (sign-in credentials): https://console.cloud.google.com

## If something breaks — quickest fixes
| Symptom | Most likely cause → fix |
|---|---|
| Can't log in / library won't load | Supabase paused → **Resume it** in the Supabase dashboard |
| Whole site won't load | Failed deploy → check **Vercel** dashboard, or ask me |
| Colleague gets "access denied" | They used a non-@tomco.co.th account → use company email |
| A deploy/update fails | GitHub token expired → make a new one, I'll re-cache |
