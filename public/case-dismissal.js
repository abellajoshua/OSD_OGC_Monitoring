import { getSupabase } from "./supabaseClient.js?v=4";

const menuButton = document.querySelector("#case-dismissal-menu-btn");
const drawer = document.querySelector("#case-dismissal-drawer");
const drawerOverlay = document.querySelector("#case-dismissal-drawer-overlay");
const drawerCloseButton = document.querySelector("#case-dismissal-drawer-close");
const logoutButton = document.querySelector("#logout-btn");
const academicYearInput = document.querySelector("#case-dismissal-academic-year");
const semesterSelect = document.querySelector("#case-dismissal-semester");
const periodDisplay = document.querySelector("#case-dismissal-period-display");
const headOrgFilterGroup = document.querySelector("#case-dismissal-org-filter-group");
const headOrgFilterSelect = document.querySelector("#case-dismissal-org-filter");
const tableBody = document.querySelector("#case-dismissal-table-body");
const filterBar = document.querySelector("[data-filter-scope='case-dismissal']");
const refreshButton = document.querySelector("#refresh-dismissal");
const brandTitle = document.querySelector(".brand-title");

let currentOrganizationId = null;
let currentUserRole = localStorage.getItem("userRole") || "";
let dismissedCases = [];
let selectedHeadOrganizationId = null;
let headFilterInitialized = false;
let canUseDismissalApi = window.location.hostname !== "localhost";

async function parseApiResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {
      raw: text,
      error: `Non-JSON response received (${response.status}).`,
    };
  }
}

function normalizeSemesterLabel(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw === "first" || raw === "1st" || raw.includes("first")) return "First Semester";
  if (raw === "second" || raw === "2nd" || raw.includes("second")) return "Second Semester";
  if (raw === "summer" || raw.includes("summer")) return "Summer Class";
  return "";
}

function getSemesterCandidates(value) {
  const normalized = normalizeSemesterLabel(value);
  if (!normalized) return [];

  const variants = [normalized];
  if (normalized === "First Semester") variants.push("1st Semester");
  if (normalized === "Second Semester") variants.push("2nd Semester");
  return Array.from(new Set(variants));
}

function filterByAcademicPeriod(records, period) {
  const expectedYear = String(period?.year || "").trim();
  const expectedSemester = normalizeSemesterLabel(period?.semester);

  if (!expectedYear || !expectedSemester) {
    return [];
  }

  return (records || []).filter((record) => {
    const recordYear = String(record?.academic_year || "").trim();
    const recordSemester = normalizeSemesterLabel(record?.semester);
    return recordYear === expectedYear && recordSemester === expectedSemester;
  });
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
    academicYearInput.addEventListener("change", async () => {
      const value = String(academicYearInput.value || "").trim() || "2024-2025";
      localStorage.setItem("academicYear", value);
      renderAcademicPeriodHeader();
      await loadDismissedCases();
    });
  }

  if (semesterSelect) {
    semesterSelect.addEventListener("change", async () => {
      const value = normalizeSemesterLabel(semesterSelect.value) || "First Semester";
      localStorage.setItem("semester", value);
      renderAcademicPeriodHeader();
      await loadDismissedCases();
    });
  }
}

function setDrawerOpen(isOpen) {
  if (!drawer || !drawerOverlay || !menuButton) return;

  if (!isOpen) {
    if (drawer.contains(document.activeElement) && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }
    drawer.setAttribute("inert", "");
  } else {
    drawer.removeAttribute("inert");
  }

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

function isHeadRole() {
  return getCurrentUserContext().role === "head";
}

function isAlangilanCampusOrganization(org) {
  const name = String(org?.name || "").trim().toLowerCase();
  const type = String(org?.type || "").trim().toLowerCase();
  return name === "alangilan" && type === "campus";
}

function canManageDismissals() {
  return getCurrentUserContext().role === "coordinator";
}

function canViewDismissals() {
  const role = getCurrentUserContext().role;
  return role === "coordinator" || role === "head";
}

function getScopedDismissalOrganizationId() {
  if (isHeadRole()) {
    return selectedHeadOrganizationId || null;
  }
  return currentOrganizationId || null;
}

async function initializeHeadOrganizationFilter() {
  if (!isHeadRole() || !headOrgFilterGroup || !headOrgFilterSelect) {
    if (headOrgFilterGroup) {
      headOrgFilterGroup.style.display = "none";
    }
    selectedHeadOrganizationId = null;
    return;
  }

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, type")
    .order("type", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to load organizations for case dismissal filter:", error);
    return;
  }

  const organizations = Array.isArray(data) ? data : [];
  const visibleOrganizations = organizations.filter((org) => !isAlangilanCampusOrganization(org));

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
    headOrgFilterSelect.value = String(selectedHeadOrganizationId);
    localStorage.setItem("headOrganizationFilterId", String(selectedHeadOrganizationId));
  } else {
    headOrgFilterSelect.value = "";
    localStorage.removeItem("headOrganizationFilterId");
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
      await loadDismissedCases();
    });
    headFilterInitialized = true;
  }
}

function applyDismissalInterfaceByRole() {
  const role = getCurrentUserContext().role;

  if (brandTitle) {
    brandTitle.textContent = role === "head"
      ? "OSD & OGC Monitoring - Head (View Only)"
      : "OSD & OGC Monitoring - Coordinator";
  }

  if (role === "head") {
    document.querySelectorAll('a[href="archived-records.html"]').forEach((link) => link.remove());
  }
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

  if (!canViewDismissals()) {
    alert("Access denied. Case dismissal page is available for coordinators and heads only.");
    window.location.href = "index.html";
    return false;
  }

  applyDismissalInterfaceByRole();
  await initializeHeadOrganizationFilter();

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
        <td>${canManageDismissals()
          ? `<button class="btn-restore" type="button" data-action="restore" data-id="${escapeHtml(String(record.id || ""))}">Restore</button>`
          : '<span class="text-muted">Read Only</span>'}
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

async function getValidAccessToken() {
  const supabase = await getSupabase();
  let {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    return session.access_token;
  }

  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) {
    return "";
  }

  session = refreshData?.session || null;
  return session?.access_token || "";
}

async function fetchDismissedCasesWithAuth(queryString) {
  if (!canUseDismissalApi) {
    return { response: null, tokenMissing: false };
  }

  const token = await getValidAccessToken();
  if (!token) {
    return { response: null, tokenMissing: true };
  }

  let response = await fetch(`/api/case-dismissal?${queryString}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (response.status === 401) {
    // Stop using the API endpoint after an unauthorized response to avoid noisy repeated 401 logs.
    canUseDismissalApi = false;
    return { response: null, tokenMissing: false };
  }

  return { response, tokenMissing: false };
}

async function loadDismissedCases() {
  try {
    const supabase = await getSupabase();

    const period = getAcademicPeriod();
    const query = new URLSearchParams({
      academic_year: period.year,
      semester: period.semester,
    });
    const scopedOrganizationId = getScopedDismissalOrganizationId();
    if (scopedOrganizationId) {
      query.set("organization_id", String(scopedOrganizationId));
    }

    const { response, tokenMissing } = await fetchDismissedCasesWithAuth(query.toString());

    if (tokenMissing) {
      throw new Error("Auth session missing!");
    }

    if (response && response.ok) {
      const data = await parseApiResponse(response);
      renderDismissedRows(filterByAcademicPeriod(Array.isArray(data) ? data : [], period));
      return;
    }

    if (response && response.status !== 404) {
      const errorData = await parseApiResponse(response);
      throw new Error(errorData?.error || `Case dismissal request failed (${response.status}).`);
    }

    // Fallback for local servers still running old route map or auth edge cases.
    const fallbackScopedOrganizationId = getScopedDismissalOrganizationId();
    if (!isHeadRole() && !fallbackScopedOrganizationId) {
      renderDismissedRows([]);
      return;
    }

    const semesterCandidates = getSemesterCandidates(period.semester);
    let fallbackQuery = supabase
      .from("major_offenses")
      .select("*")
      .eq("status", "dismissed")
      .eq("archived", true)
      .eq("academic_year", period.year)
      .order("date_of_complaint", { ascending: false })
      .order("id", { ascending: false });

    if (fallbackScopedOrganizationId) {
      fallbackQuery = fallbackQuery.eq("organization_id", fallbackScopedOrganizationId);
    }

    if (semesterCandidates.length) {
      fallbackQuery = fallbackQuery.in("semester", semesterCandidates);
    }

    const { data: fallbackData, error: fallbackError } = await fallbackQuery;
    if (fallbackError) throw fallbackError;

    renderDismissedRows(filterByAcademicPeriod(Array.isArray(fallbackData) ? fallbackData : [], period));
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
