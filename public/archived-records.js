import { getSupabase } from "./supabaseClient.js?v=5";

const navBtns = document.querySelectorAll(".nav-btn");
const tabs = document.querySelectorAll(".tab");
const academicYearInput = document.querySelector("#archive-academic-year");
const semesterSelect = document.querySelector("#archive-semester");
const periodDisplay = document.querySelector("#archive-period-display");

let currentOrganizationId = null;
let currentUserRole = localStorage.getItem("userRole") || "";

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

const ROLE_COORDINATOR = "coordinator";
const MODULE_TABLE_MAP = {
  minor: "minor_offenses",
  major: "major_offenses",
  uniform: "non_wearing_uniform",
  gatepass: "gatepass",
  goodmoral: "good_moral",
  idreplacement: "id_replacement",
  leaveofabsence: "leave_of_absence",
};

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

  return (records || []).filter((record) => {
    const rowYear = String(record?.academic_year || "").trim();
    const rowSemester = normalizeSemesterLabel(record?.semester);
    return rowYear === expectedYear && rowSemester === expectedSemester;
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

function canManageArchivedRecords() {
  return String(currentUserRole || "").trim().toLowerCase() === ROLE_COORDINATOR;
}

function getActiveArchiveTab() {
  return document.querySelector(".nav-btn.active")?.getAttribute("data-tab") || "minor";
}

function initializeAcademicPeriodHeader() {
  renderAcademicPeriodHeader();

  if (academicYearInput) {
    academicYearInput.addEventListener("change", async () => {
      const value = String(academicYearInput.value || "").trim() || "2024-2025";
      localStorage.setItem("academicYear", value);
      renderAcademicPeriodHeader();
      await loadArchivedRecords(getActiveArchiveTab());
    });
  }

  if (semesterSelect) {
    semesterSelect.addEventListener("change", async () => {
      const value = normalizeSemesterLabel(semesterSelect.value) || "First Semester";
      localStorage.setItem("semester", value);
      renderAcademicPeriodHeader();
      await loadArchivedRecords(getActiveArchiveTab());
    });
  }
}

async function enforceArchivePageAccess() {
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

  currentUserRole = account?.role || currentUserRole;
  if (currentUserRole) {
    localStorage.setItem("userRole", currentUserRole);
  }

  currentOrganizationId = account?.organization_id || null;
  if (currentOrganizationId) {
    localStorage.setItem("organizationId", String(currentOrganizationId));
  }

  if (!canManageArchivedRecords()) {
    alert("Access denied. Archived records management is limited to coordinators.");
    window.location.href = "index.html";
    return false;
  }

  return true;
}

async function getCurrentOrganizationId() {
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

async function fetchArchivedRows(moduleKey) {
  try {
    const supabase = await getSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Session expired. Please login again.");
    }

    const period = getAcademicPeriod();
    const query = new URLSearchParams({
      module: moduleKey,
      academic_year: period.year,
      semester: period.semester,
    });

    const response = await fetch(`/api/archive?${query.toString()}`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      cache: "no-store",
    });

    const tableName = MODULE_TABLE_MAP[moduleKey];
    if (!tableName) {
      throw new Error("Invalid archive module.");
    }

    if (response.ok) {
      const data = await parseApiResponse(response);
      return filterByAcademicPeriod(Array.isArray(data) ? data : [], period);
    }

    if (response.status !== 404) {
      const errorData = await parseApiResponse(response);
      throw new Error(errorData?.error || `Archive request failed (${response.status}).`);
    }

    const organizationId = await getCurrentOrganizationId();
    const semesterCandidates = getSemesterCandidates(period.semester);
    let fallbackQuery = supabase
      .from(tableName)
      .select("*")
      .eq("archived", true)
      .eq("academic_year", period.year)
      .in("semester", semesterCandidates)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (organizationId) {
      fallbackQuery = fallbackQuery.eq("organization_id", organizationId);
    }

    const { data: fallbackData, error: fallbackError } = await fallbackQuery;
    if (fallbackError) throw fallbackError;
    return filterByAcademicPeriod(Array.isArray(fallbackData) ? fallbackData : [], period);
  } catch (err) {
    console.error(`Error fetching archived records (${moduleKey}):`, err);
    return [];
  }
}

async function restoreRow(table, id) {
  if (!canManageArchivedRecords()) {
    alert("Read-only access: Head users cannot manage archived records.");
    return;
  }
  if (!confirm("Restore this record to active records?")) return;

  try {
    const supabase = await getSupabase();
    const organizationId = await getCurrentOrganizationId();
    const { error } = await supabase
      .from(table)
      .update({ archived: false })
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) throw error;

    alert("Record restored successfully!");
    await loadArchivedRecords(getActiveArchiveTab());
  } catch (err) {
    console.error("Error restoring record:", err);
    alert(`Failed to restore record: ${err.message}`);
  }
}

async function permanentlyDeleteRow(table, id) {
  if (!canManageArchivedRecords()) {
    alert("Read-only access: Head users cannot manage archived records.");
    return;
  }
  if (!confirm("PERMANENTLY DELETE this record?\n\nThis action CANNOT be undone!")) {
    return;
  }

  try {
    const supabase = await getSupabase();
    const organizationId = await getCurrentOrganizationId();
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (error) throw error;

    alert("Record permanently deleted.");
    await loadArchivedRecords(getActiveArchiveTab());
  } catch (err) {
    console.error("Error deleting record:", err);
    alert(`Failed to delete record: ${err.message}`);
  }
}

function attachRowActions(row, table, id) {
  const restoreBtn = row.querySelector(".restore-btn");
  const deleteBtn = row.querySelector(".delete-btn");

  restoreBtn?.addEventListener("click", () => restoreRow(table, id));
  deleteBtn?.addEventListener("click", () => permanentlyDeleteRow(table, id));
}

async function loadArchivedRecords(tabName) {
  let table = "";
  let moduleKey = "";
  let tbodyId = "";

  switch (tabName) {
    case "minor":
      table = "minor_offenses";
      moduleKey = "minor";
      tbodyId = "minor-table-body";
      break;
    case "major":
      table = "major_offenses";
      moduleKey = "major";
      tbodyId = "major-table-body";
      break;
    case "uniform":
      table = "non_wearing_uniform";
      moduleKey = "uniform";
      tbodyId = "uniform-table-body";
      break;
    case "gatepass":
      table = "gatepass";
      moduleKey = "gatepass";
      tbodyId = "gatepass-table-body";
      break;
    case "goodmoral":
      table = "good_moral";
      moduleKey = "goodmoral";
      tbodyId = "goodmoral-table-body";
      break;
    case "idreplacement":
      table = "id_replacement";
      moduleKey = "idreplacement";
      tbodyId = "idreplacement-table-body";
      break;
    case "leaveofabsence":
      table = "leave_of_absence";
      moduleKey = "leaveofabsence";
      tbodyId = "leaveofabsence-table-body";
      break;
    default:
      return;
  }

  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">Loading...</td></tr>';

  const rows = await fetchArchivedRows(moduleKey);

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No archived records found.</td></tr>';
    return;
  }

  if (tabName === "minor") {
    renderMinorRows(rows, tbody);
  } else if (tabName === "major") {
    renderMajorRows(rows, tbody);
  } else if (tabName === "uniform") {
    renderUniformRows(rows, tbody);
  } else if (tabName === "gatepass") {
    renderGatepassRows(rows, tbody);
  } else if (tabName === "goodmoral") {
    renderGoodmoralRows(rows, tbody);
  } else if (tabName === "idreplacement") {
    renderIdReplacementRows(rows, tbody);
  } else if (tabName === "leaveofabsence") {
    renderLeaveOfAbsenceRows(rows, tbody);
  }
}

function renderMinorRows(rows, tbody) {
  tbody.innerHTML = rows
    .map(
      (r) => `
    <tr>
      <td>${r.date_of_complaint || ""}</td>
      <td>${r.name_of_student || ""}</td>
      <td>${r.sr_code || ""}</td>
      <td>${r.offense || ""}</td>
      <td>${r.sanction || ""}</td>
      <td>
        <button class="btn-restore restore-btn" type="button">Restore</button>
        <button class="btn-delete delete-btn" type="button">Delete</button>
      </td>
    </tr>
  `
    )
    .join("");

  tbody.querySelectorAll("tr").forEach((row, idx) => {
    attachRowActions(row, "minor_offenses", rows[idx].id);
  });
}

function renderMajorRows(rows, tbody) {
  tbody.innerHTML = rows
    .map(
      (r) => `
    <tr>
      <td>${r.date_of_complaint || ""}</td>
      <td>${r.name_of_student || ""}</td>
      <td>${r.sr_code || ""}</td>
      <td>${r.offense || ""}</td>
      <td>${r.sanction || ""}</td>
      <td>
        <button class="btn-restore restore-btn" type="button">Restore</button>
        <button class="btn-delete delete-btn" type="button">Delete</button>
      </td>
    </tr>
  `
    )
    .join("");

  tbody.querySelectorAll("tr").forEach((row, idx) => {
    attachRowActions(row, "major_offenses", rows[idx].id);
  });
}

function renderUniformRows(rows, tbody) {
  tbody.innerHTML = rows
    .map(
      (r) => `
    <tr>
      <td>${r.date || ""}</td>
      <td>${r.name || ""}</td>
      <td>${r.sr_code || ""}</td>
      <td>${r.course || ""}</td>
      <td>${r.reason || ""}</td>
      <td>
        <button class="btn-restore restore-btn" type="button">Restore</button>
        <button class="btn-delete delete-btn" type="button">Delete</button>
      </td>
    </tr>
  `
    )
    .join("");

  tbody.querySelectorAll("tr").forEach((row, idx) => {
    attachRowActions(row, "non_wearing_uniform", rows[idx].id);
  });
}

function renderGatepassRows(rows, tbody) {
  tbody.innerHTML = rows
    .map(
      (r) => `
    <tr>
      <td>${r.date || ""}</td>
      <td>${r.name || ""}</td>
      <td>${r.sr_code || ""}</td>
      <td>${r.course || ""}</td>
      <td>${r.reason || ""}</td>
      <td>
        <button class="btn-restore restore-btn" type="button">Restore</button>
        <button class="btn-delete delete-btn" type="button">Delete</button>
      </td>
    </tr>
  `
    )
    .join("");

  tbody.querySelectorAll("tr").forEach((row, idx) => {
    attachRowActions(row, "gatepass", rows[idx].id);
  });
}

function renderGoodmoralRows(rows, tbody) {
  tbody.innerHTML = rows
    .map(
      (r) => `
    <tr>
      <td>${r.date || ""}</td>
      <td>${r.name || ""}</td>
      <td>${r.sr_code || ""}</td>
      <td>${r.course || ""}</td>
      <td>${r.purpose || ""}</td>
      <td>
        <button class="btn-restore restore-btn" type="button">Restore</button>
        <button class="btn-delete delete-btn" type="button">Delete</button>
      </td>
    </tr>
  `
    )
    .join("");

  tbody.querySelectorAll("tr").forEach((row, idx) => {
    attachRowActions(row, "good_moral", rows[idx].id);
  });
}

function renderIdReplacementRows(rows, tbody) {
  tbody.innerHTML = rows
    .map(
      (r) => `
    <tr>
      <td>${r.date || ""}</td>
      <td>${r.name || ""}</td>
      <td>${r.sr_code || ""}</td>
      <td>${r.course || ""}</td>
      <td>${r.reason || ""}</td>
      <td>
        <button class="btn-restore restore-btn" type="button">Restore</button>
        <button class="btn-delete delete-btn" type="button">Delete</button>
      </td>
    </tr>
  `
    )
    .join("");

  tbody.querySelectorAll("tr").forEach((row, idx) => {
    attachRowActions(row, "id_replacement", rows[idx].id);
  });
}

function renderLeaveOfAbsenceRows(rows, tbody) {
  tbody.innerHTML = rows
    .map(
      (r) => `
    <tr>
      <td>${r.date || ""}</td>
      <td>${r.name || ""}</td>
      <td>${r.sr_code || ""}</td>
      <td>${r.course || ""}</td>
      <td>${r.semester_period_covered || ""}</td>
      <td>
        <button class="btn-restore restore-btn" type="button">Restore</button>
        <button class="btn-delete delete-btn" type="button">Delete</button>
      </td>
    </tr>
  `
    )
    .join("");

  tbody.querySelectorAll("tr").forEach((row, idx) => {
    attachRowActions(row, "leave_of_absence", rows[idx].id);
  });
}

navBtns.forEach((btn) => {
  btn.addEventListener("click", async () => {
    const tabName = btn.getAttribute("data-tab");
    if (!tabName) return;

    navBtns.forEach((b) => b.classList.remove("active"));
    tabs.forEach((t) => t.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(tabName)?.classList.add("active");

    await loadArchivedRecords(tabName);

    const sidebar = document.getElementById("sidebarNav");
    if (sidebar && window.bootstrap && sidebar.classList.contains("show")) {
      window.bootstrap.Offcanvas.getOrCreateInstance(sidebar).hide();
    }
  });
});

document.getElementById("logout-btn")?.addEventListener("click", async () => {
  try {
    const supabase = await getSupabase();
    await supabase.auth.signOut();
    window.location.href = "login.html";
  } catch (err) {
    console.error("Error signing out:", err);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  enforceArchivePageAccess()
    .then(async (allowed) => {
      if (!allowed) return;
      initializeAcademicPeriodHeader();
      await loadArchivedRecords("minor");
    })
    .catch(() => {
      window.location.href = "login.html";
    });
});
