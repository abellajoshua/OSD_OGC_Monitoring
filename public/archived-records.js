import { getSupabase } from "./supabaseClient.js?v=4";

// Tab navigation
const navBtns = document.querySelectorAll(".nav-btn");
const tabs = document.querySelectorAll(".tab");

navBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tabName = btn.getAttribute("data-tab");
    if (!tabName) return;

    navBtns.forEach((b) => b.classList.remove("active"));
    tabs.forEach((t) => t.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(tabName)?.classList.add("active");

    loadArchivedRecords(tabName);

    // Close sidebar menu after selecting a tab
    const sidebar = document.getElementById("sidebarNav");
    if (sidebar && window.bootstrap && sidebar.classList.contains("show")) {
      window.bootstrap.Offcanvas.getOrCreateInstance(sidebar).hide();
    }
  });
});

// Logout
document.getElementById("logout-btn")?.addEventListener("click", async () => {
  try {
    const supabase = await getSupabase();
    await supabase.auth.signOut();
    window.location.href = "login.html";
  } catch (err) {
    console.error("Error signing out:", err);
  }
});

// Load archived records on page load
document.addEventListener("DOMContentLoaded", () => {
  enforceArchivePageAccess()
    .then((allowed) => {
      if (!allowed) return;
      loadArchivedRecords("minor");
    })
    .catch(() => {
      window.location.href = "login.html";
    });
});

let currentOrganizationId = null;
let currentUserRole = localStorage.getItem("userRole") || "";

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

function getAcademicPeriodRange() {
  const { year, semester } = getAcademicPeriod();
  const match = String(year || "").trim().match(/^(\d{4})-(\d{4})$/);
  if (!match) return null;

  const startYear = Number(match[1]);
  const endYear = Number(match[2]);
  if (!Number.isInteger(startYear) || !Number.isInteger(endYear) || endYear !== startYear + 1) {
    return null;
  }

  let startDate;
  let endDate;
  if (semester === "First Semester") {
    startDate = new Date(startYear, 7, 1);
    endDate = new Date(startYear, 11, 31);
  } else if (semester === "Second Semester") {
    startDate = new Date(endYear, 0, 1);
    endDate = new Date(endYear, 4, 31);
  } else if (semester === "Summer Class") {
    startDate = new Date(endYear, 5, 1);
    endDate = new Date(endYear, 6, 31);
  } else {
    return null;
  }

  const toISODate = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  return {
    year,
    semester,
    startDate: toISODate(startDate),
    endDate: toISODate(endDate),
  };
}

const ROLE_COORDINATOR = "coordinator";

function canManageArchivedRecords() {
  return currentUserRole === ROLE_COORDINATOR;
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

// Fetch archived rows from a table
async function fetchArchivedRows(table, dateColumn) {
  try {
    const supabase = await getSupabase();
    const organizationId = await getCurrentOrganizationId();
    
    // Fetch all archived records regardless of academic period
    // Archived records should be available for restore regardless of current period
    let query = supabase
      .from(table)
      .select("*")
      .eq("archived", true)
      .eq("organization_id", organizationId);

    let { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error(`Error fetching archived records from ${table}:`, err);
    return [];
  }
}

// Restore a record (set archived = false)
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
    
    // Reload current tab
    const activeTab = document.querySelector(".nav-btn.active")?.getAttribute("data-tab");
    if (activeTab) {
      loadArchivedRecords(activeTab);
    }
  } catch (err) {
    console.error("Error restoring record:", err);
    alert("Failed to restore record: " + err.message);
  }
}

// Permanently delete a record
async function permanentlyDeleteRow(table, id) {
  if (!canManageArchivedRecords()) {
    alert("Read-only access: Head users cannot manage archived records.");
    return;
  }
  if (!confirm("⚠️ PERMANENTLY DELETE this record?\n\nThis action CANNOT be undone!")) {
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
    
    // Reload current tab
    const activeTab = document.querySelector(".nav-btn.active")?.getAttribute("data-tab");
    if (activeTab) {
      loadArchivedRecords(activeTab);
    }
  } catch (err) {
    console.error("Error deleting record:", err);
    alert("Failed to delete record: " + err.message);
  }
}

// Attach restore and delete actions to row
function attachRowActions(row, table, id) {
  const restoreBtn = row.querySelector(".restore-btn");
  const deleteBtn = row.querySelector(".delete-btn");

  restoreBtn?.addEventListener("click", () => restoreRow(table, id));
  deleteBtn?.addEventListener("click", () => permanentlyDeleteRow(table, id));
}

// Load archived records for specific table
async function loadArchivedRecords(tabName) {
  let table = "";
  let tbodyId = "";

  switch (tabName) {
    case "minor":
      table = "minor_offenses";
      tbodyId = "minor-table-body";
      break;
    case "major":
      table = "major_offenses";
      tbodyId = "major-table-body";
      break;
    case "uniform":
      table = "non_wearing_uniform";
      tbodyId = "uniform-table-body";
      break;
    case "gatepass":
      table = "gatepass";
      tbodyId = "gatepass-table-body";
      break;
    case "goodmoral":
      table = "good_moral";
      tbodyId = "goodmoral-table-body";
      break;
    case "idreplacement":
      table = "id_replacement";
      tbodyId = "idreplacement-table-body";
      break;
    case "leaveofabsence":
      table = "leave_of_absence";
      tbodyId = "leaveofabsence-table-body";
      break;
    default:
      return;
  }

  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  // Show loading state
  tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">Loading...</td></tr>';

  const rows = await fetchArchivedRows(table, tabName === "minor" || tabName === "major" ? "date_of_complaint" : "date");

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No archived records found.</td></tr>';
    return;
  }

  // Render rows based on table type
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

// Render functions for each table type
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
