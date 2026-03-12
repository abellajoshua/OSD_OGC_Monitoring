import { getSupabase } from "./supabaseClient.js?v=3";

const TABLES = {
  minor: "minor_offenses",
  major: "major_offenses",
  uniform: "non_wearing_uniform",
  gatepass: "gatepass",
  goodmoral: "good_moral",
};

const navButtons = document.querySelectorAll(".nav-btn");
const tabs = document.querySelectorAll(".tab");
const heroButtons = document.querySelectorAll("[data-tab]");
const tableBody = document.querySelector("#minor-table-body");
const recordForm = document.querySelector("#record-form");
const formStatus = document.querySelector("#form-status");
const exportButton = document.querySelector("#export-pdf");
const majorTableBody = document.querySelector("#major-table-body");
const majorForm = document.querySelector("#major-form");
const majorStatus = document.querySelector("#major-status");
const exportMajorButton = document.querySelector("#export-major-pdf");
const uniformTableBody = document.querySelector("#uniform-table-body");
const uniformForm = document.querySelector("#uniform-form");
const uniformStatus = document.querySelector("#uniform-status");
const gatepassTableBody = document.querySelector("#gatepass-table-body");
const gatepassForm = document.querySelector("#gatepass-form");
const gatepassStatus = document.querySelector("#gatepass-status");
const goodmoralTableBody = document.querySelector("#goodmoral-table-body");
const goodmoralForm = document.querySelector("#goodmoral-form");
const goodmoralStatus = document.querySelector("#goodmoral-status");
const dashboardActivityBody = document.querySelector("#dashboard-activity-body");
const statActive = document.querySelector("[data-stat='active']");
const statPending = document.querySelector("[data-stat='pending']");
const statResolved = document.querySelector("[data-stat='resolved']");
const statFollowups = document.querySelector("[data-stat='followups']");
const kpiMinor = document.querySelector("[data-kpi='minor']");
const kpiMajor = document.querySelector("[data-kpi='major']");
const kpiUniform = document.querySelector("[data-kpi='uniform']");
const kpiGatepass = document.querySelector("[data-kpi='gatepass']");
const kpiGoodmoral = document.querySelector("[data-kpi='goodmoral']");
const kpiGoodmoralFlagged = document.querySelector("[data-kpi='goodmoral-flagged']");

const minorFilter = document.querySelector("[data-filter-scope='minor']");
const majorFilter = document.querySelector("[data-filter-scope='major']");
const uniformFilter = document.querySelector("[data-filter-scope='uniform']");
const gatepassFilter = document.querySelector("[data-filter-scope='gatepass']");
const goodmoralFilter = document.querySelector("[data-filter-scope='goodmoral']");

let minorRecords = [];
let majorRecords = [];
let uniformRecords = [];
let gatepassRecords = [];
let goodmoralRecords = [];

function buildCsv(headers, rows) {
  const escape = (value) => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const headerRow = headers.join(",");
  const dataRows = rows.map((row) => headers.map((key) => escape(row[key])).join(","));
  return [headerRow, ...dataRows].join("\n");
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

async function fetchTableRows(table, dateColumn) {
  const supabase = await getSupabase();
  const query = supabase.from(table).select("*");
  const primaryOrderColumn = dateColumn || "id";
  const { data, error } = await query
    .order(primaryOrderColumn, { ascending: false })
    .order("id", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function createRow(table, payload) {
  const supabase = await getSupabase();
  const { error } = await supabase.from(table).insert(payload);
  if (error) throw error;
}

async function updateRow(table, id, payload) {
  const supabase = await getSupabase();
  const { error } = await supabase.from(table).update(payload).eq("id", id);
  if (error) throw error;
}

async function deleteRow(table, id) {
  const supabase = await getSupabase();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

function normalizeDateValue(record) {
  return (
    record.date_of_complaint ||
    record.date ||
    (record.created_at ? String(record.created_at).slice(0, 10) : "")
  );
}

function switchTab(targetId) {
  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.id === targetId);
  });
  navButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === targetId);
  });
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

function formatDashboardDetail(item) {
  if (item.type === "Minor Offense") return item.record.offense || "";
  if (item.type === "Major Offense") return item.record.offense || "";
  if (item.type === "Good Moral") {
    const purpose = item.record.purpose || "";
    return item.record.has_minor_offense ? `${purpose} (Minor offense tagged)` : purpose;
  }
  return item.record.reason || "";
}

function buildRecentDashboardItems() {
  const mappedMinor = minorRecords.map((record) => ({
    type: "Minor Offense",
    date: normalizeDateValue(record),
    name: record.name_of_student || "",
    srCode: record.sr_code || "",
    record,
  }));
  const mappedMajor = majorRecords.map((record) => ({
    type: "Major Offense",
    date: normalizeDateValue(record),
    name: record.name_of_student || "",
    srCode: record.sr_code || "",
    record,
  }));
  const mappedUniform = uniformRecords.map((record) => ({
    type: "Non-Wearing Uniform",
    date: normalizeDateValue(record),
    name: record.name || "",
    srCode: record.sr_code || "",
    record,
  }));
  const mappedGatepass = gatepassRecords.map((record) => ({
    type: "Gatepass",
    date: normalizeDateValue(record),
    name: record.name || "",
    srCode: record.sr_code || "",
    record,
  }));
  const mappedGoodmoral = goodmoralRecords.map((record) => ({
    type: "Good Moral",
    date: normalizeDateValue(record),
    name: record.name || "",
    srCode: record.sr_code || "",
    record,
  }));

  return [...mappedMinor, ...mappedMajor, ...mappedUniform, ...mappedGatepass, ...mappedGoodmoral]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 10);
}

function renderDashboardActivity() {
  if (!dashboardActivityBody) return;
  const items = buildRecentDashboardItems();
  dashboardActivityBody.innerHTML = "";

  if (!items.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="5">No entries yet.</td>`;
    dashboardActivityBody.appendChild(row);
    return;
  }

  items.forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatDate(item.date)}</td>
      <td>${item.type}</td>
      <td>${item.name}</td>
      <td>${item.srCode}</td>
      <td>${formatDashboardDetail(item)}</td>
    `;
    dashboardActivityBody.appendChild(row);
  });
}

function updateDashboardCounters() {
  if (kpiMinor) kpiMinor.textContent = minorRecords.length;
  if (kpiMajor) kpiMajor.textContent = majorRecords.length;
  if (kpiUniform) kpiUniform.textContent = uniformRecords.length;
  if (kpiGatepass) kpiGatepass.textContent = gatepassRecords.length;
  if (kpiGoodmoral) kpiGoodmoral.textContent = goodmoralRecords.length;
  if (kpiGoodmoralFlagged) {
    kpiGoodmoralFlagged.textContent = goodmoralRecords.filter((row) => row.has_minor_offense).length;
  }
  renderDashboardActivity();
  loadDashboard();
}

function flagGoodMoralFromMinor() {
  if (!goodmoralRecords.length) return;
  const codeSet = new Set(
    [...minorRecords, ...majorRecords].map((row) => String(row.sr_code || "").trim().toLowerCase())
  );
  goodmoralRecords = goodmoralRecords.map((row) => ({
    ...row,
    has_minor_offense: codeSet.has(String(row.sr_code || "").trim().toLowerCase()) ? 1 : 0,
  }));
}

function openPrintView() {
  const table = document.querySelector("#minor .table-wrap table");
  const title = document.querySelector("#minor .log-title");

  if (!table || !title) return;

  const printWindow = window.open("", "_blank", "width=980,height=720");
  if (!printWindow) return;

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Minor Offense Logsheet</title>
        <style>
          body { font-family: "Times New Roman", serif; color: #111; padding: 24px; }
          .log-title { text-align: center; margin-bottom: 18px; }
          .log-title h2 { margin: 0; font-size: 24px; }
          .log-title h3 { margin: 4px 0 0; font-size: 16px; letter-spacing: 1px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #111; padding: 6px; text-align: center; }
          th { background: #f5f5f5; text-transform: uppercase; }
          th:last-child, td:last-child { display: none; }
        </style>
      </head>
      <body>
        ${title.outerHTML}
        ${table.outerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function openMajorPrintView() {
  const table = document.querySelector("#major .table-wrap table");
  const title = document.querySelector("#major .log-title");

  if (!table || !title) return;

  const printWindow = window.open("", "_blank", "width=980,height=720");
  if (!printWindow) return;

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Major Offense Logsheet</title>
        <style>
          body { font-family: "Times New Roman", serif; color: #111; padding: 24px; }
          .log-title { text-align: center; margin-bottom: 18px; }
          .log-title h2 { margin: 0; font-size: 24px; }
          .log-title h3 { margin: 4px 0 0; font-size: 16px; letter-spacing: 1px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #111; padding: 6px; text-align: center; }
          th { background: #f5f5f5; text-transform: uppercase; }
          th:last-child, td:last-child { display: none; }
        </style>
      </head>
      <body>
        ${title.outerHTML}
        ${table.outerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

const archiveConfig = {
  "minor-offenses": {
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
    getRows: () => minorRecords,
    fileName: "minor-offenses-archive.csv",
  },
  "major-offenses": {
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
    getRows: () => majorRecords,
    fileName: "major-offenses-archive.csv",
  },
  "non-wearing-uniform": {
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
    getRows: () => uniformRecords,
    fileName: "non-wearing-uniform-archive.csv",
  },
  gatepass: {
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
    getRows: () => gatepassRecords,
    fileName: "gatepass-archive.csv",
  },
  "good-moral": {
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
    getRows: () => goodmoralRecords,
    fileName: "good-moral-archive.csv",
  },
};

function exportArchiveCsv(type) {
  const config = archiveConfig[type];
  if (!config) return;
  const rows = config.getRows() || [];
  const csv = buildCsv(config.headers, rows);
  downloadCsv(config.fileName, csv);
}

function renderRows(records) {
  tableBody.innerHTML = "";
  if (!records.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="12">No records yet. Create the first entry below.</td>`;
    tableBody.appendChild(row);
    return;
  }

  records.forEach((record) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatDate(record.date_of_complaint)}</td>
      <td>${record.name_of_student || ""}</td>
      <td>${record.sr_code || ""}</td>
      <td>${record.year_program || ""}</td>
      <td>${record.contact_number || ""}</td>
      <td>${record.reported_by || ""}</td>
      <td>${record.sex === "M" ? "✔" : ""}</td>
      <td>${record.sex === "F" ? "✔" : ""}</td>
      <td>${record.offense || ""}</td>
      <td>${record.sanction || ""}</td>
      <td>${formatDate(record.date_of_sanction)}</td>
      <td>
        <button class="btn-edit" type="button" data-action="edit" data-id="${record.id}">Edit</button>
        <button class="btn-delete" type="button" data-action="delete" data-id="${record.id}">Delete</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

function renderMajorRows(records) {
  majorTableBody.innerHTML = "";
  if (!records.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="12">No records yet. Create the first entry below.</td>`;
    majorTableBody.appendChild(row);
    return;
  }

  records.forEach((record) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatDate(record.date_of_complaint)}</td>
      <td>${record.name_of_student || ""}</td>
      <td>${record.sr_code || ""}</td>
      <td>${record.year_program || ""}</td>
      <td>${record.contact_number || ""}</td>
      <td>${record.reported_by || ""}</td>
      <td>${record.sex === "M" ? "✔" : ""}</td>
      <td>${record.sex === "F" ? "✔" : ""}</td>
      <td>${record.offense || ""}</td>
      <td>${record.sanction || ""}</td>
      <td>${formatDate(record.date_of_sanction)}</td>
      <td>
        <button class="btn-edit" type="button" data-action="edit" data-id="${record.id}">Edit</button>
        <button class="btn-delete" type="button" data-action="delete" data-id="${record.id}">Delete</button>
      </td>
    `;
    majorTableBody.appendChild(row);
  });
}

function renderUniformRows(records) {
  uniformTableBody.innerHTML = "";
  if (!records.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="11">No records yet. Create the first entry below.</td>`;
    uniformTableBody.appendChild(row);
    return;
  }

  records.forEach((record, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${formatDate(record.date)}</td>
      <td>${record.time_in || ""}</td>
      <td>${record.time_out || ""}</td>
      <td>${record.name || ""}</td>
      <td>${record.sr_code || ""}</td>
      <td>${record.course || ""}</td>
      <td>${record.sex === "M" ? "✔" : ""}</td>
      <td>${record.sex === "F" ? "✔" : ""}</td>
      <td>${record.reason || ""}</td>
      <td>
        <button class="btn-edit" type="button" data-action="edit" data-id="${record.id}">Edit</button>
        <button class="btn-delete" type="button" data-action="delete" data-id="${record.id}">Delete</button>
      </td>
    `;
    uniformTableBody.appendChild(row);
  });
}

function renderGatepassRows(records) {
  gatepassTableBody.innerHTML = "";
  if (!records.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="11">No records yet. Create the first entry below.</td>`;
    gatepassTableBody.appendChild(row);
    return;
  }

  records.forEach((record, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${formatDate(record.date)}</td>
      <td>${record.time_in || ""}</td>
      <td>${record.time_out || ""}</td>
      <td>${record.name || ""}</td>
      <td>${record.sr_code || ""}</td>
      <td>${record.course || ""}</td>
      <td>${record.sex === "M" ? "✔" : ""}</td>
      <td>${record.sex === "F" ? "✔" : ""}</td>
      <td>${record.reason || ""}</td>
      <td>
        <button class="btn-edit" type="button" data-action="edit" data-id="${record.id}">Edit</button>
        <button class="btn-delete" type="button" data-action="delete" data-id="${record.id}">Delete</button>
      </td>
    `;
    gatepassTableBody.appendChild(row);
  });
}

function renderGoodmoralRows(records) {
  goodmoralTableBody.innerHTML = "";
  if (!records.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="11">No records yet. Create the first entry below.</td>`;
    goodmoralTableBody.appendChild(row);
    return;
  }

  records.forEach((record, index) => {
    const tag = record.has_minor_offense
      ? `<span class="tag tag-alert">Minor Offense</span>`
      : "";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${formatDate(record.date)}</td>
      <td>${record.time_in || ""}</td>
      <td>${record.time_out || ""}</td>
      <td>${record.name || ""} ${tag}</td>
      <td>${record.sr_code || ""}</td>
      <td>${record.course || ""}</td>
      <td>${record.sex === "M" ? "✔" : ""}</td>
      <td>${record.sex === "F" ? "✔" : ""}</td>
      <td>${record.purpose || ""}</td>
      <td>
        <button class="btn-edit" type="button" data-action="edit" data-id="${record.id}">Edit</button>
        <button class="btn-delete" type="button" data-action="delete" data-id="${record.id}">Delete</button>
      </td>
    `;
    goodmoralTableBody.appendChild(row);
  });
}

function matchesQuery(record, fields, query) {
  if (!query) return true;
  const haystack = fields.map((field) => String(record[field] || "")).join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function withinDateRange(recordDate, from, to) {
  if (!recordDate) return false;
  const dateValue = new Date(recordDate);
  if (Number.isNaN(dateValue.getTime())) return false;
  if (from) {
    const fromDate = new Date(from);
    if (dateValue < fromDate) return false;
  }
  if (to) {
    const toDate = new Date(to);
    if (dateValue > toDate) return false;
  }
  return true;
}

function applyMinorFilters() {
  if (!minorFilter) return;
  const query = minorFilter.querySelector("[data-filter='query']").value.trim();
  const from = minorFilter.querySelector("[data-filter='from']").value;
  const to = minorFilter.querySelector("[data-filter='to']").value;

  const filtered = minorRecords.filter((record) => {
    const inRange = withinDateRange(record.date_of_complaint, from, to);
    const matches = matchesQuery(record, ["name_of_student", "sr_code", "offense", "reported_by", "year_program"], query);
    return inRange && matches;
  });
  renderRows(filtered);
}

function applyMajorFilters() {
  if (!majorFilter) return;
  const query = majorFilter.querySelector("[data-filter='query']").value.trim();
  const from = majorFilter.querySelector("[data-filter='from']").value;
  const to = majorFilter.querySelector("[data-filter='to']").value;

  const filtered = majorRecords.filter((record) => {
    const inRange = withinDateRange(record.date_of_complaint, from, to);
    const matches = matchesQuery(record, ["name_of_student", "sr_code", "offense", "reported_by", "year_program"], query);
    return inRange && matches;
  });
  renderMajorRows(filtered);
}

function applyUniformFilters() {
  if (!uniformFilter) return;
  const query = uniformFilter.querySelector("[data-filter='query']").value.trim();
  const from = uniformFilter.querySelector("[data-filter='from']").value;
  const to = uniformFilter.querySelector("[data-filter='to']").value;

  const filtered = uniformRecords.filter((record) => {
    const inRange = withinDateRange(record.date, from, to);
    const matches = matchesQuery(record, ["name", "sr_code", "course", "reason"], query);
    return inRange && matches;
  });
  renderUniformRows(filtered);
}

function applyGatepassFilters() {
  if (!gatepassFilter) return;
  const query = gatepassFilter.querySelector("[data-filter='query']").value.trim();
  const from = gatepassFilter.querySelector("[data-filter='from']").value;
  const to = gatepassFilter.querySelector("[data-filter='to']").value;

  const filtered = gatepassRecords.filter((record) => {
    const inRange = withinDateRange(record.date, from, to);
    const matches = matchesQuery(record, ["name", "sr_code", "course", "reason"], query);
    return inRange && matches;
  });
  renderGatepassRows(filtered);
}

function applyGoodmoralFilters() {
  if (!goodmoralFilter) return;
  const query = goodmoralFilter.querySelector("[data-filter='query']").value.trim();
  const from = goodmoralFilter.querySelector("[data-filter='from']").value;
  const to = goodmoralFilter.querySelector("[data-filter='to']").value;

  const filtered = goodmoralRecords.filter((record) => {
    const inRange = withinDateRange(record.date, from, to);
    const matches = matchesQuery(record, ["name", "sr_code", "course", "purpose"], query);
    return inRange && matches;
  });
  renderGoodmoralRows(filtered);
}

function setupFilters(scopeElement, applyFn) {
  if (!scopeElement) return;
  const queryInput = scopeElement.querySelector("[data-filter='query']");
  const fromInput = scopeElement.querySelector("[data-filter='from']");
  const toInput = scopeElement.querySelector("[data-filter='to']");
  const applyButton = scopeElement.querySelector("[data-filter='apply']");
  const clearButton = scopeElement.querySelector("[data-filter='clear']");

  [queryInput, fromInput, toInput].forEach((input) => {
    input.addEventListener("input", applyFn);
  });

  if (applyButton) {
    applyButton.addEventListener("click", applyFn);
  }

  clearButton.addEventListener("click", () => {
    queryInput.value = "";
    fromInput.value = "";
    toInput.value = "";
    applyFn();
  });
}

function setFormEditState(form, isEditing) {
  if (!form) return;
  const submitButton = form.querySelector("[data-submit-label]");
  const cancelButton = form.querySelector("[data-edit-cancel]");

  if (isEditing) {
    if (submitButton) {
      submitButton.textContent = "Update Record";
    }
    if (cancelButton) {
      cancelButton.classList.remove("is-hidden");
    }
  } else {
    delete form.dataset.editId;
    if (submitButton) {
      submitButton.textContent = submitButton.dataset.submitLabel || "Save Record";
    }
    if (cancelButton) {
      cancelButton.classList.add("is-hidden");
    }
    form.reset();
  }
}

function fillForm(form, record, fields) {
  if (!form || !record) return;
  fields.forEach((field) => {
    if (field === "sex") {
      const radio = form.querySelector(`input[name="sex"][value="${record.sex}"]`);
      if (radio) radio.checked = true;
      return;
    }
    const input = form.querySelector(`[name="${field}"]`);
    if (input) {
      input.value = record[field] ?? "";
    }
  });
}

function attachRowActions({ tableElement, tableName, getRecords, form, fields, reloadFn }) {
  if (!tableElement) return;
  tableElement.addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-action='edit']");
    const deleteButton = event.target.closest("[data-action='delete']");

    if (editButton) {
      const id = editButton.dataset.id;
      const records = getRecords();
      const record = records.find((item) => String(item.id) === String(id));
      if (!record) return;
      form.dataset.editId = id;
      fillForm(form, record, fields);
      setFormEditState(form, true);
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (deleteButton) {
      const id = deleteButton.dataset.id;
      if (!id) return;
      const confirmed = window.confirm("Delete this record?");
      if (!confirmed) return;

    try {
      await deleteRow(tableName, id);
      await reloadFn();
      await loadDashboard();
    } catch (error) {
      alert(error.message || "Unable to delete record.");
    }
    }
  });
}

function attachCancelEdit(form) {
  if (!form) return;
  const cancelButton = form.querySelector("[data-edit-cancel]");
  if (!cancelButton) return;
  cancelButton.addEventListener("click", () => setFormEditState(form, false));
}

async function loadRecords() {
  try {
    minorRecords = await fetchTableRows(TABLES.minor, "date_of_complaint");
    flagGoodMoralFromMinor();
    applyMinorFilters();
    updateDashboardCounters();
  } catch (error) {
    minorRecords = [];
    renderRows([]);
    updateDashboardCounters();
  }
}

async function loadMajorRecords() {
  try {
    majorRecords = await fetchTableRows(TABLES.major, "date_of_complaint");
    flagGoodMoralFromMinor();
    applyMajorFilters();
    updateDashboardCounters();
  } catch (error) {
    majorRecords = [];
    renderMajorRows([]);
    updateDashboardCounters();
  }
}

async function loadDashboard() {
  const activeCases =
    minorRecords.length + majorRecords.length + uniformRecords.length + gatepassRecords.length + goodmoralRecords.length;
  const pendingSanctions = [...minorRecords, ...majorRecords].filter(
    (item) => !String(item.sanction || "").trim() || !item.date_of_sanction
  ).length;

  const start = new Date();
  start.setDate(start.getDate() - 6);
  const startMs = start.setHours(0, 0, 0, 0);
  const nowMs = new Date().setHours(23, 59, 59, 999);
  const resolvedThisWeek = [...minorRecords, ...majorRecords].filter((item) => {
    if (!item.date_of_sanction) return false;
    const value = new Date(item.date_of_sanction).getTime();
    return !Number.isNaN(value) && value >= startMs && value <= nowMs;
  }).length;

  const followUpsDue = [...uniformRecords, ...gatepassRecords, ...goodmoralRecords].filter(
    (item) => !String(item.time_out || "").trim()
  ).length;

  if (statActive) statActive.textContent = activeCases;
  if (statPending) statPending.textContent = pendingSanctions;
  if (statResolved) statResolved.textContent = resolvedThisWeek;
  if (statFollowups) statFollowups.textContent = followUpsDue;
}

async function loadUniformRecords() {
  try {
    uniformRecords = await fetchTableRows(TABLES.uniform, "date");
    applyUniformFilters();
    updateDashboardCounters();
  } catch (error) {
    uniformRecords = [];
    renderUniformRows([]);
    updateDashboardCounters();
  }
}

async function loadGatepassRecords() {
  try {
    gatepassRecords = await fetchTableRows(TABLES.gatepass, "date");
    applyGatepassFilters();
    updateDashboardCounters();
  } catch (error) {
    gatepassRecords = [];
    renderGatepassRows([]);
    updateDashboardCounters();
  }
}

async function loadGoodmoralRecords() {
  try {
    goodmoralRecords = await fetchTableRows(TABLES.goodmoral, "date");
    flagGoodMoralFromMinor();
    applyGoodmoralFilters();
    updateDashboardCounters();
  } catch (error) {
    goodmoralRecords = [];
    renderGoodmoralRows([]);
    updateDashboardCounters();
  }
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const targetTab = button.dataset.tab;
    if (!targetTab) return;
    switchTab(targetTab);
    const sidebar = document.getElementById("sidebarNav");
    if (sidebar && window.bootstrap && sidebar.classList.contains("show")) {
      window.bootstrap.Offcanvas.getOrCreateInstance(sidebar).hide();
    }
  });
});

heroButtons.forEach((button) => {
  button.addEventListener("click", () => {
    switchTab(button.dataset.tab);
    const scrollTarget = button.dataset.scroll;
    if (scrollTarget) {
      const element = document.getElementById(scrollTarget);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  });
});

const programButton = document.querySelector(".cards article:nth-child(1) .link");
const archiveButton = document.querySelector(".cards article:nth-child(2) .link");
const reportButton = document.querySelector(".cards article:nth-child(3) .link");

if (programButton) {
  programButton.addEventListener("click", () => {
    window.location.href = "programs.html";
  });
}

if (archiveButton) {
  archiveButton.addEventListener("click", () => {
    window.location.href = "archive.html";
  });
}

if (reportButton) {
  reportButton.addEventListener("click", () => {
    switchTab("minor");
    openPrintView();
  });
}


if (recordForm) {
  recordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    formStatus.textContent = "Saving record...";
    const formData = new FormData(recordForm);
    const payload = Object.fromEntries(formData.entries());
    const editId = recordForm.dataset.editId;

    try {
      if (editId) await updateRow(TABLES.minor, editId, payload);
      else await createRow(TABLES.minor, payload);

      setFormEditState(recordForm, false);
      formStatus.textContent = editId ? "Record updated." : "Record saved.";
      await loadRecords();
      await loadDashboard();
    } catch (error) {
      formStatus.textContent = error.message || "Something went wrong. Please try again.";
    }
  });
}

if (majorForm) {
  majorForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    majorStatus.textContent = "Saving record...";
    const formData = new FormData(majorForm);
    const payload = Object.fromEntries(formData.entries());
    const editId = majorForm.dataset.editId;

    try {
      if (editId) await updateRow(TABLES.major, editId, payload);
      else await createRow(TABLES.major, payload);

      setFormEditState(majorForm, false);
      majorStatus.textContent = editId ? "Record updated." : "Record saved.";
      await loadMajorRecords();
      await loadDashboard();
    } catch (error) {
      majorStatus.textContent = error.message || "Something went wrong. Please try again.";
    }
  });
}

if (uniformForm) {
  uniformForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    uniformStatus.textContent = "Saving record...";
    const formData = new FormData(uniformForm);
    const payload = Object.fromEntries(formData.entries());
    const editId = uniformForm.dataset.editId;

    try {
      if (editId) await updateRow(TABLES.uniform, editId, payload);
      else await createRow(TABLES.uniform, payload);

      setFormEditState(uniformForm, false);
      uniformStatus.textContent = editId ? "Record updated." : "Record saved.";
      await loadUniformRecords();
      await loadDashboard();
    } catch (error) {
      uniformStatus.textContent = error.message || "Something went wrong. Please try again.";
    }
  });
}

if (gatepassForm) {
  gatepassForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    gatepassStatus.textContent = "Saving record...";
    const formData = new FormData(gatepassForm);
    const payload = Object.fromEntries(formData.entries());
    const editId = gatepassForm.dataset.editId;

    try {
      if (editId) await updateRow(TABLES.gatepass, editId, payload);
      else await createRow(TABLES.gatepass, payload);

      setFormEditState(gatepassForm, false);
      gatepassStatus.textContent = editId ? "Record updated." : "Record saved.";
      await loadGatepassRecords();
      await loadDashboard();
    } catch (error) {
      gatepassStatus.textContent = error.message || "Something went wrong. Please try again.";
    }
  });
}

if (goodmoralForm) {
  goodmoralForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    goodmoralStatus.textContent = "Saving record...";
    const formData = new FormData(goodmoralForm);
    const payload = Object.fromEntries(formData.entries());
    const editId = goodmoralForm.dataset.editId;

    try {
      if (editId) await updateRow(TABLES.goodmoral, editId, payload);
      else await createRow(TABLES.goodmoral, payload);

      setFormEditState(goodmoralForm, false);
      goodmoralStatus.textContent = editId ? "Record updated." : "Record saved.";
      await loadGoodmoralRecords();
      await loadDashboard();
    } catch (error) {
      goodmoralStatus.textContent = error.message || "Something went wrong. Please try again.";
    }
  });
}

if (exportButton) {
  exportButton.addEventListener("click", () => {
    openPrintView();
  });
}

if (exportMajorButton) {
  exportMajorButton.addEventListener("click", () => {
    openMajorPrintView();
  });
}

document.querySelectorAll("[data-archive]").forEach((button) => {
  button.addEventListener("click", () => {
    exportArchiveCsv(button.dataset.archive);
  });
});

loadRecords();
loadMajorRecords();
loadUniformRecords();
loadGatepassRecords();
loadGoodmoralRecords();
loadDashboard();
updateDashboardCounters();

setupFilters(minorFilter, applyMinorFilters);
setupFilters(majorFilter, applyMajorFilters);
setupFilters(uniformFilter, applyUniformFilters);
setupFilters(gatepassFilter, applyGatepassFilters);
setupFilters(goodmoralFilter, applyGoodmoralFilters);

attachRowActions({
  tableElement: tableBody,
  tableName: TABLES.minor,
  getRecords: () => minorRecords,
  form: recordForm,
  fields: [
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
  ],
  reloadFn: loadRecords,
});

attachRowActions({
  tableElement: majorTableBody,
  tableName: TABLES.major,
  getRecords: () => majorRecords,
  form: majorForm,
  fields: [
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
  ],
  reloadFn: loadMajorRecords,
});

attachRowActions({
  tableElement: uniformTableBody,
  tableName: TABLES.uniform,
  getRecords: () => uniformRecords,
  form: uniformForm,
  fields: ["date", "time_in", "time_out", "name", "sr_code", "course", "sex", "reason"],
  reloadFn: loadUniformRecords,
});

attachRowActions({
  tableElement: gatepassTableBody,
  tableName: TABLES.gatepass,
  getRecords: () => gatepassRecords,
  form: gatepassForm,
  fields: ["date", "time_in", "time_out", "name", "sr_code", "course", "sex", "reason"],
  reloadFn: loadGatepassRecords,
});

attachRowActions({
  tableElement: goodmoralTableBody,
  tableName: TABLES.goodmoral,
  getRecords: () => goodmoralRecords,
  form: goodmoralForm,
  fields: ["date", "time_in", "time_out", "name", "sr_code", "course", "sex", "purpose"],
  reloadFn: loadGoodmoralRecords,
});

attachCancelEdit(recordForm);
attachCancelEdit(majorForm);
attachCancelEdit(uniformForm);
attachCancelEdit(gatepassForm);
attachCancelEdit(goodmoralForm);
