# OSD_OGC_Monitoring
OSD_OGC_Monitoring is a web-based system designed to centralize and monitor OSD and OGC activities. It supports efficient tracking of programs, documents, and reports, ensuring organized records, improved coordination, and timely monitoring for decision-making and compliance.

## Run locally
1. Install dependencies:
   - `npm install`
2. Start the server:
   - `npm start`
3. Open the app in your browser:
   - `http://localhost:3000`

## Data storage
- Records are stored in `data/monitoring.db` (SQLite).
- The Minor Offense log pulls live data from SQLite and can export to PDF via the server.
