# OSD_OGC_Monitoring
OSD_OGC_Monitoring is a web-based system designed to centralize and monitor OSD and OGC activities. It supports efficient tracking of programs, documents, and reports, ensuring organized records, improved coordination, and timely monitoring for decision-making and compliance.

## Run locally
1. Install dependencies:
   - `npm install`
2. Start the server:
   - `npm start`
3. Open the app in your browser:
   - `http://localhost:3000`

## Supabase setup (required for local + Vercel)
1. Create a Supabase project.
2. Run the SQL in `supabase_schema.sql` to create tables.
3. Add environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - For local dev, you can place them in `.env` (see `.env.example`).

## Deploy to Vercel
1. Import this repo in Vercel.
2. Set **Build Command** to blank and **Output Directory** to the project root.
3. Add environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy.

## Notes
- The “Print / Save PDF” button uses the browser print dialog.
