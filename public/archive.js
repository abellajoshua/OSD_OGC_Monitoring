import { getSupabase } from "./supabaseClient.js";

const statusEl = document.getElementById("archive-status");

const TABLE_MAP = {
  minor: {
    table: "minor_offenses",
    fileName: "minor-offenses-archive.csv",
    headers: [
      "id",
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
      "created_at",
    ],
  },
  uniform: {
    table: "non_wearing_uniform",
    fileName: "non-wearing-uniform-archive.csv",
    headers: [
      "id",
      "date",
      "time_in",
      "time_out",
      "name",
      "sr_code",
      "course",
      "sex",
      "reason",
      "created_at",
    ],
  },
  gatepass: {
    table: "gatepass",
    fileName: "gatepass-archive.csv",
    headers: [
      "id",
      "date",
      "time_in",
      "time_out",
      "name",
      "sr_code",
      "course",
      "sex",
      "reason",
      "created_at",
    ],
  },
  goodmoral: {
    table: "good_moral",
    fileName: "good-moral-archive.csv",
    headers: [
      "id",
      "date",
      "time_in",
      "time_out",
      "name",
      "sr_code",
      "course",
      "sex",
      "purpose",
      "created_at",
    ],
  },
};

function toCsvValue(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function buildCsv(headers, rows) {
  const headerLine = headers.join(",");
  const lines = rows.map((row) => headers.map((key) => toCsvValue(row[key])).join(","));
  return [headerLine, ...lines].join("\n");
}

function downloadCsv(fileName, csvContent) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function exportArchive(type) {
  const config = TABLE_MAP[type];
  if (!config) return;
  if (statusEl) statusEl.textContent = "Preparing archive...";

  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from(config.table)
      .select("*")
      .order("id", { ascending: false });

    if (error) throw error;
    const csv = buildCsv(config.headers, data || []);
    downloadCsv(config.fileName, csv);
    if (statusEl) statusEl.textContent = "Archive downloaded.";
  } catch (error) {
    if (statusEl) statusEl.textContent = error.message || "Archive export failed.";
  }
}

document.getElementById("archive-minor")?.addEventListener("click", () => exportArchive("minor"));
document.getElementById("archive-uniform")?.addEventListener("click", () => exportArchive("uniform"));
document.getElementById("archive-gatepass")?.addEventListener("click", () => exportArchive("gatepass"));
document.getElementById("archive-goodmoral")?.addEventListener("click", () => exportArchive("goodmoral"));
