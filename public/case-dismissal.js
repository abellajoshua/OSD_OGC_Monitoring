import { getSupabase } from "./supabaseClient.js?v=4";

const menuButton = document.querySelector("#case-dismissal-menu-btn");
const drawer = document.querySelector("#case-dismissal-drawer");
const drawerOverlay = document.querySelector("#case-dismissal-drawer-overlay");
const drawerCloseButton = document.querySelector("#case-dismissal-drawer-close");
const logoutButton = document.querySelector("#logout-btn");
const academicYearInput = document.querySelector("#case-dismissal-academic-year");
const semesterSelect = document.querySelector("#case-dismissal-semester");
const periodDisplay = document.querySelector("#case-dismissal-period-display");
const tableBody = document.querySelector("#case-dismissal-table-body");
const filterBar = document.querySelector("[data-filter-scope='case-dismissal']");
const refreshButton = document.querySelector("#refresh-dismissal");

let currentOrganizationId = null;
let currentUserRole = localStorage.getItem("userRole") || "";
let dismissedCases = [];

function normalizeSemesterLabel(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw === "first" || raw === "1st" || raw.includes("first")) return "First Semester";
  if (raw === "second" || raw === "2nd" || raw.includes("second")) return "Second Semester";
  if (raw === "summer" || raw.includes("summer")) return "Summer Class";
  return "";
}

function getAcademicPeriod() {
  const year = localStorage.getItem("academicYear") || "2024-2025";
  const semester = normalizeSemesterLabel(localStorage.getItem("semester")) || "First Semester";
  return { year, semester };
}

function renderAcademicPeriodHeader() {
  const period = getAcademicPeriod();
  if (academicYearInput) academicYearInput.value = period.year;
  if (semesterSelect) semesterSelect.value = period.semester;
  if (periodDisplay) periodDisplay.textContent = `${period.semester} AY ${period.year}`;
}

function initializeAcademicPeriodHeader() {
  renderAcademicPeriodHeader();

  if (academicYearInput) {
    academicYearInput.addEventListener("change", () => {
      const value = String(academicYearInput.value || "").trim() || "2024-2025";
      localStorage.setItem("academicYear", value);
      renderAcademicPeriodHeader();
    });
  }

  if (semesterSelect) {
    semesterSelect.addEventListener("change", () => {
      const value = normalizeSemesterLabel(semesterSelect.value) || "First Semester";
      localStorage.setItem("semester", value);
      renderAcademicPeriodHeader();
    });
  }
}

function setDrawerOpen(isOpen) {
  if (!drawer || !drawerOverlay || !menuButton) return;
  drawer.classList.toggle("is-open", isOpen);
  drawer.setAttribute("aria-hidden", String(!isOpen));
  drawerOverlay.hidden = !isOpen;
  menuButton.setAttribute("aria-expanded", String(isOpen));
}

if (menuButton) {
  menuButton.addEventListener("click", () => setDrawerOpen(true));
}

if (drawerCloseButton) {
  drawerCloseButton.addEventListener("click", () => setDrawerOpen(false));
}

if (drawerOverlay) {
  drawerOverlay.addEventListener("click", () => setDrawerOpen(false));
}

if (drawer) {
  drawer.querySelectorAll(".nav-btn").forEach((link) => {
    link.addEventListener("click", () => {
      setDrawerOpen(false);
    });
  });
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = String(value ?? "");
  return element.innerHTML;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function matchesQuery(record, fields, query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  if (!normalizedQuery) return true;

  return fields.some((field) => String(record[field] || "").toLowerCase().includes(normalizedQuery));
}

function withinDateRange(value, from, to) {
  if (!from && !to) return true;
  if (!value) return false;
  const dateValue = new Date(value);
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

function formatStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "active") return "Active";
  if (normalized === "dismissed") return "Dismissed";
  return value ? String(value) : "Dismissed";
}

function getCurrentUserContext() {
  return {
    role: String(currentUserRole || "").trim().toLowerCase(),
    organizationId: currentOrganizationId,
  };
}

function canManageDismissals() {
  return getCurrentUserContext().role === "coordinator";
}

async function requireDismissalAccess() {
  const supabase = await getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "login.html";
    return false;
  }

  const { data: account } = await supabase
    .from("user_accounts")
    .select("role, organization_id")
    .eq("user_id", session.user.id)
    .single();

  currentUserRole = String(account?.role || currentUserRole || "").trim().toLowerCase();
  currentOrganizationId = account?.organization_id || null;

  if (currentOrganizationId) {
    localStorage.setItem("organizationId", String(currentOrganizationId));
  }
  if (currentUserRole) {
    localStorage.setItem("userRole", currentUserRole);
  }

  if (!canManageDismissals()) {
    alert("Access denied. Case dismissal management is limited to coordinators.");
    window.location.href = "index.html";
    return false;
  }

  return true;
}

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    const supabase = await getSupabase();
    await supabase.auth.signOut();
    window.location.href = "login.html";
  });
}

async function getOrganizationId() {
  if (currentOrganizationId) return currentOrganizationId;

  const supabase = await getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  const { data: account } = await supabase
    .from("user_accounts")
    .select("organization_id")
    .eq("user_id", session.user.id)
    .single();

  currentOrganizationId = account?.organization_id || null;
  return currentOrganizationId;
}

function renderDismissedRows(records) {
  if (!tableBody) return;
  dismissedCases = records;

  if (!records.length) {
    tableBody.innerHTML = '<tr><td colspan="14" class="text-center py-4 text-muted">No dismissed cases found.</td></tr>';
    return;
  }

  tableBody.innerHTML = records
    .map(
      (record) => `
      <tr>
        <td>${escapeHtml(formatDate(record.date_of_complaint))}</td>
        <td>${escapeHtml(String(record.name_of_student || ""))}</td>
        <td>${escapeHtml(String(record.sr_code || ""))}</td>
        <td>${escapeHtml(String(record.year_program || ""))}</td>
        <td>${escapeHtml(String(record.sex || ""))}</td>
        <td>${escapeHtml(String(record.contact_number || ""))}</td>
        <td>${escapeHtml(String(record.complainant || ""))}</td>
        <td>${escapeHtml(String(record.written_reply || ""))}</td>
        <td>${escapeHtml(formatDate(record.date_of_hearing))}</td>
        <td>${escapeHtml(String(record.offense || ""))}</td>
        <td>${escapeHtml(String(record.sanction || ""))}</td>
        <td>${escapeHtml(formatDate(record.date_of_suspension))}</td>
        <td>${escapeHtml(formatDate(record.date_of_post_counseling))}</td>
        <td>
          <button class="btn-restore" type="button" data-action="restore" data-id="${escapeHtml(String(record.id || ""))}">Restore</button>
        </td>
      </tr>
    `
    )
    .join("");
}

function getFilteredDismissedRows() {
  if (!filterBar) return dismissedCases;

  const query = filterBar.querySelector("[data-filter='query']")?.value.trim() || "";
  const from = filterBar.querySelector("[data-filter='from']")?.value || "";
  const to = filterBar.querySelector("[data-filter='to']")?.value || "";

  return dismissedCases.filter((record) => {
    const inRange = withinDateRange(record.date_of_complaint, from, to);
    const matches = matchesQuery(record, ["name_of_student", "sr_code", "offense", "sanction", "complainant"], query);
    return inRange && matches;
  });
}

function applyFilters() {
  renderDismissedRows(getFilteredDismissedRows());
}

async function loadDismissedCases() {
  try {
    const supabase = await getSupabase();
    const organizationId = await getOrganizationId();
    if (!organizationId) {
      renderDismissedRows([]);
      return;
    }

    let query = supabase
      .from("major_offenses")
      .select("*")
      .eq("status", "dismissed")
      .eq("organization_id", organizationId)
      .order("date_of_complaint", { ascending: false })
      .order("id", { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    renderDismissedRows(data || []);
  } catch (error) {
    console.error("Failed to load dismissed cases:", error);
    renderDismissedRows([]);
  }
}

async function restoreCase(recordId) {
  if (!canManageDismissals()) {
    alert("Read-only access: Head can view records only.");
    return;
  }

  const confirmed = window.confirm("Restore this case back to Major Offense?");
  if (!confirmed) return;

  try {
    const supabase = await getSupabase();
    const organizationId = await getOrganizationId();
    let query = supabase.from("major_offenses").update({ archived: false, status: "active" }).eq("id", recordId);
    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }

    const { error } = await query;
    if (error) throw error;

    await loadDismissedCases();
  } catch (error) {
    console.error("Failed to restore case:", error);
    alert(error.message || "Unable to restore case.");
  }
}

if (tableBody) {
  tableBody.addEventListener("click", (event) => {
    const restoreButton = event.target.closest("[data-action='restore']");

    if (restoreButton) {
      restoreCase(restoreButton.dataset.id);
    }
  });
}

if (refreshButton) {
  refreshButton.addEventListener("click", () => {
    loadDismissedCases();
  });
}

if (filterBar) {
  const queryInput = filterBar.querySelector("[data-filter='query']");
  const fromInput = filterBar.querySelector("[data-filter='from']");
  const toInput = filterBar.querySelector("[data-filter='to']");
  const applyButton = filterBar.querySelector("[data-filter='apply']");
  const clearButton = filterBar.querySelector("[data-filter='clear']");

  [queryInput, fromInput, toInput].forEach((input) => {
    input?.addEventListener("input", applyFilters);
  });

  applyButton?.addEventListener("click", applyFilters);
  clearButton?.addEventListener("click", () => {
    if (queryInput) queryInput.value = "";
    if (fromInput) fromInput.value = "";
    if (toInput) toInput.value = "";
    applyFilters();
  });
}

requireDismissalAccess()
  .then((allowed) => {
    if (!allowed) return;
    initializeAcademicPeriodHeader();
    loadDismissedCases();
  })
  .catch((error) => {
    console.error("Dismissal access error:", error);
    window.location.href = "login.html";
  });
