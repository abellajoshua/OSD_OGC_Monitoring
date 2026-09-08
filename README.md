# OSD_OGC_Monitoring
OSD_OGC_Monitoring is a web-based system designed to centralize and monitor OSD and OGC activities. It supports efficient tracking of programs, documents, and reports, ensuring organized records, improved coordination, and timely monitoring for decision-making and compliance.

## Run locally
1. Install dependencies:
   - `npm install`
2. Start the server:
   - `npm start`
3. Open the app in your browser:
   - `http://localhost:3000`

## Supabase setup (required for local + GitHub Pages + Vercel)
1. Create a Supabase project.
2. Run the SQL in `supabase_schema.sql` to create tables.
3. For GitHub Pages (client-side DB access), run `supabase_policies.sql`.
4. Add environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`
   - For local dev, you can place them in `.env` (see `.env.example`).

## Fresh database reset (preserve accounts)
If you need to reset all operational records while keeping account data:
1. Run `supabase_reset_fresh.sql`.
2. Run `supabase_policies.sql` again (policies are recreated after table rebuild).
3. Verify that `public.user_accounts` and `public.organizations` still contain your account mappings.
4. Optional test data: run `supabase_seed_2024_2025.sql` to seed AY 2024-2025 records
   for First/Second/Summer with variable counts (5/3/2 per module).

## RBAC / permissions migration
If your database was set up before the coordinator/head access fix, run `supabase_rbac_migration.sql`
in the Supabase SQL editor. It is idempotent (safe to re-run) and, unlike `supabase_full_setup.sql`,
does **not** truncate any table. It corrects head accounts to read across all organizations (matching
`public.can_access_all_organizations()`) and tightens `user_accounts` reads to each account's own row.

## Deploy to GitHub Pages
1. Push to `main`.
2. In GitHub repo settings, open **Pages**.
3. Set **Source** to **GitHub Actions**.
4. The workflow in `.github/workflows/github-pages.yml` deploys the `public/` folder.
5. Update `public/runtime-config.js` with your Supabase URL + ANON key.

## Deploy to Vercel
1. Import this repo in Vercel.
2. Set **Build Command** to blank and **Output Directory** to the project root.
3. Add environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy.

## Verify required Vercel env vars
1. In Vercel Dashboard, open your project.
2. Go to **Settings** -> **Environment Variables**.
3. Confirm these exact keys exist:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. After changes, redeploy the project.
5. Optional CLI check:
   - `vercel env ls`
6. Runtime check (admin only):
   - Open Admin page and it will call `/api/env-status`.
   - If anything is missing, a warning banner is shown.

## Notes
- The “Print / Save PDF” button uses the browser print dialog.
- Static files are served from `public/`.
- GitHub Pages is static hosting; this project now reads/writes data directly to Supabase from the browser.
