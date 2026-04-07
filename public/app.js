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
const analyticsTotalRecords = document.querySelector("#analytics-total-records");
const analyticsResolutionRate = document.querySelector("#analytics-resolution-rate");
const analyticsPendingActions = document.querySelector("#analytics-pending-actions");
const analyticsRecentShare = document.querySelector("#analytics-recent-share");
const analyticsGoodMoralFlags = document.querySelector("#analytics-goodmoral-flags");
const analyticsModulePill = document.querySelector("#analytics-module-pill");
const analyticsTrendPill = document.querySelector("#analytics-trend-pill");
const analyticsTrendCard = document.querySelector("#analytics-trend-card");
const analyticsTrendChange = document.querySelector("#analytics-trend-change");
const analyticsTrendLabel = document.querySelector("#analytics-trend-label");
const analyticsModuleChart = document.querySelector("#analytics-module-chart");
const analyticsTrendChart = document.querySelector("#analytics-trend-chart");
const analyticsStatusChart = document.querySelector("#analytics-status-chart");
const analyticsTopOffense = document.querySelector("#analytics-top-offense");
const analyticsTopOffenseCount = document.querySelector("#analytics-top-offense-count");
const analyticsBusiestDay = document.querySelector("#analytics-busiest-day");
const analyticsBusiestDayCount = document.querySelector("#analytics-busiest-day-count");
const analyticsAttentionModule = document.querySelector("#analytics-attention-module");
const analyticsAttentionModuleCount = document.querySelector("#analytics-attention-module-count");
const analyticsOpsNote = document.querySelector("#analytics-ops-note");
const analyticsRefreshStamp = document.querySelector("#analytics-refresh-stamp");
const analyticsInsightCards = document.querySelectorAll(".analytics-insight-card[data-insight]");
const analyticsInsightModal = document.querySelector("#analytics-insight-modal");
const analyticsInsightModalTitle = document.querySelector("#analytics-insight-modal-title");
const analyticsInsightModalBody = document.querySelector("#analytics-insight-modal-body");
let activeInsightContext = null;

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

const ANALYTICS_MODULES = [
  { key: "minor", label: "Minor Offense", color: "#ca8a04" },
  { key: "major", label: "Major Offense", color: "#ec4899" },
  { key: "uniform", label: "Non-Wearing Uniform", color: "#0891b2" },
  { key: "gatepass", label: "Gatepass", color: "#0f766e" },
  { key: "goodmoral", label: "Good Moral", color: "#1d4ed8" },
  { key: "idreplacement", label: "ID Replacement", color: "#64748b" },
  { key: "leaveofabsence", label: "Leave of Absence", color: "#059669" },
];

const ANALYTICS_MODULE_COLOR_MAP = Object.fromEntries(
  ANALYTICS_MODULES.map((module) => [module.key, module.color])
);

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
let analyticsSummary = null;
const ACTIVE_TAB_STORAGE_KEY = "activeTab";

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
  const period = getAcademicPeriodRange();
  const attempts = [
    { useArchived: true, useAcademicColumns: true, useDateRange: false },
    { useArchived: false, useAcademicColumns: true, useDateRange: false },
    { useArchived: true, useAcademicColumns: false, useDateRange: true },
    { useArchived: false, useAcademicColumns: false, useDateRange: true },
  ];

  let lastError = null;

  for (const attempt of attempts) {
    let query = supabase.from(table).select("*");

    if (attempt.useArchived) {
      query = query.eq("archived", false);
    }
    if (orgId) {
      query = query.eq("organization_id", orgId);
    }

    if (period) {
      if (attempt.useAcademicColumns) {
        query = query.eq("academic_year", period.year).eq("semester", period.semester);
      } else if (attempt.useDateRange && dateColumn) {
        query = query.gte(dateColumn, period.startDate).lte(dateColumn, period.endDate);
      }
    }

    const { data, error } = await query
      .order(primaryOrderColumn, { ascending: false })
      .order("id", { ascending: false });

    if (!error) {
      return data || [];
    }

    lastError = error;
    const message = String(error.message || "").toLowerCase();

    if (attempt.useArchived && !message.includes("archived")) {
      continue;
    }

    if (attempt.useAcademicColumns && !(message.includes("academic_year") || message.includes("semester"))) {
      continue;
    }
  }

  if (lastError) throw lastError;
  return [];
}

async function createRow(table, payload) {
  ensureCoordinatorAccess();
  const supabase = await getSupabase();
  const orgId = await getCurrentOrganizationId();
  const period = getAcademicPeriodRange();
  const safePayload = {
    ...payload,
    organization_id: orgId,
    ...(period ? { academic_year: period.year, semester: period.semester } : {}),
  };

  let { error } = await supabase.from(table).insert(safePayload);

  if (error) {
    const message = String(error.message || "").toLowerCase();
    if (message.includes("academic_year") || message.includes("semester")) {
      const fallbackPayload = { ...payload, organization_id: orgId };
      ({ error } = await supabase.from(table).insert(fallbackPayload));
    }
  }

  if (error) throw error;
}

async function updateRow(table, id, payload) {
  ensureCoordinatorAccess();
  const supabase = await getSupabase();
  const orgId = await getCurrentOrganizationId();
  const { organization_id, academic_year, semester, ...safePayload } = payload;
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

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = String(value ?? "");
  return element.innerHTML;
}

function hasTab(targetId) {
  return [...tabs].some((tab) => tab.id === targetId);
}

function getPreferredTab() {
  const storedTab = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
  if (storedTab && hasTab(storedTab)) {
    return storedTab;
  }

  const currentActiveTab = [...tabs].find((tab) => tab.classList.contains("active"));
  if (currentActiveTab) {
    return currentActiveTab.id;
  }

  return "dashboard";
}

function switchTab(targetId, options = {}) {
  const { persist = true } = options;
  if (!hasTab(targetId)) return;

  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.id === targetId);
  });
  navButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === targetId);
  });

  if (persist) {
    localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, targetId);
  }
  
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

function isRecordCompleted(moduleKey, record) {
  if (moduleKey === "minor" || moduleKey === "major") {
    return Boolean(String(record.sanction || "").trim() && String(record.date_of_suspension || "").trim());
  }

  return Boolean(String(record.time_out || "").trim());
}

function getAnalyticsEntries() {
  return [
    ...minorRecords.map((record) => ({ moduleKey: "minor", label: "Minor Offense", record })),
    ...majorRecords.map((record) => ({ moduleKey: "major", label: "Major Offense", record })),
    ...uniformRecords.map((record) => ({ moduleKey: "uniform", label: "Non-Wearing Uniform", record })),
    ...gatepassRecords.map((record) => ({ moduleKey: "gatepass", label: "Gatepass", record })),
    ...goodmoralRecords.map((record) => ({ moduleKey: "goodmoral", label: "Good Moral", record })),
    ...idreplacementRecords.map((record) => ({ moduleKey: "idreplacement", label: "ID Replacement", record })),
    ...leaveofabsenceRecords.map((record) => ({ moduleKey: "leaveofabsence", label: "Leave of Absence", record })),
  ].map((entry) => ({
    ...entry,
    date: normalizeDateValue(entry.record),
    completed: isRecordCompleted(entry.moduleKey, entry.record),
  }));
}

function getAnalyticsModuleRows() {
  return ANALYTICS_MODULES.map((module) => {
    const records =
      module.key === "minor"
        ? minorRecords
        : module.key === "major"
          ? majorRecords
          : module.key === "uniform"
            ? uniformRecords
            : module.key === "gatepass"
              ? gatepassRecords
              : module.key === "goodmoral"
                ? goodmoralRecords
                : module.key === "idreplacement"
                  ? idreplacementRecords
                  : leaveofabsenceRecords;
    const completed = records.filter((record) => isRecordCompleted(module.key, record)).length;

    return {
      ...module,
      count: records.length,
      completed,
      pending: Math.max(records.length - completed, 0),
    };
  });
}

function getModuleRecords(moduleKey) {
  if (moduleKey === "minor") return minorRecords;
  if (moduleKey === "major") return majorRecords;
  if (moduleKey === "uniform") return uniformRecords;
  if (moduleKey === "gatepass") return gatepassRecords;
  if (moduleKey === "goodmoral") return goodmoralRecords;
  if (moduleKey === "idreplacement") return idreplacementRecords;
  return leaveofabsenceRecords;
}

function getModuleTrendStats(records, moduleKey) {
  const today = new Date();
  const currentStart = getDaysAgo(today, 6);
  const currentEnd = new Date(today);
  currentEnd.setHours(23, 59, 59, 999);
  const previousStart = getDaysAgo(today, 13);
  const previousEnd = getDaysAgo(today, 6);
  const datedRecords = records
    .map((record) => ({ record, date: moduleKey === "minor" || moduleKey === "major" ? record.date_of_complaint : record.date }))
    .filter((entry) => toSafeDate(entry.date));

  const currentCount = datedRecords.filter((entry) => {
    const date = toSafeDate(entry.date);
    return date && date >= currentStart && date <= currentEnd;
  }).length;

  const previousCount = datedRecords.filter((entry) => {
    const date = toSafeDate(entry.date);
    return date && date >= previousStart && date < previousEnd;
  }).length;

  let percent = 0;
  if (!previousCount && currentCount) {
    percent = 100;
  } else if (previousCount) {
    percent = Math.round(((currentCount - previousCount) / previousCount) * 100);
  }
  percent = clampPercent(percent);

  const direction = percent > 0 ? "up" : percent < 0 ? "down" : "neutral";

  return {
    currentCount,
    previousCount,
    percent,
    direction,
  };
}

function getDaysAgo(date, dayOffset) {
  const clone = new Date(date);
  clone.setHours(0, 0, 0, 0);
  clone.setDate(clone.getDate() - dayOffset);
  return clone;
}

function toSafeDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function clampPercent(value) {
  const numeric = Number(value) || 0;
  if (numeric > 100) return 100;
  if (numeric < -100) return -100;
  return numeric;
}

function getModuleColor(moduleKey) {
  return ANALYTICS_MODULE_COLOR_MAP[moduleKey] || "#64748b";
}

function hexToRgba(hex, alpha) {
  const normalized = String(hex || "").replace("#", "").trim();
  const isShort = normalized.length === 3;
  const isLong = normalized.length === 6;
  if (!isShort && !isLong) return `rgba(100, 116, 139, ${alpha})`;

  const parts = isShort
    ? normalized.split("").map((char) => parseInt(char + char, 16))
    : [
        parseInt(normalized.slice(0, 2), 16),
        parseInt(normalized.slice(2, 4), 16),
        parseInt(normalized.slice(4, 6), 16),
      ];

  if (parts.some((value) => Number.isNaN(value))) {
    return `rgba(100, 116, 139, ${alpha})`;
  }

  return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
}

function buildTrendSeries(entries, dayCount = 14) {
  const today = new Date();
  const labels = [];
  const points = [];

  for (let dayOffset = dayCount - 1; dayOffset >= 0; dayOffset -= 1) {
    const day = getDaysAgo(today, dayOffset);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    const count = entries.filter((entry) => {
      const entryDate = toSafeDate(entry.date);
      return entryDate && entryDate >= day && entryDate < nextDay;
    }).length;

    labels.push(day.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
    points.push(count);
  }

  return { labels, points };
}

function buildModuleTrendSeries(dayCount = 14) {
  const today = new Date();
  const labels = [];
  const series = ANALYTICS_MODULES.map((module) => ({
    key: module.key,
    label: module.label,
    color: module.color,
    values: [],
  }));

  for (let dayOffset = dayCount - 1; dayOffset >= 0; dayOffset -= 1) {
    const day = getDaysAgo(today, dayOffset);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    labels.push(day.toLocaleDateString("en-US", { month: "short", day: "numeric" }));

    series.forEach((moduleSeries) => {
      const records = getModuleRecords(moduleSeries.key);
      const count = records.filter((record) => {
        const rawDate = moduleSeries.key === "minor" || moduleSeries.key === "major" ? record.date_of_complaint : record.date;
        const recordDate = toSafeDate(rawDate || record.created_at);
        return recordDate && recordDate >= day && recordDate < nextDay;
      }).length;
      moduleSeries.values.push(count);
    });
  }

  return {
    labels,
    series,
  };
}

function countEntriesBetween(entries, startDate, endDate) {
  return entries.filter((entry) => {
    const entryDate = toSafeDate(entry.date);
    return entryDate && entryDate >= startDate && entryDate < endDate;
  }).length;
}

function getTopOffense() {
  const offenseCounts = new Map();

  [...minorRecords, ...majorRecords].forEach((record) => {
    const offense = String(record.offense || "").trim();
    if (!offense) return;
    offenseCounts.set(offense, (offenseCounts.get(offense) || 0) + 1);
  });

  const topOffense = [...offenseCounts.entries()].sort((left, right) => right[1] - left[1])[0];
  if (!topOffense) return null;

  return { name: topOffense[0], count: topOffense[1] };
}

function buildLocalAnalyticsSummary() {
  const entries = getAnalyticsEntries();
  const modules = getAnalyticsModuleRows();
  const totalRecords = entries.length;
  const completedRecords = entries.filter((entry) => entry.completed).length;
  const pendingRecords = Math.max(totalRecords - completedRecords, 0);
  const resolutionRate = totalRecords ? Math.round((completedRecords / totalRecords) * 100) : 0;
  const topModule = [...modules].sort((left, right) => right.count - left.count)[0] || null;
  const topOffense = getTopOffense();
  const trendSeries = buildTrendSeries(entries, 14);
  const recentStart = getDaysAgo(new Date(), 6);
  const recentEnd = new Date();
  recentEnd.setHours(23, 59, 59, 999);
  const previousStart = getDaysAgo(new Date(), 13);
  const previousEnd = getDaysAgo(new Date(), 6);
  const recentCount = countEntriesBetween(entries, recentStart, recentEnd);
  const previousCount = countEntriesBetween(entries, previousStart, previousEnd);
  const changePercent = clampPercent(
    previousCount ? Math.round(((recentCount - previousCount) / previousCount) * 100) : recentCount ? 100 : 0
  );
  const goodMoralFlags = goodmoralRecords.filter((record) => record.has_minor_offense).length;

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      totalRecords,
      completedRecords,
      pendingRecords,
      resolutionRate,
      goodMoralFlags,
    },
    modules,
    status: {
      completed: completedRecords,
      pending: pendingRecords,
    },
    trend: {
      labels: trendSeries.labels,
      values: trendSeries.points,
      recentCount,
      previousCount,
      changePercent,
    },
    insights: {
      topModule: topModule ? { key: topModule.key, label: topModule.label, count: topModule.count } : null,
      topOffense,
      recentShare: totalRecords ? Math.round((recentCount / totalRecords) * 100) : 0,
    },
  };
}

function normalizeAnalyticsSummary(data) {
  const modules = Array.isArray(data?.modules)
    ? data.modules.map((module) => ({
        key: String(module.key || ""),
        label: String(module.label || ""),
        color: getModuleColor(String(module.key || "")),
        count: Number(module.count || 0),
        completed: Number(module.completed || 0),
        pending: Number(module.pending || 0),
      }))
    : [];

  return {
    generatedAt: data?.generatedAt ? String(data.generatedAt) : new Date().toISOString(),
    totals: {
      totalRecords: Number(data?.totals?.totalRecords || 0),
      completedRecords: Number(data?.totals?.completedRecords || 0),
      pendingRecords: Number(data?.totals?.pendingRecords || 0),
      resolutionRate: Number(data?.totals?.resolutionRate || 0),
      goodMoralFlags: Number(data?.totals?.goodMoralFlags || 0),
    },
    modules,
    status: {
      completed: Number(data?.status?.completed || data?.totals?.completedRecords || 0),
      pending: Number(data?.status?.pending || data?.totals?.pendingRecords || 0),
    },
    trend: {
      labels: Array.isArray(data?.trend?.labels) ? data.trend.labels : [],
      values: Array.isArray(data?.trend?.values) ? data.trend.values.map((value) => Number(value) || 0) : [],
      recentCount: Number(data?.trend?.recentCount || 0),
      previousCount: Number(data?.trend?.previousCount || 0),
      changePercent: clampPercent(data?.trend?.changePercent),
    },
    insights: {
      topModule: data?.insights?.topModule || null,
      topOffense: data?.insights?.topOffense || null,
      recentShare: Number(data?.insights?.recentShare || 0),
    },
  };
}

function getAnalyticsSummary() {
  return analyticsSummary || buildLocalAnalyticsSummary();
}

function getBusiestDay(trend) {
  if (!trend?.values?.length || !trend?.labels?.length) return null;
  let maxIndex = 0;
  let maxValue = Number(trend.values[0] || 0);
  trend.values.forEach((value, index) => {
    const numericValue = Number(value || 0);
    if (numericValue > maxValue) {
      maxValue = numericValue;
      maxIndex = index;
    }
  });
  if (!maxValue) return null;
  return {
    label: trend.labels[maxIndex] || "--",
    count: maxValue,
  };
}

function getAttentionModule(modules) {
  if (!Array.isArray(modules) || !modules.length) return null;
  const module = [...modules].sort((left, right) => (right.pending || 0) - (left.pending || 0))[0];
  if (!module || !module.pending) return null;
  return module;
}

function getTopOffenseBreakdown(limit = 6) {
  const offenseCounts = new Map();
  [...minorRecords, ...majorRecords].forEach((record) => {
    const offense = String(record.offense || "").trim();
    if (!offense) return;
    offenseCounts.set(offense, (offenseCounts.get(offense) || 0) + 1);
  });

  return [...offenseCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function getOffenseRecords(offenseName, limit = 8) {
  const normalized = String(offenseName || "").trim().toLowerCase();
  if (!normalized) return [];

  return [
    ...minorRecords.map((record) => ({ module: "Minor Offense", record })),
    ...majorRecords.map((record) => ({ module: "Major Offense", record })),
  ]
    .map(({ module, record }) => ({
      module,
      date: normalizeDateValue(record),
      name: record.name_of_student || "",
      srCode: record.sr_code || "",
      offense: String(record.offense || "").trim(),
      rawDate: normalizeDateValue(record),
    }))
    .filter((row) => String(row.offense || "").trim().toLowerCase() === normalized)
    .sort((left, right) => {
      const leftDate = toSafeDate(left.rawDate)?.getTime() || 0;
      const rightDate = toSafeDate(right.rawDate)?.getTime() || 0;
      return rightDate - leftDate;
    })
    .slice(0, limit);
}

function getBusiestDays(limit = 6) {
  const summary = getAnalyticsSummary();
  const labels = summary?.trend?.labels || [];
  const values = summary?.trend?.values || [];
  const rows = labels
    .map((label, index) => ({ label, count: Number(values[index] || 0), index }))
    .filter((row) => row.count > 0);

  if (!rows.length) return [];

  const busiestRow = rows.reduce((best, row) => (row.count > best.count ? row : best), rows[0]);
  const remainingRows = rows
    .filter((row) => row.index !== busiestRow.index)
    .sort((left, right) => right.index - left.index);

  return [busiestRow, ...remainingRows].slice(0, limit).map(({ label, count }) => ({ label, count }));
}

function getInsightModalPayload(insightKey) {
  const analytics = getAnalyticsSummary();
  if (insightKey === "top-offense") {
    const rows = getTopOffenseBreakdown(8);
    return {
      title: "Top Offense Details",
      items: rows,
    };
  }

  if (insightKey === "busiest-day") {
    const rows = getBusiestDays(8);
    return {
      title: "Busiest Day Breakdown",
      items: rows.length
        ? rows.map((row) => ({ label: row.label, value: `${row.count} records` }))
        : [{ label: "No activity in selected window", value: "--" }],
    };
  }

  if (insightKey === "attention-module") {
    const rows = [...(analytics.modules || [])]
      .sort((left, right) => (right.pending || 0) - (left.pending || 0))
      .map((module) => ({
        label: module.label,
        value: `${module.pending} pending / ${module.count} total`,
      }));

    return {
      title: "Attention Module Details",
      items: rows.length ? rows : [{ label: "No modules available", value: "--" }],
    };
  }

  const pending = analytics.totals?.pendingRecords || 0;
  const resolution = analytics.totals?.resolutionRate || 0;
  const recentShare = analytics.insights?.recentShare || 0;
  const generatedAt = formatGeneratedAt(analytics.generatedAt);
  return {
    title: "Analyst Notes Details",
    items: [
      { label: "Pending Records", value: String(pending) },
      { label: "Resolution Rate", value: `${resolution}%` },
      { label: "Recent Activity Share", value: `${recentShare}%` },
      { label: "Last Refresh", value: generatedAt.replace("Updated ", "") },
    ],
  };
}

function openInsightModal(insightKey) {
  if (!analyticsInsightModal || !analyticsInsightModalTitle || !analyticsInsightModalBody) return;
  const payload = getInsightModalPayload(insightKey);
  activeInsightContext = insightKey;
  analyticsInsightModalTitle.textContent = payload.title;
  if (insightKey === "top-offense") {
    const items = Array.isArray(payload.items) && payload.items.length
      ? payload.items
      : [{ name: "No offense records yet", count: 0 }];

    const defaultOffense = items[0]?.name || "";
    const renderTopOffenseView = (selectedOffense) => {
      const selectedRecords = selectedOffense ? getOffenseRecords(selectedOffense, 10) : [];
      const selectedCount = items.find((item) => item.name === selectedOffense)?.count || 0;
      const selectedLabel = selectedOffense || defaultOffense || "Select an offense";

      analyticsInsightModalBody.innerHTML = `
        <div class="analytics-insight-drilldown">
          <div class="analytics-insight-drill-list">
            <div class="analytics-insight-drill-hint">Select an offense to view the matching records below.</div>
            ${items
              .map(
                (item) => `
                  <button type="button" class="analytics-insight-drill-item ${item.name === selectedOffense ? "is-active" : ""}" data-offense-row="${escapeHtml(item.name)}">
                    <strong>${escapeHtml(item.name)}</strong>
                    <span>${item.count} records</span>
                  </button>
                `
              )
              .join("")}
          </div>
          <div class="analytics-insight-records-panel">
            <div class="analytics-insight-records-head">
              <div>
                <strong>${escapeHtml(selectedLabel)}</strong>
                <span>${selectedCount} total related records</span>
              </div>
              <span class="analytics-insight-records-count">Latest first</span>
            </div>
            <div class="analytics-insight-records-list">
              ${selectedRecords.length
                ? selectedRecords
                    .map(
                      (record) => `
                        <div class="analytics-insight-record-item">
                          <div>
                            <strong>${escapeHtml(record.name)}</strong>
                            <span>${escapeHtml(record.module)} • ${escapeHtml(formatDate(record.date))}</span>
                            <small>${escapeHtml(record.offense)}</small>
                          </div>
                          <small>${escapeHtml(record.srCode)}</small>
                        </div>
                      `
                    )
                    .join("")
                : '<div class="analytics-insight-empty-state">Click an offense row to view matching records.</div>'}
            </div>
          </div>
        </div>
      `;
    };

    analyticsInsightModalBody.dataset.insightMode = "top-offense";
    analyticsInsightModalBody.innerHTML = "";
    renderTopOffenseView(defaultOffense);
    analyticsInsightModalBody.dataset.selectedOffense = defaultOffense;
    activeInsightContext = { type: "top-offense", render: renderTopOffenseView };
  } else {
    analyticsInsightModalBody.dataset.insightMode = insightKey;
    analyticsInsightModalBody.innerHTML = payload.items
      .map(
        (item) => `
          <div class="analytics-insight-modal-item">
            <strong>${escapeHtml(item.label)}</strong>
            <span>${escapeHtml(item.value)}</span>
          </div>
        `
      )
      .join("");
  }
  analyticsInsightModal.hidden = false;
}

function closeInsightModal() {
  if (!analyticsInsightModal) return;
  analyticsInsightModal.hidden = true;
  activeInsightContext = null;
}

function initializeInsightModal() {
  if (!analyticsInsightCards.length || !analyticsInsightModal) return;

  analyticsInsightCards.forEach((card) => {
    const insightKey = card.dataset.insight;
    if (!insightKey) return;
    card.addEventListener("click", () => openInsightModal(insightKey));
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openInsightModal(insightKey);
    });
  });

  analyticsInsightModal.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-insight-modal-close='true']")) {
      closeInsightModal();
      return;
    }

    if (activeInsightContext && activeInsightContext.type === "top-offense") {
      const offenseButton = target.closest("[data-offense-row]");
      if (offenseButton) {
        const offenseName = offenseButton.getAttribute("data-offense-row") || "";
        activeInsightContext.render(offenseName);
      }
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && analyticsInsightModal && !analyticsInsightModal.hidden) {
      closeInsightModal();
    }
  });
}

function formatGeneratedAt(value) {
  if (!value) return "Updated just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Updated just now";
  return `Updated ${date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function formatTrendChange(changePercent, recentCount, previousCount) {
  const safeChangePercent = clampPercent(changePercent);

  if (!previousCount && !recentCount) {
    return {
      value: "0%",
      label: "No change vs prior 7 days",
      direction: "neutral",
    };
  }

  if (!previousCount && recentCount) {
    return {
      value: "+100%",
      label: "Increase vs prior 7 days",
      direction: "up",
    };
  }

  const direction = safeChangePercent > 0 ? "up" : safeChangePercent < 0 ? "down" : "neutral";
  const label = direction === "up" ? "Increase vs prior 7 days" : direction === "down" ? "Decrease vs prior 7 days" : "No change vs prior 7 days";

  return {
    value: `${safeChangePercent > 0 ? "+" : safeChangePercent < 0 ? "" : ""}${safeChangePercent}%`,
    label,
    direction,
  };
}

function formatModuleChangeBadge(stats) {
  if (!stats.previousCount && !stats.currentCount) {
    return {
      value: "0%",
      label: "no activity",
      direction: "neutral",
    };
  }

  if (!stats.previousCount && stats.currentCount) {
    return {
      value: "+100%",
      label: "new activity",
      direction: "up",
    };
  }

  const sign = stats.percent > 0 ? "+" : "";
  const label = stats.direction === "up" ? "increase" : stats.direction === "down" ? "decrease" : "no change";
  return {
    value: `${sign}${stats.percent}%`,
    label: `${label} vs prior 7 days`,
    direction: stats.direction,
  };
}

function renderAnalyticsBarList(container, rows) {
  if (!container) return;

  if (!rows.length) {
    container.innerHTML = '<div class="analytics-chart-empty">No records available yet.</div>';
    return;
  }

  const sortedRows = [...rows].sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;
    return left.label.localeCompare(right.label);
  });
  const totalCount = sortedRows.reduce((sum, row) => sum + row.count, 0);
  const maxCount = Math.max(...sortedRows.map((row) => row.count), 1);

  container.innerHTML = `
    <div class="analytics-module-stack">
      ${sortedRows
        .map((row, index) => {
          const stats = getModuleTrendStats(getModuleRecords(row.key), row.key);
          const changeBadge = formatModuleChangeBadge(stats);
          const moduleColor = getModuleColor(row.key);
          const moduleSoftColor = hexToRgba(moduleColor, 0.12);
          const moduleBorderColor = hexToRgba(moduleColor, 0.34);
          const sharePercent = totalCount ? Math.round((row.count / totalCount) * 100) : 0;
          const completionRate = row.count ? Math.round((row.completed / row.count) * 100) : 0;
          const widthPercent = Math.max((row.count / maxCount) * 100, 8);
          return `
            <section class="analytics-module-tile ${changeBadge.direction}" style="--module-color:${escapeHtml(moduleColor)}; --module-soft-color:${escapeHtml(moduleSoftColor)}; --module-border-color:${escapeHtml(moduleBorderColor)};">
              <div class="analytics-module-tile-head">
                <p class="analytics-module-name"><span class="analytics-module-name-dot" style="background:${escapeHtml(moduleColor)};"></span>${index + 1}. ${escapeHtml(row.label)}</p>
                <div class="analytics-module-badge ${changeBadge.direction}" title="${escapeHtml(changeBadge.label)}">
                  <strong>${changeBadge.value}</strong>
                </div>
              </div>
              <div class="analytics-module-count">${row.count} <span>records</span></div>
              <div class="analytics-module-bar" aria-hidden="true">
                <span style="width:${widthPercent}%;"></span>
              </div>
              <div class="analytics-module-meta">
                <span>${row.pending} pending</span>
                <span>${completionRate}% done</span>
                <span>${sharePercent}% share</span>
              </div>
            </section>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderAnalyticsTrendChart(container, labels, seriesRows) {
  if (!container) return;

  const activeSeries = (seriesRows || []).filter(
    (series) => Array.isArray(series.values) && series.values.some((value) => value > 0)
  );

  if (!labels.length || !activeSeries.length) {
    container.innerHTML = '<div class="analytics-chart-empty">No activity recorded in the selected window.</div>';
    return;
  }

  const totalsByDay = labels.map((label, index) => {
    const total = activeSeries.reduce((sum, series) => sum + Number(series.values[index] || 0), 0);
    return { label, total, index };
  });
  const maxValue = Math.max(...totalsByDay.map((item) => item.total), 1);
  const tickStep = Math.max(Math.ceil(labels.length / 6), 1);

  const barsMarkup = totalsByDay
    .map((item) => {
      const detailRows = activeSeries
        .filter((series) => Number(series.values[item.index] || 0) > 0)
        .map(
          (series) => `
            <div class="analytics-trend-tooltip-row">
              <span class="analytics-trend-legend-swatch" style="background:${series.color};"></span>
              <span>${escapeHtml(series.label)}: ${series.values[item.index]} records</span>
            </div>
          `
        );
      const detailsHtml = detailRows.length
        ? detailRows.join("")
        : '<div class="analytics-trend-tooltip-row"><span>No module activity</span></div>';
      return `
        <div class="analytics-trend-bar-wrap">
          <div class="analytics-trend-bar-track">
            <div class="analytics-trend-bar-fill" style="height:${Math.max((item.total / maxValue) * 100, item.total ? 8 : 0)}%;">
              <span class="analytics-trend-bar-value">${item.total}</span>
              <div class="analytics-trend-bar-tooltip">
                <strong>${escapeHtml(item.label)}: ${item.total} total</strong>
                <div>${detailsHtml}</div>
              </div>
            </div>
          </div>
          ${item.index % tickStep === 0 || item.index === totalsByDay.length - 1
            ? `<span class="analytics-trend-bar-label">${escapeHtml(item.label)}</span>`
            : '<span class="analytics-trend-bar-label is-ghost">.</span>'}
        </div>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="analytics-trend-wrap">
      <div class="analytics-trend-bar-chart" role="img" aria-label="Last 14 days activity bar chart">
        ${barsMarkup}
      </div>
      <div class="analytics-trend-legend" aria-label="Trend legend">
        ${activeSeries
          .map(
            (series) => `
              <div class="analytics-trend-legend-item">
                <span class="analytics-trend-legend-swatch" style="background:${series.color};"></span>
                <span>${escapeHtml(series.label)}</span>
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderAnalyticsDonutChart(container, segments) {
  if (!container) return;

  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  if (!total) {
    container.innerHTML = '<div class="analytics-chart-empty">No status data available yet.</div>';
    return;
  }

  const size = 280;
  const radius = 92;
  const strokeWidth = 28;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  const circles = segments
    .filter((segment) => segment.value > 0)
    .map((segment) => {
      const dashLength = (segment.value / total) * circumference;
      const circle = `
        <circle
          cx="${size / 2}"
          cy="${size / 2}"
          r="${radius}"
          fill="none"
          stroke="${segment.color}"
          stroke-width="${strokeWidth}"
          stroke-linecap="round"
          stroke-dasharray="${dashLength} ${circumference - dashLength}"
          stroke-dashoffset="${-accumulated}"
          transform="rotate(-90 ${size / 2} ${size / 2})"
        ></circle>
      `;
      accumulated += dashLength;
      return circle;
    });

  const completedSegment = segments.find((segment) => String(segment.label || "").toLowerCase() === "completed");
  const completedValue = completedSegment ? completedSegment.value : 0;
  const completedPercent = total ? Math.round((completedValue / total) * 100) : 0;

  container.innerHTML = `
    <div class="analytics-donut-wrap">
      <svg viewBox="0 0 ${size} ${size}" class="analytics-svg analytics-donut-svg" role="img" aria-label="Open versus completed chart">
        <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="rgba(15, 23, 42, 0.08)" stroke-width="${strokeWidth}"></circle>
        ${circles.join("")}
        <text x="${size / 2}" y="${size / 2 - 14}" class="analytics-donut-value">${total}</text>
        <text x="${size / 2}" y="${size / 2 + 8}" class="analytics-donut-label">records</text>
        <text x="${size / 2}" y="${size / 2 + 30}" class="analytics-donut-subvalue">${completedPercent}% completed</text>
      </svg>
      <div class="analytics-donut-legend">
        ${segments
          .map(
            (segment) => `
              <div class="analytics-legend-item">
                <span class="analytics-legend-swatch" style="background: ${segment.color};"></span>
                <span>${escapeHtml(segment.label)}</span>
                <span>${segment.value} (${total ? Math.round((segment.value / total) * 100) : 0}%)</span>
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderAnalyticsModule(summary = null) {
  const analytics = summary || getAnalyticsSummary();
  const totalRecords = analytics.totals.totalRecords;
  const completedRecords = analytics.totals.completedRecords;
  const pendingRecords = analytics.totals.pendingRecords;
  const resolutionRate = analytics.totals.resolutionRate;
  const goodMoralFlags = analytics.totals.goodMoralFlags || 0;
  const recentShare = analytics.insights.recentShare || 0;
  const backlogRate = totalRecords ? Math.round((pendingRecords / totalRecords) * 100) : 0;
  const topModule = analytics.insights.topModule;
  const topOffense = analytics.insights.topOffense;
  const busiestDay = getBusiestDay(analytics.trend);
  const attentionModule = getAttentionModule(analytics.modules);
  const trendChange = formatTrendChange(
    analytics.trend.changePercent,
    analytics.trend.recentCount,
    analytics.trend.previousCount
  );
  if (analyticsTotalRecords) analyticsTotalRecords.textContent = String(totalRecords);
  if (analyticsResolutionRate) analyticsResolutionRate.textContent = `${resolutionRate}%`;
  if (analyticsPendingActions) analyticsPendingActions.textContent = String(pendingRecords);
  if (analyticsRecentShare) analyticsRecentShare.textContent = `${recentShare}%`;
  if (analyticsGoodMoralFlags) analyticsGoodMoralFlags.textContent = String(goodMoralFlags);
  if (analyticsModulePill) {
    analyticsModulePill.textContent = topModule ? `Top module: ${topModule.label}` : "Top module: --";
  }
  if (analyticsTopOffense) {
    analyticsTopOffense.textContent = topOffense ? topOffense.name : "No offense data yet";
  }
  if (analyticsTopOffenseCount) {
    analyticsTopOffenseCount.textContent = topOffense ? `${topOffense.count} related records` : "No records yet";
  }
  if (analyticsBusiestDay) {
    analyticsBusiestDay.textContent = busiestDay ? busiestDay.label : "No activity window";
  }
  if (analyticsBusiestDayCount) {
    analyticsBusiestDayCount.textContent = busiestDay ? `${busiestDay.count} records posted` : "No activity yet";
  }
  if (analyticsAttentionModule) {
    analyticsAttentionModule.textContent = attentionModule ? attentionModule.label : "All modules stable";
  }
  if (analyticsAttentionModuleCount) {
    analyticsAttentionModuleCount.textContent = attentionModule
      ? `${attentionModule.pending} pending records`
      : "No pending records";
  }
  if (analyticsOpsNote) {
    analyticsOpsNote.textContent = backlogRate >= 50
      ? "Backlog pressure is high"
      : backlogRate >= 30
        ? "Monitor closure velocity"
        : "Case flow is healthy";
  }
  if (analyticsRefreshStamp) {
    analyticsRefreshStamp.textContent = formatGeneratedAt(analytics.generatedAt);
  }
  if (analyticsTrendPill) analyticsTrendPill.textContent = "Last 14 Days";
  if (analyticsTrendChange) analyticsTrendChange.textContent = trendChange.value;
  if (analyticsTrendLabel) analyticsTrendLabel.textContent = trendChange.label;
  if (analyticsTrendCard) {
    analyticsTrendCard.classList.remove("is-up", "is-down", "is-neutral");
    analyticsTrendCard.classList.add(`is-${trendChange.direction}`);
  }

  renderAnalyticsBarList(analyticsModuleChart, analytics.modules);
  const moduleTrend = buildModuleTrendSeries(14);
  renderAnalyticsTrendChart(analyticsTrendChart, moduleTrend.labels, moduleTrend.series);
  renderAnalyticsDonutChart(analyticsStatusChart, [
    { label: "Completed", value: completedRecords, color: "#0f766e" },
    { label: "Pending", value: pendingRecords, color: "#a41321" },
  ]);
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
      <td>${escapeHtml(formatDate(item.date))}</td>
      <td>${escapeHtml(item.type)}</td>
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.srCode)}</td>
      <td>${escapeHtml(formatDashboardDetail(item))}</td>
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
  renderAnalyticsModule();
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
  const semester = normalizeSemesterLabel(localStorage.getItem("semester")) || "First Semester";
  return { year, semester };
}

function normalizeSemesterLabel(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";

  if (raw === "first" || raw === "1st" || raw.includes("first")) {
    return "First Semester";
  }
  if (raw === "second" || raw === "2nd" || raw.includes("second")) {
    return "Second Semester";
  }
  if (raw === "summer" || raw.includes("summer")) {
    return "Summer Class";
  }

  return "";
}

function setAcademicPeriod(year, semester) {
  localStorage.setItem("academicYear", year);
  localStorage.setItem("semester", normalizeSemesterLabel(semester) || "First Semester");
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

function getAcademicPeriodRange() {
  const { year, semester } = getAcademicPeriod();
  const normalizedYear = String(year || "").trim();
  const normalizedSemester = normalizeSemesterLabel(semester);
  const match = normalizedYear.match(/^(\d{4})-(\d{4})$/);
  if (!match || !normalizedSemester) return null;

  const startYear = Number(match[1]);
  const endYear = Number(match[2]);
  if (!Number.isInteger(startYear) || !Number.isInteger(endYear) || endYear !== startYear + 1) {
    return null;
  }

  let startDate;
  let endDate;

  if (normalizedSemester === "First Semester") {
    startDate = new Date(startYear, 7, 1);
    endDate = new Date(startYear, 11, 31);
  } else if (normalizedSemester === "Second Semester") {
    startDate = new Date(endYear, 0, 1);
    endDate = new Date(endYear, 4, 31);
  } else if (normalizedSemester === "Summer Class") {
    startDate = new Date(endYear, 5, 1);
    endDate = new Date(endYear, 6, 31);
  } else {
    return null;
  }

  const toISODate = (value) => {
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, "0");
    const dd = String(value.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  return {
    year: normalizedYear,
    semester: normalizedSemester,
    startDate: toISODate(startDate),
    endDate: toISODate(endDate),
  };
}

function initializeAcademicPeriod() {
  const { year, semester } = getAcademicPeriod();
  setAcademicPeriod(year, semester);
  
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
    
    academicYearInput.addEventListener("blur", async (e) => {
      // Ensure proper format on blur
      const formatted = formatAcademicYear(e.target.value);
      e.target.value = formatted;
      setAcademicPeriod(formatted, getAcademicPeriod().semester);
      updateAcademicPeriodDisplay();
      await reloadAllDataForCurrentScope();
    });
  }
  
  if (semesterSelect) {
    semesterSelect.value = semester;
    semesterSelect.addEventListener("change", async (e) => {
      const newSemester = e.target.value;
      setAcademicPeriod(getAcademicPeriod().year, newSemester);
      updateAcademicPeriodDisplay();
      await reloadAllDataForCurrentScope();
    });
  }
  
  updateAcademicPeriodDisplay();
}

async function loadAnalyticsSummary() {
  try {
    const supabase = await getSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      analyticsSummary = null;
      renderAnalyticsModule();
      return null;
    }

    const query = new URLSearchParams();
    const period = getAcademicPeriodRange();
    if (canAccessAllOrganizations() && selectedHeadOrganizationId) {
      query.set("organization_id", String(selectedHeadOrganizationId));
    }
    if (period) {
      query.set("academic_year", period.year);
      query.set("semester", period.semester);
    }

    const response = await fetch(`/api/analytics${query.toString() ? `?${query.toString()}` : ""}`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Analytics request failed (${response.status})`);
    }

    const data = await response.json();
    analyticsSummary = normalizeAnalyticsSummary(data);
    renderAnalyticsModule(analyticsSummary);
    return analyticsSummary;
  } catch (error) {
    analyticsSummary = null;
    renderAnalyticsModule();
    return null;
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
  await loadAnalyticsSummary();
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
    switchTab("analytics");
  });
}

switchTab(getPreferredTab(), { persist: false });
initializeInsightModal();


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
