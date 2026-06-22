# Leibinger → VideoJet Converter (Tomco internal web app)

Converts Leibinger CIJ `.job` files into VideoJet 1580/1880 monochrome BMPs.
Hosted web app with company Google sign-in and a shared, synced team library.

## Stack
- **Next.js 16 / React 19** — the app (deployed on **Vercel**)
- **Supabase** — Google login (locked to `@tomco.co.th`), Postgres (saved-conversion records), Storage (BMP + preview + original `.job`)
- Converter engine in `lib/engine.js` runs **in the browser** (files stay local until you click *Save*)

## How access & data work
- Only `@tomco.co.th` Google accounts can sign in. Enforced in three places: the OAuth callback (`app/auth/callback/route.js`), the proxy (`proxy.js`), and — the real guard — **Row Level Security** in the database (`supabase/schema.sql`).
- Saved conversions are a **shared team library**: everyone signed in sees and adds to the same set. Each item stores the BMP, a preview PNG, the settings, and the original `.job`. Only the person who saved an item can delete it.

## Project layout
```
app/            pages: / (converter+library), /login, /auth/callback
components/      Converter, History, AppShell, GoogleSignIn, SignOutButton
lib/engine.js   the verified .job -> BMP engine
lib/supabase/   browser + server clients, session refresh
lib/domain.js   ALLOWED_DOMAIN = tomco.co.th
proxy.js        Next 16 "proxy" (was "middleware") - session + access control
supabase/schema.sql   run once in Supabase to create the table/storage/policies
```

## Setup (one time)

### 1. Supabase
1. Create a project at https://supabase.com -> **New project**.
2. **SQL Editor -> New query** -> paste all of `supabase/schema.sql` -> **Run**.
3. **Authentication -> Sign In / Providers -> Google** -> enable. Paste the Google **Client ID** and **Client secret** from step 2 below. Copy the **Callback URL** Supabase shows.
4. **Project Settings -> API**: copy the **Project URL** and the **anon public** key.

### 2. Google sign-in
1. https://console.cloud.google.com -> create a project.
2. **APIs & Services -> OAuth consent screen** -> External -> add app name + email.
3. **Credentials -> Create credentials -> OAuth client ID -> Web application**.
4. Under **Authorized redirect URIs**, paste the **Callback URL** from Supabase (step 1.3) — looks like `https://<ref>.supabase.co/auth/v1/callback`.
5. Copy the **Client ID** + **Client secret** into Supabase (step 1.3).

### 3. Environment variables
Copy `.env.local.example` -> `.env.local` and fill in the two values from step 1.4.
The same two go into **Vercel -> Project -> Settings -> Environment Variables**.

### 4. Deploy on Vercel
1. Push this folder to GitHub.
2. https://vercel.com -> **Add New -> Project** -> import the repo.
3. Add the two env vars -> **Deploy**.
4. Copy your Vercel URL into Supabase **Authentication -> URL Configuration** (Site URL + Redirect URLs).

## Local development
```bash
npm install
cp .env.local.example .env.local   # fill in Supabase URL + anon key
npm run dev                         # http://localhost:3000
```
Without `.env.local`, the app runs in **local mode**: conversion + download work, but login and the team library are disabled.
