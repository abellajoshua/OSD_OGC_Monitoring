const path = require("path");
const fs = require("fs");
const express = require("express");
const Database = require("better-sqlite3");
const puppeteer = require("puppeteer");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "monitoring.db");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS minor_offenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date_of_complaint TEXT NOT NULL,
    name_of_student TEXT NOT NULL,
    sr_code TEXT NOT NULL,
    year_program TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    reported_by TEXT NOT NULL,
    sex TEXT NOT NULL,
    offense TEXT NOT NULL,
    sanction TEXT NOT NULL,
    date_of_sanction TEXT NOT NULL,
    signature TEXT
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS non_wearing_uniform (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    time_in TEXT NOT NULL,
    time_out TEXT NOT NULL,
    name TEXT NOT NULL,
    sr_code TEXT NOT NULL,
    course TEXT NOT NULL,
    sex TEXT NOT NULL,
    reason TEXT NOT NULL,
    signature TEXT
  );
`);

const listStmt = db.prepare(
  `SELECT * FROM minor_offenses ORDER BY date(date_of_complaint) DESC, id DESC`
);

const listUniformStmt = db.prepare(
  `SELECT * FROM non_wearing_uniform ORDER BY date(date) DESC, id DESC`
);

const insertStmt = db.prepare(`
  INSERT INTO minor_offenses (
    date_of_complaint,
    name_of_student,
    sr_code,
    year_program,
    contact_number,
    reported_by,
    sex,
    offense,
    sanction,
    date_of_sanction,
    signature
  ) VALUES (
    @date_of_complaint,
    @name_of_student,
    @sr_code,
    @year_program,
    @contact_number,
    @reported_by,
    @sex,
    @offense,
    @sanction,
    @date_of_sanction,
    @signature
  )
`);

const insertUniformStmt = db.prepare(`
  INSERT INTO non_wearing_uniform (
    date,
    time_in,
    time_out,
    name,
    sr_code,
    course,
    sex,
    reason,
    signature
  ) VALUES (
    @date,
    @time_in,
    @time_out,
    @name,
    @sr_code,
    @course,
    @sex,
    @reason,
    @signature
  )
`);

app.use(express.json());
app.use(express.static(__dirname));

app.get("/api/minor-offenses", (_req, res) => {
  const rows = listStmt.all();
  res.json(rows);
});

app.get("/api/non-wearing-uniform", (_req, res) => {
  const rows = listUniformStmt.all();
  res.json(rows);
});

app.post("/api/minor-offenses", (req, res) => {
  const payload = req.body || {};
  const requiredFields = [
    "date_of_complaint",
    "name_of_student",
    "sr_code",
    "year_program",
    "contact_number",
    "reported_by",
    "sex",
    "offense",
    "sanction",
    "date_of_sanction",
  ];

  const missing = requiredFields.filter((field) => !payload[field]);
  if (missing.length) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` });
  }

  const record = {
    ...payload,
    signature: payload.signature || "",
  };

  const info = insertStmt.run(record);
  res.status(201).json({ id: info.lastInsertRowid });
});

app.post("/api/non-wearing-uniform", (req, res) => {
  const payload = req.body || {};
  const requiredFields = [
    "date",
    "time_in",
    "time_out",
    "name",
    "sr_code",
    "course",
    "sex",
    "reason",
  ];

  const missing = requiredFields.filter((field) => !payload[field]);
  if (missing.length) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` });
  }

  const record = {
    ...payload,
    signature: payload.signature || "",
  };

  const info = insertUniformStmt.run(record);
  res.status(201).json({ id: info.lastInsertRowid });
});

app.get("/print/minor-offenses", (_req, res) => {
  const records = listStmt.all();
  res.send(renderMinorOffensesHTML(records));
});

app.get("/api/minor-offenses/pdf", async (_req, res) => {
  const records = listStmt.all();
  const html = renderMinorOffensesHTML(records);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0.4in", bottom: "0.4in", left: "0.4in", right: "0.4in" },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=minor-offenses-logsheet.pdf"
    );
    res.send(pdf);
  } finally {
    await browser.close();
  }
});

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function renderMinorOffensesHTML(records) {
  const rows = records
    .map((record) => {
      return `
        <tr>
          <td>${escapeHtml(formatDate(record.date_of_complaint))}</td>
          <td>${escapeHtml(record.name_of_student)}</td>
          <td>${escapeHtml(record.sr_code)}</td>
          <td>${escapeHtml(record.year_program)}</td>
          <td>${escapeHtml(record.contact_number)}</td>
          <td>${escapeHtml(record.reported_by)}</td>
          <td>${record.sex === "M" ? "✔" : ""}</td>
          <td>${record.sex === "F" ? "✔" : ""}</td>
          <td>${escapeHtml(record.offense)}</td>
          <td>${escapeHtml(record.sanction)}</td>
          <td>${escapeHtml(formatDate(record.date_of_sanction))}</td>
          <td>${escapeHtml(record.signature || "")}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Minor Offense Logsheet</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: "Times New Roman", serif; color: #111; padding: 12px; }
          .sheet { border: 2px solid #111; padding: 16px; }
          .header { text-align: center; margin-bottom: 12px; }
          .header .accent { color: #b11d1d; font-weight: bold; font-size: 18px; }
          .header .strong { font-weight: bold; }
          .log-title { text-align: center; margin: 12px 0; }
          .log-title h2 { font-size: 22px; }
          .log-title h3 { font-size: 16px; letter-spacing: 1px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #111; padding: 6px; text-align: center; }
          th { background: #f5f5f5; text-transform: uppercase; }
          .seal { font-weight: bold; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="header">
            <div class="seal">BATSU</div>
            <div>Republic of the Philippines</div>
            <div class="accent">Batangas State University</div>
            <div>The National Engineering University</div>
            <div>Alangilan Campus</div>
            <div class="strong">OFFICE OF STUDENT DISCIPLINE</div>
            <div>First Semester AY 2024-2025</div>
          </div>
          <div class="log-title">
            <h2>LOGSHEET</h2>
            <h3>MINOR OFFENSES</h3>
          </div>
          <table>
            <thead>
              <tr>
                <th rowspan="2">Date of Complaint</th>
                <th rowspan="2">Name of Student</th>
                <th rowspan="2">SR Code</th>
                <th rowspan="2">Year / Program</th>
                <th rowspan="2">Contact Number</th>
                <th rowspan="2">Reported By</th>
                <th colspan="2">Sex</th>
                <th rowspan="2">Offense</th>
                <th rowspan="2">Sanction</th>
                <th rowspan="2">Date of Sanction</th>
                <th rowspan="2">Signature</th>
              </tr>
              <tr>
                <th>M</th>
                <th>F</th>
              </tr>
            </thead>
            <tbody>
              ${rows || "<tr><td colspan='12'>No records</td></tr>"}
            </tbody>
          </table>
        </div>
      </body>
    </html>
  `;
}

app.listen(PORT, () => {
  console.log(`OSD/OGC Monitoring server running on http://localhost:${PORT}`);
});
