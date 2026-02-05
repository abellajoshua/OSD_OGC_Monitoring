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
    date_of_sanction TEXT NOT NULL
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
    reason TEXT NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS gatepass (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    time_in TEXT NOT NULL,
    time_out TEXT NOT NULL,
    name TEXT NOT NULL,
    sr_code TEXT NOT NULL,
    course TEXT NOT NULL,
    sex TEXT NOT NULL,
    reason TEXT NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS good_moral (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    time_in TEXT NOT NULL,
    time_out TEXT NOT NULL,
    name TEXT NOT NULL,
    sr_code TEXT NOT NULL,
    course TEXT NOT NULL,
    sex TEXT NOT NULL,
    purpose TEXT NOT NULL
  );
`);

const listStmt = db.prepare(
  `SELECT * FROM minor_offenses ORDER BY date(date_of_complaint) DESC, id DESC`
);

const listUniformStmt = db.prepare(
  `SELECT * FROM non_wearing_uniform ORDER BY date(date) DESC, id DESC`
);

const listGatepassStmt = db.prepare(
  `SELECT * FROM gatepass ORDER BY date(date) DESC, id DESC`
);

const listGoodMoralStmt = db.prepare(`
  SELECT
    gm.*,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM minor_offenses mo
        WHERE TRIM(mo.sr_code) = TRIM(gm.sr_code)
      ) THEN 1
      ELSE 0
    END AS has_minor_offense
  FROM good_moral gm
  ORDER BY date(gm.date) DESC, gm.id DESC
`);

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
    date_of_sanction
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
    @date_of_sanction
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
    reason
  ) VALUES (
    @date,
    @time_in,
    @time_out,
    @name,
    @sr_code,
    @course,
    @sex,
    @reason
  )
`);

const insertGatepassStmt = db.prepare(`
  INSERT INTO gatepass (
    date,
    time_in,
    time_out,
    name,
    sr_code,
    course,
    sex,
    reason
  ) VALUES (
    @date,
    @time_in,
    @time_out,
    @name,
    @sr_code,
    @course,
    @sex,
    @reason
  )
`);

const insertGoodMoralStmt = db.prepare(`
  INSERT INTO good_moral (
    date,
    time_in,
    time_out,
    name,
    sr_code,
    course,
    sex,
    purpose
  ) VALUES (
    @date,
    @time_in,
    @time_out,
    @name,
    @sr_code,
    @course,
    @sex,
    @purpose
  )
`);

const updateMinorStmt = db.prepare(`
  UPDATE minor_offenses SET
    date_of_complaint = @date_of_complaint,
    name_of_student = @name_of_student,
    sr_code = @sr_code,
    year_program = @year_program,
    contact_number = @contact_number,
    reported_by = @reported_by,
    sex = @sex,
    offense = @offense,
    sanction = @sanction,
    date_of_sanction = @date_of_sanction
  WHERE id = @id
`);

const updateUniformStmt = db.prepare(`
  UPDATE non_wearing_uniform SET
    date = @date,
    time_in = @time_in,
    time_out = @time_out,
    name = @name,
    sr_code = @sr_code,
    course = @course,
    sex = @sex,
    reason = @reason
  WHERE id = @id
`);

const updateGatepassStmt = db.prepare(`
  UPDATE gatepass SET
    date = @date,
    time_in = @time_in,
    time_out = @time_out,
    name = @name,
    sr_code = @sr_code,
    course = @course,
    sex = @sex,
    reason = @reason
  WHERE id = @id
`);

const updateGoodMoralStmt = db.prepare(`
  UPDATE good_moral SET
    date = @date,
    time_in = @time_in,
    time_out = @time_out,
    name = @name,
    sr_code = @sr_code,
    course = @course,
    sex = @sex,
    purpose = @purpose
  WHERE id = @id
`);

const countMinorStmt = db.prepare(`SELECT COUNT(*) as count FROM minor_offenses`);
const countUniformStmt = db.prepare(`SELECT COUNT(*) as count FROM non_wearing_uniform`);
const countGatepassStmt = db.prepare(`SELECT COUNT(*) as count FROM gatepass`);
const countGoodMoralStmt = db.prepare(`SELECT COUNT(*) as count FROM good_moral`);
const pendingSanctionsStmt = db.prepare(`
  SELECT COUNT(*) as count
  FROM minor_offenses
  WHERE sanction IS NULL OR TRIM(sanction) = ''
     OR date_of_sanction IS NULL OR TRIM(date_of_sanction) = ''
`);
const resolvedWeekStmt = db.prepare(`
  SELECT COUNT(*) as count
  FROM minor_offenses
  WHERE date(date_of_sanction) >= date('now','-6 day')
    AND date(date_of_sanction) <= date('now')
`);
const followUpsStmt = db.prepare(`
  SELECT COUNT(*) as count
  FROM non_wearing_uniform
  WHERE time_out IS NULL OR TRIM(time_out) = ''
`);

const gatepassFollowUpsStmt = db.prepare(`
  SELECT COUNT(*) as count
  FROM gatepass
  WHERE time_out IS NULL OR TRIM(time_out) = ''
`);

const goodMoralFollowUpsStmt = db.prepare(`
  SELECT COUNT(*) as count
  FROM good_moral
  WHERE time_out IS NULL OR TRIM(time_out) = ''
`);

app.use(express.json());
app.use(express.static(__dirname));

app.get("/api/minor-offenses", (_req, res) => {
  const rows = listStmt.all();
  res.json(rows);
});

app.get("/api/minor-offenses/archive", (_req, res) => {
  const rows = listStmt.all();
  const headers = [
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
  const csv = buildCsv(headers, rows);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=minor-offenses.csv");
  res.send(csv);
});

app.delete("/api/minor-offenses/:id", (req, res) => {
  const { id } = req.params;
  const info = db.prepare("DELETE FROM minor_offenses WHERE id = ?").run(id);
  if (!info.changes) {
    return res.status(404).json({ error: "Record not found." });
  }
  res.json({ deleted: info.changes });
});

app.get("/api/non-wearing-uniform", (_req, res) => {
  const rows = listUniformStmt.all();
  res.json(rows);
});

app.get("/api/non-wearing-uniform/archive", (_req, res) => {
  const rows = listUniformStmt.all();
  const headers = [
    "date",
    "time_in",
    "time_out",
    "name",
    "sr_code",
    "course",
    "sex",
    "reason",
  ];
  const csv = buildCsv(headers, rows);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=non-wearing-uniform.csv");
  res.send(csv);
});

app.delete("/api/non-wearing-uniform/:id", (req, res) => {
  const { id } = req.params;
  const info = db.prepare("DELETE FROM non_wearing_uniform WHERE id = ?").run(id);
  if (!info.changes) {
    return res.status(404).json({ error: "Record not found." });
  }
  res.json({ deleted: info.changes });
});

app.get("/api/gatepass", (_req, res) => {
  const rows = listGatepassStmt.all();
  res.json(rows);
});

app.get("/api/gatepass/archive", (_req, res) => {
  const rows = listGatepassStmt.all();
  const headers = [
    "date",
    "time_in",
    "time_out",
    "name",
    "sr_code",
    "course",
    "sex",
    "reason",
  ];
  const csv = buildCsv(headers, rows);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=gatepass.csv");
  res.send(csv);
});

app.delete("/api/gatepass/:id", (req, res) => {
  const { id } = req.params;
  const info = db.prepare("DELETE FROM gatepass WHERE id = ?").run(id);
  if (!info.changes) {
    return res.status(404).json({ error: "Record not found." });
  }
  res.json({ deleted: info.changes });
});

app.get("/api/good-moral", (_req, res) => {
  const rows = listGoodMoralStmt.all();
  res.json(rows);
});

app.get("/api/good-moral/archive", (_req, res) => {
  const rows = listGoodMoralStmt.all();
  const headers = [
    "date",
    "time_in",
    "time_out",
    "name",
    "sr_code",
    "course",
    "sex",
    "purpose",
  ];
  const csv = buildCsv(headers, rows);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=good-moral.csv");
  res.send(csv);
});

app.delete("/api/good-moral/:id", (req, res) => {
  const { id } = req.params;
  const info = db.prepare("DELETE FROM good_moral WHERE id = ?").run(id);
  if (!info.changes) {
    return res.status(404).json({ error: "Record not found." });
  }
  res.json({ deleted: info.changes });
});

app.get("/api/dashboard", (_req, res) => {
  const minorCount = countMinorStmt.get().count || 0;
  const uniformCount = countUniformStmt.get().count || 0;
  const gatepassCount = countGatepassStmt.get().count || 0;
  const goodMoralCount = countGoodMoralStmt.get().count || 0;
  const pendingSanctions = pendingSanctionsStmt.get().count || 0;
  const resolvedThisWeek = resolvedWeekStmt.get().count || 0;
  const followUpsDue =
    (followUpsStmt.get().count || 0) +
    (gatepassFollowUpsStmt.get().count || 0) +
    (goodMoralFollowUpsStmt.get().count || 0);

  res.json({
    activeCases: minorCount + uniformCount + gatepassCount + goodMoralCount,
    pendingSanctions,
    resolvedThisWeek,
    followUpsDue,
  });
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

  const info = insertStmt.run(payload);
  res.status(201).json({ id: info.lastInsertRowid });
});

app.put("/api/minor-offenses/:id", (req, res) => {
  const payload = req.body || {};
  const { id } = req.params;
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

  const info = updateMinorStmt.run({ ...payload, id });
  if (!info.changes) {
    return res.status(404).json({ error: "Record not found." });
  }
  res.json({ updated: info.changes });
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

  const info = insertUniformStmt.run(payload);
  res.status(201).json({ id: info.lastInsertRowid });
});

app.put("/api/non-wearing-uniform/:id", (req, res) => {
  const payload = req.body || {};
  const { id } = req.params;
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

  const info = updateUniformStmt.run({ ...payload, id });
  if (!info.changes) {
    return res.status(404).json({ error: "Record not found." });
  }
  res.json({ updated: info.changes });
});

app.post("/api/gatepass", (req, res) => {
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

  const info = insertGatepassStmt.run(payload);
  res.status(201).json({ id: info.lastInsertRowid });
});

app.put("/api/gatepass/:id", (req, res) => {
  const payload = req.body || {};
  const { id } = req.params;
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

  const info = updateGatepassStmt.run({ ...payload, id });
  if (!info.changes) {
    return res.status(404).json({ error: "Record not found." });
  }
  res.json({ updated: info.changes });
});

app.post("/api/good-moral", (req, res) => {
  const payload = req.body || {};
  const requiredFields = [
    "date",
    "time_in",
    "time_out",
    "name",
    "sr_code",
    "course",
    "sex",
    "purpose",
  ];

  const missing = requiredFields.filter((field) => !payload[field]);
  if (missing.length) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` });
  }

  const info = insertGoodMoralStmt.run(payload);
  res.status(201).json({ id: info.lastInsertRowid });
});

app.put("/api/good-moral/:id", (req, res) => {
  const payload = req.body || {};
  const { id } = req.params;
  const requiredFields = [
    "date",
    "time_in",
    "time_out",
    "name",
    "sr_code",
    "course",
    "sex",
    "purpose",
  ];

  const missing = requiredFields.filter((field) => !payload[field]);
  if (missing.length) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` });
  }

  const info = updateGoodMoralStmt.run({ ...payload, id });
  if (!info.changes) {
    return res.status(404).json({ error: "Record not found." });
  }
  res.json({ updated: info.changes });
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

function toCsvValue(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildCsv(headers, rows) {
  const headerLine = headers.join(",");
  const lines = rows.map((row) => headers.map((key) => toCsvValue(row[key])).join(","));
  return [headerLine, ...lines].join("\n");
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
              </tr>
              <tr>
                <th>M</th>
                <th>F</th>
              </tr>
            </thead>
            <tbody>
              ${rows || "<tr><td colspan='11'>No records</td></tr>"}
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
