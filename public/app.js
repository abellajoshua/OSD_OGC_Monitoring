import { getSupabase } from "./supabaseClient.js?v=4";

const TABLES = {
  minor: "minor_offenses",
  major: "major_offenses",
  uniform: "non_wearing_uniform",
  gatepass: "gatepass",
  goodmoral: "good_moral",
  idreplacement: "id_replacement",
  leaveofabsence: "leave_of_absence",
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
const exportUniformButton = document.querySelector("#export-uniform-pdf");
const gatepassTableBody = document.querySelector("#gatepass-table-body");
const gatepassForm = document.querySelector("#gatepass-form");
const gatepassStatus = document.querySelector("#gatepass-status");
const exportGatepassButton = document.querySelector("#export-gatepass-pdf");
const goodmoralTableBody = document.querySelector("#goodmoral-table-body");
const goodmoralForm = document.querySelector("#goodmoral-form");
const goodmoralStatus = document.querySelector("#goodmoral-status");
const exportGoodmoralButton = document.querySelector("#export-goodmoral-pdf");
const idreplacementTableBody = document.querySelector("#idreplacement-table-body");
const idreplacementForm = document.querySelector("#idreplacement-form");
const idreplacementStatus = document.querySelector("#idreplacement-status");
const exportIdreplacementButton = document.querySelector("#export-idreplacement-pdf");
const leaveofabsenceTableBody = document.querySelector("#leaveofabsence-table-body");
const leaveofabsenceForm = document.querySelector("#leaveofabsence-form");
const leaveofabsenceStatus = document.querySelector("#leaveofabsence-status");
const exportLeaveofabsenceButton = document.querySelector("#export-leaveofabsence-pdf");
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

const academicYearInput = document.querySelector("#academic-year-input");
const semesterSelect = document.querySelector("#semester-select");
const academicPeriodDisplay = document.querySelector("#academic-period-display");
const headOrgFilterGroup = document.querySelector("#head-org-filter-group");
const headOrgFilterSelect = document.querySelector("#head-organization-filter");

const minorFilter = document.querySelector("[data-filter-scope='minor']");
const majorFilter = document.querySelector("[data-filter-scope='major']");
const uniformFilter = document.querySelector("[data-filter-scope='uniform']");
const gatepassFilter = document.querySelector("[data-filter-scope='gatepass']");
const goodmoralFilter = document.querySelector("[data-filter-scope='goodmoral']");
const idreplacementFilter = document.querySelector("[data-filter-scope='idreplacement']");
const leaveofabsenceFilter = document.querySelector("[data-filter-scope='leaveofabsence']");

let minorRecords = [];
let majorRecords = [];
let uniformRecords = [];
let gatepassRecords = [];
let goodmoralRecords = [];
let idreplacementRecords = [];
let leaveofabsenceRecords = [];
let currentOrganizationId = null;
let currentUserRole = localStorage.getItem("userRole") || "";
let selectedHeadOrganizationId = null;
let headFilterInitialized = false;
let hasGlobalHeadAccess = false;

const ROLE_ADMIN = "admin";
const ROLE_HEAD = "head";
const ROLE_COORDINATOR = "coordinator";

function canEditRecords() {
  return currentUserRole === ROLE_COORDINATOR;
}

function isHeadRole() {
  return currentUserRole === ROLE_HEAD;
}

function canAccessAllOrganizations() {
  return isHeadRole() && hasGlobalHeadAccess;
}

function ensureCoordinatorAccess() {
  if (!canEditRecords()) {
    throw new Error("Read-only access: Head can view and export records only.");
  }
}

function renderRecordActions(recordId) {
  if (!canEditRecords()) {
    return `<span class="text-muted">Read Only</span>`;
  }

  return `
    <button class="btn-edit" type="button" data-action="edit" data-id="${recordId}">Edit</button>
    <button class="btn-delete" type="button" data-action="archive" data-id="${recordId}">Archive</button>
  `;
}

function applyReadOnlyMode() {
  [recordForm, majorForm, uniformForm, gatepassForm, goodmoralForm, idreplacementForm, leaveofabsenceForm]
    .filter(Boolean)
    .forEach((form) => {
      form.querySelectorAll("input, select, textarea, button").forEach((field) => {
        if (field.type === "button") return;
        if (field.dataset && field.dataset.editCancel !== undefined) return;
        field.disabled = true;
      });

      const submitButton = form.querySelector("[data-submit-label]");
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Read Only";
      }

      const cancelButton = form.querySelector("[data-edit-cancel]");
      if (cancelButton) {
        cancelButton.classList.add("is-hidden");
      }
    });
}

function applyHeadInterfaceRestrictions() {
  applyReadOnlyMode();

  document.querySelectorAll(".record-form").forEach((form) => form.remove());
  document.querySelectorAll("[data-archive]").forEach((button) => button.remove());

  const archivedRecordsNavLink = document.querySelector('a[href="archived-records.html"]');
  if (archivedRecordsNavLink) {
    archivedRecordsNavLink.remove();
  }

  const archiveCenterButton = document.querySelector(".cards article:nth-child(2) .link");
  if (archiveCenterButton) {
    const archiveCard = archiveCenterButton.closest("article");
    if (archiveCard) {
      archiveCard.remove();
    }
  }

  const brandTitle = document.querySelector(".brand-title");
  if (brandTitle) {
    brandTitle.textContent = "OSD & OGC Monitoring - Head (View Only)";
  }
}

async function getCurrentOrganizationId() {
  if (currentOrganizationId) return currentOrganizationId;
  const cached = localStorage.getItem("organizationId");
  if (cached) {
    currentOrganizationId = Number(cached);
    return currentOrganizationId;
  }

  const supabase = await getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: account } = await supabase
    .from("user_accounts")
    .select("role, organization_id, organizations(name)")
    .eq("user_id", session.user.id)
    .single();

  currentUserRole = String(account?.role || currentUserRole || "").trim().toLowerCase();
  hasGlobalHeadAccess =
    String(account?.role || "").trim().toLowerCase() === ROLE_HEAD &&
    String(account?.organizations?.name || "").trim().toLowerCase() === "alangilan";
  if (currentUserRole) {
    localStorage.setItem("userRole", currentUserRole);
  }

  currentOrganizationId = account?.organization_id || null;
  if (currentOrganizationId) {
    localStorage.setItem("organizationId", String(currentOrganizationId));
  }
  return currentOrganizationId;
}

async function getScopedReadOrganizationId() {
  if (canAccessAllOrganizations()) {
    return selectedHeadOrganizationId || null;
  }
  return getCurrentOrganizationId();
}

async function initializeHeadOrganizationFilter() {
  if (!canAccessAllOrganizations() || !headOrgFilterGroup || !headOrgFilterSelect) {
    if (headOrgFilterGroup) {
      headOrgFilterGroup.style.display = "none";
    }
    return;
  }

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, type")
    .order("type", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to load organizations for Head filter:", error);
    return;
  }

  const organizations = data || [];
  if (!organizations.length) return;

  const visibleOrganizations = organizations.filter(
    (org) => String(org.name || "").trim().toLowerCase() !== "alangilan"
  );

  headOrgFilterSelect.innerHTML = [
    '<option value="">All Campuses and Colleges</option>',
    ...visibleOrganizations.map((org) => `<option value="${org.id}">${org.name} (${org.type})</option>`),
  ].join("");

  const storedSelectionRaw = localStorage.getItem("headOrganizationFilterId");
  const storedSelection = Number(storedSelectionRaw || "");
  if (storedSelectionRaw && !Number.isNaN(storedSelection)) {
    const exists = visibleOrganizations.some((org) => Number(org.id) === storedSelection);
    selectedHeadOrganizationId = exists ? storedSelection : null;
  } else {
    selectedHeadOrganizationId = null;
  }

  if (selectedHeadOrganizationId) {
    localStorage.setItem("headOrganizationFilterId", String(selectedHeadOrganizationId));
    headOrgFilterSelect.value = String(selectedHeadOrganizationId);
  } else {
    localStorage.removeItem("headOrganizationFilterId");
    headOrgFilterSelect.value = "";
  }
  headOrgFilterGroup.style.display = "";

  if (!headFilterInitialized) {
    headOrgFilterSelect.addEventListener("change", async () => {
      selectedHeadOrganizationId = Number(headOrgFilterSelect.value) || null;
      if (selectedHeadOrganizationId) {
        localStorage.setItem("headOrganizationFilterId", String(selectedHeadOrganizationId));
      } else {
        localStorage.removeItem("headOrganizationFilterId");
      }
      await reloadAllDataForCurrentScope();
    });
    headFilterInitialized = true;
  }
}

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
  const primaryOrderColumn = dateColumn || "id";
  const orgId = await getScopedReadOrganizationId();
  
  // Try with archived filter first
  let query = supabase.from(table).select("*").eq("archived", false);
  if (orgId) query = query.eq("organization_id", orgId);
  let { data, error } = await query
    .order(primaryOrderColumn, { ascending: false })
    .order("id", { ascending: false });
  
  // If archived column doesn't exist, try without it
  if (error && error.message && error.message.includes("archived")) {
    query = supabase.from(table).select("*");
    if (orgId) query = query.eq("organization_id", orgId);
    const result = await query
      .order(primaryOrderColumn, { ascending: false })
      .order("id", { ascending: false });
    data = result.data;
    error = result.error;
  }
  
  if (error) throw error;
  return data || [];
}

async function createRow(table, payload) {
  ensureCoordinatorAccess();
  const supabase = await getSupabase();
  const orgId = await getCurrentOrganizationId();
  const safePayload = { ...payload, organization_id: orgId };
  const { error } = await supabase.from(table).insert(safePayload);
  if (error) throw error;
}

async function updateRow(table, id, payload) {
  ensureCoordinatorAccess();
  const supabase = await getSupabase();
  const orgId = await getCurrentOrganizationId();
  const { organization_id, ...safePayload } = payload;
  let query = supabase.from(table).update(safePayload).eq("id", id);
  if (orgId) query = query.eq("organization_id", orgId);
  const { error } = await query;
  if (error) throw error;
}

async function archiveRow(table, id) {
  ensureCoordinatorAccess();
  const supabase = await getSupabase();
  const orgId = await getCurrentOrganizationId();
  let query = supabase.from(table).update({ archived: true }).eq("id", id);
  if (orgId) query = query.eq("organization_id", orgId);
  const { error } = await query;
  if (error) throw error;
}

async function deleteRow(table, id) {
  ensureCoordinatorAccess();
  const supabase = await getSupabase();
  const orgId = await getCurrentOrganizationId();
  let query = supabase.from(table).delete().eq("id", id);
  if (orgId) query = query.eq("organization_id", orgId);
  const { error } = await query;
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
  
  // Show/hide back button based on active tab
  const backBtn = document.getElementById("back-to-dashboard-btn");
  if (backBtn) {
    backBtn.style.display = targetId === "dashboard" ? "none" : "flex";
  }
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

  if (!table) return;
  
  const { year, semester } = getAcademicPeriod();

  const printWindow = window.open("", "_blank", "width=980,height=720");
  if (!printWindow) return;

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Minor Offense Logsheet</title>
        <style>
          @page { size: landscape; margin: 0.5in; }
          body { font-family: "Times New Roman", serif; color: #111; padding: 24px; position: relative; }
          .header-container { margin-bottom: 20px; border-bottom: 2px solid #111; padding-bottom: 10px; text-align: center; position: relative; min-height: 80px; }
          .header-logo { position: absolute; left: 120px; top: 12px; width: 80px; height: 80px; object-fit: contain; }
          .header-text { margin: 0 auto; }
          .header-text h1 { margin: 0; font-size: 14px; font-weight: normal; }
          .header-text h2 { margin: 2px 0; font-size: 16px; font-weight: bold; color: #c00; }
          .header-text h3 { margin: 2px 0; font-size: 13px; font-weight: bold; }
          .header-text h4 { margin: 2px 0; font-size: 13px; font-weight: normal; }
          .log-title { text-align: center; margin: 20px 0; }
          .log-title h2 { margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 2px; }
          .log-title h3 { margin: 4px 0 0; font-size: 16px; font-weight: bold; letter-spacing: 1px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #111; padding: 6px; text-align: center; }
          th { background: #f5f5f5; font-weight: bold; }
          thead tr:first-child th { text-transform: uppercase; }
          thead tr:first-child th:last-child { display: none; }
          tbody tr td:last-child { display: none; }
        </style>
      </head>
      <body>
        <div class="header-container">
          <img src="assets/logo.png" alt="BSU Logo" class="header-logo" />
          <div class="header-text">
            <h1>Republic of the Philippines</h1>
            <h2>Batangas State University</h2>
            <h3>The National Engineering University</h3>
            <h4>Alangilan Campus</h4>
            <h3>OFFICE OF STUDENT DISCIPLINE</h3>
            <h4>${semester} AY ${year}</h4>
          </div>
        </div>
        <div class="log-title">
          <h2>LOGSHEET</h2>
          <h3>MINOR OFFENSES</h3>
        </div>
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
  
  const { year, semester } = getAcademicPeriod();

  const printWindow = window.open("", "_blank", "width=980,height=720");
  if (!printWindow) return;

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Major Offense Logsheet</title>
        <style>
          @page { size: landscape; margin: 0.5in; }
          body { font-family: "Times New Roman", serif; color: #111; padding: 24px; position: relative; }
          .header-container { margin-bottom: 20px; border-bottom: 2px solid #111; padding-bottom: 10px; text-align: center; position: relative; min-height: 80px; }
          .header-logo { position: absolute; left: 120px; top: 12px; width: 80px; height: 80px; object-fit: contain; }
          .header-text { margin: 0 auto; }
          .header-text h1 { margin: 0; font-size: 14px; font-weight: normal; }
          .header-text h2 { margin: 2px 0; font-size: 16px; font-weight: bold; color: #c00; }
          .header-text h3 { margin: 2px 0; font-size: 13px; font-weight: bold; }
          .header-text h4 { margin: 2px 0; font-size: 13px; font-weight: normal; }
          .log-title { text-align: center; margin: 20px 0; }
          .log-title h2 { margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 2px; }
          .log-title h3 { margin: 4px 0 0; font-size: 16px; font-weight: bold; letter-spacing: 1px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #111; padding: 6px; text-align: center; }
          th { background: #f5f5f5; font-weight: bold; }
          thead tr:first-child th { text-transform: uppercase; }
          thead tr:first-child th:last-child { display: none; }
          tbody tr td:last-child { display: none; }
        </style>
      </head>
      <body>
        <div class="header-container">
          <img src="assets/logo.png" alt="BSU Logo" class="header-logo" />
          <div class="header-text">
            <h1>Republic of the Philippines</h1>
            <h2>Batangas State University</h2>
            <h3>The National Engineering University</h3>
            <h4>Alangilan Campus</h4>
            <h3>OFFICE OF STUDENT DISCIPLINE</h3>
            <h4>${semester} AY ${year}</h4>
          </div>
        </div>
        ${title.outerHTML}
        ${table.outerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function openUniformPrintView() {
  const table = document.querySelector("#uniform .table-wrap table");
  const title = document.querySelector("#uniform .log-title");

  if (!table || !title) return;
  
  const { year, semester } = getAcademicPeriod();

  const printWindow = window.open("", "_blank", "width=980,height=720");
  if (!printWindow) return;

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Non-Wearing Uniform Logsheet</title>
        <style>
          @page { size: landscape; margin: 0.5in; }
          body { font-family: "Times New Roman", serif; color: #111; padding: 24px; position: relative; }
          .header-container { margin-bottom: 20px; border-bottom: 2px solid #111; padding-bottom: 10px; text-align: center; position: relative; min-height: 80px; }
          .header-logo { position: absolute; left: 120px; top: 12px; width: 80px; height: 80px; object-fit: contain; }
          .header-text { margin: 0 auto; }
          .header-text h1 { margin: 0; font-size: 14px; font-weight: normal; }
          .header-text h2 { margin: 2px 0; font-size: 16px; font-weight: bold; color: #c00; }
          .header-text h3 { margin: 2px 0; font-size: 13px; font-weight: bold; }
          .header-text h4 { margin: 2px 0; font-size: 13px; font-weight: normal; }
          .log-title { text-align: center; margin: 20px 0; }
          .log-title h2 { margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 2px; }
          .log-title h3 { margin: 4px 0 0; font-size: 16px; font-weight: bold; letter-spacing: 1px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #111; padding: 6px; text-align: center; }
          th { background: #f5f5f5; font-weight: bold; }
          thead tr:first-child th { text-transform: uppercase; }
          thead tr:first-child th:last-child { display: none; }
          tbody tr td:last-child { display: none; }
        </style>
      </head>
      <body>
        <div class="header-container">
          <img src="assets/logo.png" alt="BSU Logo" class="header-logo" />
          <div class="header-text">
            <h1>Republic of the Philippines</h1>
            <h2>Batangas State University</h2>
            <h3>The National Engineering University</h3>
            <h4>Alangilan Campus</h4>
            <h3>OFFICE OF STUDENT DISCIPLINE</h3>
            <h4>${semester} AY ${year}</h4>
          </div>
        </div>
        ${title.outerHTML}
        ${table.outerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function openGatepassPrintView() {
  const table = document.querySelector("#gatepass .table-wrap table");
  const title = document.querySelector("#gatepass .log-title");

  if (!table || !title) return;
  
  const { year, semester } = getAcademicPeriod();

  const printWindow = window.open("", "_blank", "width=980,height=720");
  if (!printWindow) return;

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Gatepass Logsheet</title>
        <style>
          @page { size: landscape; margin: 0.5in; }
          body { font-family: "Times New Roman", serif; color: #111; padding: 24px; position: relative; }
          .header-container { margin-bottom: 20px; border-bottom: 2px solid #111; padding-bottom: 10px; text-align: center; position: relative; min-height: 80px; }
          .header-logo { position: absolute; left: 120px; top: 12px; width: 80px; height: 80px; object-fit: contain; }
          .header-text { margin: 0 auto; }
          .header-text h1 { margin: 0; font-size: 14px; font-weight: normal; }
          .header-text h2 { margin: 2px 0; font-size: 16px; font-weight: bold; color: #c00; }
          .header-text h3 { margin: 2px 0; font-size: 13px; font-weight: bold; }
          .header-text h4 { margin: 2px 0; font-size: 13px; font-weight: normal; }
          .log-title { text-align: center; margin: 20px 0; }
          .log-title h2 { margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 2px; }
          .log-title h3 { margin: 4px 0 0; font-size: 16px; font-weight: bold; letter-spacing: 1px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #111; padding: 6px; text-align: center; }
          th { background: #f5f5f5; font-weight: bold; }
          thead tr:first-child th { text-transform: uppercase; }
          thead tr:first-child th:last-child { display: none; }
          tbody tr td:last-child { display: none; }
        </style>
      </head>
      <body>
        <div class="header-container">
          <img src="assets/logo.png" alt="BSU Logo" class="header-logo" />
          <div class="header-text">
            <h1>Republic of the Philippines</h1>
            <h2>Batangas State University</h2>
            <h3>The National Engineering University</h3>
            <h4>Alangilan Campus</h4>
            <h3>OFFICE OF STUDENT DISCIPLINE</h3>
            <h4>${semester} AY ${year}</h4>
          </div>
        </div>
        ${title.outerHTML}
        ${table.outerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function openGoodmoralPrintView() {
  const table = document.querySelector("#goodmoral .table-wrap table");
  const title = document.querySelector("#goodmoral .log-title");

  if (!table || !title) return;
  
  const { year, semester } = getAcademicPeriod();

  const printWindow = window.open("", "_blank", "width=980,height=720");
  if (!printWindow) return;

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Good Moral Verification Logsheet</title>
        <style>
          @page { size: landscape; margin: 0.5in; }
          body { font-family: "Times New Roman", serif; color: #111; padding: 24px; position: relative; }
          .header-container { margin-bottom: 20px; border-bottom: 2px solid #111; padding-bottom: 10px; text-align: center; position: relative; min-height: 80px; }
          .header-logo { position: absolute; left: 120px; top: 12px; width: 80px; height: 80px; object-fit: contain; }
          .header-text { margin: 0 auto; }
          .header-text h1 { margin: 0; font-size: 14px; font-weight: normal; }
          .header-text h2 { margin: 2px 0; font-size: 16px; font-weight: bold; color: #c00; }
          .header-text h3 { margin: 2px 0; font-size: 13px; font-weight: bold; }
          .header-text h4 { margin: 2px 0; font-size: 13px; font-weight: normal; }
          .log-title { text-align: center; margin: 20px 0; }
          .log-title h2 { margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 2px; }
          .log-title h3 { margin: 4px 0 0; font-size: 16px; font-weight: bold; letter-spacing: 1px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #111; padding: 6px; text-align: center; }
          th { background: #f5f5f5; font-weight: bold; }
          thead tr:first-child th { text-transform: uppercase; }
          thead tr:first-child th:last-child { display: none; }
          tbody tr td:last-child { display: none; }
        </style>
      </head>
      <body>
        <div class="header-container">
          <img src="assets/logo.png" alt="BSU Logo" class="header-logo" />
          <div class="header-text">
            <h1>Republic of the Philippines</h1>
            <h2>Batangas State University</h2>
            <h3>The National Engineering University</h3>
            <h4>Alangilan Campus</h4>
            <h3>OFFICE OF STUDENT DISCIPLINE</h3>
            <h4>${semester} AY ${year}</h4>
          </div>
        </div>
        ${title.outerHTML}
        ${table.outerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function openIdreplacementPrintView() {
  const table = document.querySelector("#idreplacement .table-wrap table");
  const title = document.querySelector("#idreplacement .log-title");

  if (!table || !title) return;
  
  const { year, semester } = getAcademicPeriod();

  const printWindow = window.open("", "_blank", "width=980,height=720");
  if (!printWindow) return;

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>ID Replacement Logsheet</title>
        <style>
          @page { size: landscape; margin: 0.5in; }
          body { font-family: "Times New Roman", serif; color: #111; padding: 24px; position: relative; }
          .header-container { margin-bottom: 20px; border-bottom: 2px solid #111; padding-bottom: 10px; text-align: center; position: relative; min-height: 80px; }
          .header-logo { position: absolute; left: 120px; top: 12px; width: 80px; height: 80px; object-fit: contain; }
          .header-text { margin: 0 auto; }
          .header-text h1 { margin: 0; font-size: 14px; font-weight: normal; }
          .header-text h2 { margin: 2px 0; font-size: 16px; font-weight: bold; color: #c00; }
          .header-text h3 { margin: 2px 0; font-size: 13px; font-weight: bold; }
          .header-text h4 { margin: 2px 0; font-size: 13px; font-weight: normal; }
          .log-title { text-align: center; margin: 20px 0; }
          .log-title h2 { margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 2px; }
          .log-title h3 { margin: 4px 0 0; font-size: 16px; font-weight: bold; letter-spacing: 1px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #111; padding: 6px; text-align: center; }
          th { background: #f5f5f5; font-weight: bold; }
          thead tr:first-child th { text-transform: uppercase; }
          thead tr:first-child th:last-child { display: none; }
          tbody tr td:last-child { display: none; }
        </style>
      </head>
      <body>
        <div class="header-container">
          <img src="assets/logo.png" alt="BSU Logo" class="header-logo" />
          <div class="header-text">
            <h1>Republic of the Philippines</h1>
            <h2>Batangas State University</h2>
            <h3>The National Engineering University</h3>
            <h4>Alangilan Campus</h4>
            <h3>OFFICE OF STUDENT DISCIPLINE</h3>
            <h4>${semester} AY ${year}</h4>
          </div>
        </div>
        ${title.outerHTML}
        ${table.outerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function openLeaveofabsencePrintView() {
  const table = document.querySelector("#leaveofabsence .table-wrap table");
  const title = document.querySelector("#leaveofabsence .log-title");

  if (!table || !title) return;
  
  const { year, semester } = getAcademicPeriod();

  const printWindow = window.open("", "_blank", "width=980,height=720");
  if (!printWindow) return;

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Leave of Absence Logsheet</title>
        <style>
          @page { size: landscape; margin: 0.5in; }
          body { font-family: "Times New Roman", serif; color: #111; padding: 24px; position: relative; }
          .header-container { margin-bottom: 20px; border-bottom: 2px solid #111; padding-bottom: 10px; text-align: center; position: relative; min-height: 80px; }
          .header-logo { position: absolute; left: 120px; top: 12px; width: 80px; height: 80px; object-fit: contain; }
          .header-text { margin: 0 auto; }
          .header-text h1 { margin: 0; font-size: 14px; font-weight: normal; }
          .header-text h2 { margin: 2px 0; font-size: 16px; font-weight: bold; color: #c00; }
          .header-text h3 { margin: 2px 0; font-size: 13px; font-weight: bold; }
          .header-text h4 { margin: 2px 0; font-size: 13px; font-weight: normal; }
          .log-title { text-align: center; margin: 20px 0; }
          .log-title h2 { margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 2px; }
          .log-title h3 { margin: 4px 0 0; font-size: 16px; font-weight: bold; letter-spacing: 1px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #111; padding: 6px; text-align: center; }
          th { background: #f5f5f5; font-weight: bold; }
          thead tr:first-child th { text-transform: uppercase; }
          thead tr:first-child th:last-child { display: none; }
          tbody tr td:last-child { display: none; }
        </style>
      </head>
      <body>
        <div class="header-container">
          <img src="assets/logo.png" alt="BSU Logo" class="header-logo" />
          <div class="header-text">
            <h1>Republic of the Philippines</h1>
            <h2>Batangas State University</h2>
            <h3>The National Engineering University</h3>
            <h4>Alangilan Campus</h4>
            <h3>OFFICE OF STUDENT DISCIPLINE</h3>
            <h4>${semester} AY ${year}</h4>
          </div>
        </div>
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
      "sex",
      "contact_number",
      "complainant",
      "written_reply",
      "date_of_hearing",
      "offense",
      "sanction",
      "date_of_suspension",
      "date_of_post_counseling",
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
      "sex",
      "contact_number",
      "complainant",
      "written_reply",
      "date_of_hearing",
      "offense",
      "sanction",
      "date_of_suspension",
      "date_of_post_counseling",
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
      <td>${record.complainant || ""}</td>
      <td>${record.sex === "M" ? "✔" : ""}</td>
      <td>${record.sex === "F" ? "✔" : ""}</td>
      <td>${record.offense || ""}</td>
      <td>${record.sanction || ""}</td>
      <td>${formatDate(record.date_of_suspension)}</td>
      <td>${renderRecordActions(record.id)}</td>
    `;
    tableBody.appendChild(row);
  });
}

function renderMajorRows(records) {
  majorTableBody.innerHTML = "";
  if (!records.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="15">No records yet. Create the first entry below.</td>`;
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
      <td>${record.sex === "M" ? "✔" : ""}</td>
      <td>${record.sex === "F" ? "✔" : ""}</td>
      <td>${record.contact_number || ""}</td>
      <td>${record.complainant || ""}</td>
      <td>${record.written_reply || ""}</td>
      <td>${formatDate(record.date_of_hearing)}</td>
      <td>${record.offense || ""}</td>
      <td>${record.sanction || ""}</td>
      <td>${formatDate(record.date_of_suspension)}</td>
      <td>${formatDate(record.date_of_post_counseling)}</td>
      <td>${renderRecordActions(record.id)}</td>
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
      <td>${renderRecordActions(record.id)}</td>
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
      <td>${renderRecordActions(record.id)}</td>
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
      <td>${renderRecordActions(record.id)}</td>
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
    const matches = matchesQuery(record, ["name_of_student", "sr_code", "offense", "complainant", "year_program"], query);
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

function renderIdreplacementRows(records) {
  idreplacementTableBody.innerHTML = "";
  if (!records.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="11">No records yet. Create the first entry below.</td>`;
    idreplacementTableBody.appendChild(row);
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
      <td>${renderRecordActions(record.id)}</td>
    `;
    idreplacementTableBody.appendChild(row);
  });
}

function applyIdreplacementFilters() {
  if (!idreplacementFilter) return;
  const query = idreplacementFilter.querySelector("[data-filter='query']").value.trim();
  const from = idreplacementFilter.querySelector("[data-filter='from']").value;
  const to = idreplacementFilter.querySelector("[data-filter='to']").value;

  const filtered = idreplacementRecords.filter((record) => {
    const inRange = withinDateRange(record.date, from, to);
    const matches = matchesQuery(record, ["name", "sr_code", "course", "reason"], query);
    return inRange && matches;
  });
  renderIdreplacementRows(filtered);
}

function renderLeaveofabsenceRows(records) {
  leaveofabsenceTableBody.innerHTML = "";
  if (!records.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="11">No records yet. Create the first entry below.</td>`;
    leaveofabsenceTableBody.appendChild(row);
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
      <td>${record.semester_period_covered || ""}</td>
      <td>${renderRecordActions(record.id)}</td>
    `;
    leaveofabsenceTableBody.appendChild(row);
  });
}

function applyLeaveofabsenceFilters() {
  if (!leaveofabsenceFilter) return;
  const query = leaveofabsenceFilter.querySelector("[data-filter='query']").value.trim();
  const from = leaveofabsenceFilter.querySelector("[data-filter='from']").value;
  const to = leaveofabsenceFilter.querySelector("[data-filter='to']").value;

  const filtered = leaveofabsenceRecords.filter((record) => {
    const inRange = withinDateRange(record.date, from, to);
    const matches = matchesQuery(record, ["name", "sr_code", "course", "semester_period_covered"], query);
    return inRange && matches;
  });
  renderLeaveofabsenceRows(filtered);
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
    const archiveButton = event.target.closest("[data-action='archive']");

    if ((editButton || archiveButton) && !canEditRecords()) {
      alert("Read-only access: Head can view and export records only.");
      return;
    }

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

    if (archiveButton) {
      const id = archiveButton.dataset.id;
      if (!id) return;
      const confirmed = window.confirm("Archive this record? You can view and restore it later from the Archive page.");
      if (!confirmed) return;

    try {
      await archiveRow(tableName, id);
      await reloadFn();
      await loadDashboard();
      alert("Record archived successfully!");
    } catch (error) {
      alert(error.message || "Unable to archive record.");
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

// Academic Period Management
function getAcademicPeriod() {
  const year = localStorage.getItem("academicYear") || "2024-2025";
  const semester = localStorage.getItem("semester") || "First Semester";
  return { year, semester };
}

function setAcademicPeriod(year, semester) {
  localStorage.setItem("academicYear", year);
  localStorage.setItem("semester", semester);
}

function formatAcademicYear(input) {
  // Remove all non-digit characters
  let digits = input.replace(/\D/g, '');
  
  // Limit to 8 digits max
  if (digits.length > 8) {
    digits = digits.substring(0, 8);
  }
  
  // Format as YYYY-YYYY
  if (digits.length >= 4) {
    const firstYear = digits.substring(0, 4);
    const secondYear = digits.substring(4, 8);
    return secondYear ? `${firstYear}-${secondYear}` : firstYear;
  }
  
  return digits;
}

function updateAcademicPeriodDisplay() {
  if (!academicPeriodDisplay) return;
  const { year, semester } = getAcademicPeriod();
  academicPeriodDisplay.textContent = `${semester} AY ${year}`;
}

function initializeAcademicPeriod() {
  const { year, semester } = getAcademicPeriod();
  
  if (academicYearInput) {
    academicYearInput.value = year;
    
    academicYearInput.addEventListener("input", (e) => {
      const cursorPosition = e.target.selectionStart;
      const oldValue = e.target.value;
      const formatted = formatAcademicYear(e.target.value);
      
      e.target.value = formatted;
      
      // Adjust cursor position after formatting
      let newCursorPosition = cursorPosition;
      if (formatted.length > oldValue.length && cursorPosition === 5) {
        newCursorPosition = 6; // Move cursor after the hyphen
      }
      e.target.setSelectionRange(newCursorPosition, newCursorPosition);
      
      setAcademicPeriod(formatted, getAcademicPeriod().semester);
      updateAcademicPeriodDisplay();
    });
    
    academicYearInput.addEventListener("blur", (e) => {
      // Ensure proper format on blur
      const formatted = formatAcademicYear(e.target.value);
      e.target.value = formatted;
      setAcademicPeriod(formatted, getAcademicPeriod().semester);
      updateAcademicPeriodDisplay();
    });
  }
  
  if (semesterSelect) {
    semesterSelect.value = semester;
    semesterSelect.addEventListener("change", (e) => {
      const newSemester = e.target.value;
      setAcademicPeriod(getAcademicPeriod().year, newSemester);
      updateAcademicPeriodDisplay();
    });
  }
  
  updateAcademicPeriodDisplay();
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

async function loadIdreplacementRecords() {
  try {
    idreplacementRecords = await fetchTableRows(TABLES.idreplacement, "date");
    applyIdreplacementFilters();
    updateDashboardCounters();
  } catch (error) {
    idreplacementRecords = [];
    renderIdreplacementRows([]);
    updateDashboardCounters();
  }
}

async function loadLeaveofabsenceRecords() {
  try {
    leaveofabsenceRecords = await fetchTableRows(TABLES.leaveofabsence, "date");
    applyLeaveofabsenceFilters();
    updateDashboardCounters();
  } catch (error) {
    leaveofabsenceRecords = [];
    renderLeaveofabsenceRows([]);
    updateDashboardCounters();
  }
}

async function reloadAllDataForCurrentScope() {
  await loadRecords();
  await loadMajorRecords();
  await loadUniformRecords();
  await loadGatepassRecords();
  await loadGoodmoralRecords();
  await loadIdreplacementRecords();
  await loadLeaveofabsenceRecords();
  await loadDashboard();
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

// Back to Dashboard button
const backToDashboardBtn = document.getElementById("back-to-dashboard-btn");
if (backToDashboardBtn) {
  backToDashboardBtn.addEventListener("click", () => {
    switchTab("dashboard");
  });
}

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
    if (!canEditRecords()) {
      formStatus.textContent = "Read-only access: Head can view and export only.";
      return;
    }
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
    if (!canEditRecords()) {
      majorStatus.textContent = "Read-only access: Head can view and export only.";
      return;
    }
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
    if (!canEditRecords()) {
      uniformStatus.textContent = "Read-only access: Head can view and export only.";
      return;
    }
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
    if (!canEditRecords()) {
      gatepassStatus.textContent = "Read-only access: Head can view and export only.";
      return;
    }
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
    if (!canEditRecords()) {
      goodmoralStatus.textContent = "Read-only access: Head can view and export only.";
      return;
    }
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

if (idreplacementForm) {
  idreplacementForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!canEditRecords()) {
      idreplacementStatus.textContent = "Read-only access: Head can view and export only.";
      return;
    }
    idreplacementStatus.textContent = "Saving record...";
    const formData = new FormData(idreplacementForm);
    const payload = Object.fromEntries(formData.entries());
    const editId = idreplacementForm.dataset.editId;

    try {
      if (editId) await updateRow(TABLES.idreplacement, editId, payload);
      else await createRow(TABLES.idreplacement, payload);

      setFormEditState(idreplacementForm, false);
      idreplacementStatus.textContent = editId ? "Record updated." : "Record saved.";
      await loadIdreplacementRecords();
      await loadDashboard();
    } catch (error) {
      idreplacementStatus.textContent = error.message || "Something went wrong. Please try again.";
    }
  });
}

if (leaveofabsenceForm) {
  leaveofabsenceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!canEditRecords()) {
      leaveofabsenceStatus.textContent = "Read-only access: Head can view and export only.";
      return;
    }
    leaveofabsenceStatus.textContent = "Saving record...";
    const formData = new FormData(leaveofabsenceForm);
    const payload = Object.fromEntries(formData.entries());
    const editId = leaveofabsenceForm.dataset.editId;

    try {
      if (editId) await updateRow(TABLES.leaveofabsence, editId, payload);
      else await createRow(TABLES.leaveofabsence, payload);

      setFormEditState(leaveofabsenceForm, false);
      leaveofabsenceStatus.textContent = editId ? "Record updated." : "Record saved.";
      await loadLeaveofabsenceRecords();
      await loadDashboard();
    } catch (error) {
      leaveofabsenceStatus.textContent = error.message || "Something went wrong. Please try again.";
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

if (exportUniformButton) {
  exportUniformButton.addEventListener("click", () => {
    openUniformPrintView();
  });
}

if (exportGatepassButton) {
  exportGatepassButton.addEventListener("click", () => {
    openGatepassPrintView();
  });
}

if (exportGoodmoralButton) {
  exportGoodmoralButton.addEventListener("click", () => {
    openGoodmoralPrintView();
  });
}

if (exportIdreplacementButton) {
  exportIdreplacementButton.addEventListener("click", () => {
    openIdreplacementPrintView();
  });
}

if (exportLeaveofabsenceButton) {
  exportLeaveofabsenceButton.addEventListener("click", () => {
    openLeaveofabsencePrintView();
  });
}

document.querySelectorAll("[data-archive]").forEach((button) => {
  button.addEventListener("click", () => {
    exportArchiveCsv(button.dataset.archive);
  });
});

reloadAllDataForCurrentScope();
updateDashboardCounters();
initializeAcademicPeriod();

setupFilters(minorFilter, applyMinorFilters);
setupFilters(majorFilter, applyMajorFilters);
setupFilters(uniformFilter, applyUniformFilters);
setupFilters(gatepassFilter, applyGatepassFilters);
setupFilters(goodmoralFilter, applyGoodmoralFilters);
setupFilters(idreplacementFilter, applyIdreplacementFilters);
setupFilters(leaveofabsenceFilter, applyLeaveofabsenceFilters);

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

attachRowActions({
  tableElement: idreplacementTableBody,
  tableName: TABLES.idreplacement,
  getRecords: () => idreplacementRecords,
  form: idreplacementForm,
  fields: ["date", "time_in", "time_out", "name", "sr_code", "course", "sex", "reason"],
  reloadFn: loadIdreplacementRecords,
});

attachRowActions({
  tableElement: leaveofabsenceTableBody,
  tableName: TABLES.leaveofabsence,
  getRecords: () => leaveofabsenceRecords,
  form: leaveofabsenceForm,
  fields: ["date", "time_in", "time_out", "name", "sr_code", "course", "sex", "semester_period_covered"],
  reloadFn: loadLeaveofabsenceRecords,
});

attachCancelEdit(recordForm);
attachCancelEdit(majorForm);
attachCancelEdit(uniformForm);
attachCancelEdit(gatepassForm);
attachCancelEdit(goodmoralForm);
attachCancelEdit(idreplacementForm);
attachCancelEdit(leaveofabsenceForm);

// Check page access by role
(async function checkAdminUser() {
  const supabase = await getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  if (!session) {
    window.location.href = "login.html";
    return;
  }
  
  // Admin should use admin page. Head and coordinator use this page.
  try {
    const { data: userAccount } = await supabase
      .from("user_accounts")
      .select("role, organization_id, organizations(name)")
      .eq("user_id", session.user.id)
      .single();

    if (userAccount?.role) {
      currentUserRole = String(userAccount.role || "").trim().toLowerCase();
      localStorage.setItem("userRole", currentUserRole);
    }

    hasGlobalHeadAccess =
      String(userAccount?.role || "").trim().toLowerCase() === ROLE_HEAD &&
      String(userAccount?.organizations?.name || "").trim().toLowerCase() === "alangilan";
    
    if (userAccount && userAccount.organization_id) {
      localStorage.setItem("organizationId", String(userAccount.organization_id));
      currentOrganizationId = userAccount.organization_id;
    }

    if (userAccount && userAccount.role === ROLE_ADMIN) {
      alert("Admin account detected. Redirecting to Admin page...");
      window.location.href = "admin.html";
      return;
    }

    if (userAccount && userAccount.role === ROLE_HEAD) {
      applyHeadInterfaceRestrictions();
      await initializeHeadOrganizationFilter();
      await reloadAllDataForCurrentScope();
    }
  } catch (error) {
    // user_accounts table doesn't exist or RLS blocking - ignore and continue
    console.log("Could not check user role, continuing anyway");
  }
})();
