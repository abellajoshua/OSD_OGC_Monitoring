import { getSupabase } from "./supabaseClient.js?v=5";

const HEAD_ROLE = "head";
let currentOrganizationId = null;

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

// Check if user is head
async function checkHeadAccess() {
  const supabase = await getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  console.log("Session:", session);

  if (!session) {
    window.location.href = "login.html";
    return false;
  }

  // Get user role from database
  const { data: userAccount, error } = await supabase
    .from("user_accounts")
    .select("role, organization_id")
    .eq("user_id", session.user.id)
    .single();

  console.log("User account:", userAccount, "Error:", error);

  if (error) {
    console.error("Error checking user role:", error);
    // Fail closed: PGRST116 ("no rows") means this session has no user_accounts row,
    // i.e. an unregistered account - deny access rather than granting it.
    alert(
      error.code === "PGRST116"
        ? "This account is not registered by admin. Please contact the administrator."
        : `Error checking user role: ${error.message}`
    );
    await supabase.auth.signOut();
    window.location.href = "login.html";
    return false;
  }

  if (!userAccount || userAccount.role !== HEAD_ROLE) {
    alert("Access denied. This page is for Head role only.");
    window.location.href = "index.html";
    return false;
  }

  currentOrganizationId = userAccount.organization_id;

  console.log("HEAD access granted");
  return true;
}

// Navigation handling
document.querySelectorAll(".nav-btn[data-section]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const section = btn.dataset.section;
    
    // Update active nav button
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    
    // Show selected section
    document.querySelectorAll(".report-section").forEach((s) => {
      s.style.display = "none";
    });
    document.getElementById(`${section}-section`).style.display = "block";
    
    // Show/hide back button based on section
    const backBtn = document.getElementById("back-to-overview-btn");
    if (backBtn) {
      backBtn.style.display = section === "overview" ? "none" : "flex";
    }
    
    // Close mobile sidebar
    const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById("sidebarNav"));
    if (offcanvas) {
      offcanvas.hide();
    }
  });
});

// Back button handler
const backToOverviewBtn = document.getElementById("back-to-overview-btn");
if (backToOverviewBtn) {
  backToOverviewBtn.addEventListener("click", () => {
    // Trigger overview button click
    const overviewBtn = document.querySelector('.nav-btn[data-section="overview"]');
    if (overviewBtn) {
      overviewBtn.click();
    }
  });
}

// Logout functionality
document.getElementById("logout-btn")?.addEventListener("click", async () => {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
  window.location.href = "login.html";
});

// Format date
function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Format status badge
function getStatusBadge(status) {
  const statusLower = (status || "pending").toLowerCase();
  let badgeClass = "status-pending";
  
  if (statusLower.includes("resolved") || statusLower.includes("approved") || statusLower.includes("granted")) {
    badgeClass = "status-resolved";
  } else if (statusLower.includes("active") || statusLower.includes("pending")) {
    badgeClass = "status-active";
  }
  
  return `<span class="status-badge ${badgeClass}">${status || "Pending"}</span>`;
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Load Minor Offenses
async function loadMinorOffenses() {
  try {
    const supabase = await getSupabase();
    const period = getAcademicPeriodRange();
    console.log("Fetching minor offenses...");

    let query = supabase
      .from("minor_offenses")
      .select("*")
      .eq("archived", false)
      .eq("organization_id", currentOrganizationId);

    if (period) {
      query = query.eq("academic_year", period.year).eq("semester", period.semester);
    }

    let { data, error } = await query.order("date_of_complaint", { ascending: false });

    if (error && String(error.message || "").toLowerCase().includes("academic_year")) {
      ({ data, error } = await supabase
        .from("minor_offenses")
        .select("*")
        .eq("archived", false)
        .eq("organization_id", currentOrganizationId)
        .gte("date_of_complaint", period?.startDate || "0001-01-01")
        .lte("date_of_complaint", period?.endDate || "9999-12-31")
        .order("date_of_complaint", { ascending: false }));
    }

    console.log("Minor offenses result:", { data, error });

    if (error) {
      console.error("Minor offenses error:", error);
      throw error;
    }

    const tbody = document.getElementById("minor-offenses-tbody");
    
    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No minor offenses recorded</td></tr>`;
      return 0;
    }

    tbody.innerHTML = data
      .map(
        (record) => `
        <tr>
          <td><strong>${escapeHtml(record.sr_code || "N/A")}</strong></td>
          <td>${escapeHtml(record.name_of_student || "N/A")}</td>
          <td>${escapeHtml(record.offense || "N/A")}</td>
          <td>${formatDate(record.date_of_complaint)}</td>
          <td>${escapeHtml(record.sanction || "N/A")}</td>
          <td><span class="badge bg-warning">Recorded</span></td>
        </tr>
      `
      )
      .join("");

    console.log(`Loaded ${data.length} minor offenses`);
    return data.length;
  } catch (error) {
    console.error("Error loading minor offenses:", error);
    document.getElementById("minor-offenses-tbody").innerHTML = 
      `<tr><td colspan="6" class="text-center py-4 text-danger">Error loading data: ${escapeHtml(error.message)}</td></tr>`;
    return 0;
  }
}

// Load Major Offenses
async function loadMajorOffenses() {
  try {
    const supabase = await getSupabase();
    const period = getAcademicPeriodRange();
    console.log("Fetching major offenses...");

    let query = supabase
      .from("major_offenses")
      .select("*")
      .eq("archived", false)
      .eq("organization_id", currentOrganizationId);

    if (period) {
      query = query.eq("academic_year", period.year).eq("semester", period.semester);
    }

    let { data, error } = await query.order("date_of_complaint", { ascending: false });

    if (error && String(error.message || "").toLowerCase().includes("academic_year")) {
      ({ data, error } = await supabase
        .from("major_offenses")
        .select("*")
        .eq("archived", false)
        .eq("organization_id", currentOrganizationId)
        .gte("date_of_complaint", period?.startDate || "0001-01-01")
        .lte("date_of_complaint", period?.endDate || "9999-12-31")
        .order("date_of_complaint", { ascending: false }));
    }

    console.log("Major offenses result:", { data, error });

    if (error) {
      console.error("Major offenses error:", error);
      throw error;
    }

    const tbody = document.getElementById("major-offenses-tbody");
    
    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No major offenses recorded</td></tr>`;
      return 0;
    }

    tbody.innerHTML = data
      .map(
        (record) => `
        <tr>
          <td><strong>${escapeHtml(record.sr_code || "N/A")}</strong></td>
          <td>${escapeHtml(record.name_of_student || "N/A")}</td>
          <td>${escapeHtml(record.offense || "N/A")}</td>
          <td>${formatDate(record.date_of_complaint)}</td>
          <td>${escapeHtml(record.sanction || "N/A")}</td>
          <td><span class="badge bg-danger">Major</span></td>
        </tr>
      `
      )
      .join("");

    console.log(`Loaded ${data.length} major offenses`);
    return data.length;
  } catch (error) {
    console.error("Error loading major offenses:", error);
    document.getElementById("major-offenses-tbody").innerHTML = 
      `<tr><td colspan="6" class="text-center py-4 text-danger">Error loading data: ${escapeHtml(error.message)}</td></tr>`;
    return 0;
  }
}

// Load Uniform Violations
async function loadUniformViolations() {
  try {
    const supabase = await getSupabase();
    const period = getAcademicPeriodRange();
    let query = supabase
      .from("non_wearing_uniform")
      .select("*")
      .eq("archived", false)
      .eq("organization_id", currentOrganizationId);

    if (period) {
      query = query.eq("academic_year", period.year).eq("semester", period.semester);
    }

    let { data, error } = await query.order("date", { ascending: false });

    if (error && String(error.message || "").toLowerCase().includes("academic_year")) {
      ({ data, error } = await supabase
        .from("non_wearing_uniform")
        .select("*")
        .eq("archived", false)
        .eq("organization_id", currentOrganizationId)
        .gte("date", period?.startDate || "0001-01-01")
        .lte("date", period?.endDate || "9999-12-31")
        .order("date", { ascending: false }));
    }

    if (error) throw error;

    const tbody = document.getElementById("uniform-violations-tbody");
    
    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No uniform violations recorded</td></tr>`;
      return 0;
    }

    tbody.innerHTML = data
      .map(
        (record) => `
        <tr>
          <td><strong>${escapeHtml(record.sr_code || "N/A")}</strong></td>
          <td>${escapeHtml(record.name || "N/A")}</td>
          <td>${escapeHtml(record.reason || "N/A")}</td>
          <td>${formatDate(record.date)}</td>
          <td>${escapeHtml(record.time_in || "N/A")} - ${escapeHtml(record.time_out || "N/A")}</td>
          <td><span class="badge bg-warning">Recorded</span></td>
        </tr>
      `
      )
      .join("");

    return data.length;
  } catch (error) {
    console.error("Error loading uniform violations:", error);
    document.getElementById("uniform-violations-tbody").innerHTML = 
      `<tr><td colspan="6" class="text-center py-4 text-danger">Error loading data: ${escapeHtml(error.message)}</td></tr>`;
    return 0;
  }
}

// Load Gatepass Requests
async function loadGatepassRequests() {
  try {
    const supabase = await getSupabase();
    const period = getAcademicPeriodRange();
    let query = supabase
      .from("gatepass")
      .select("*")
      .eq("archived", false)
      .eq("organization_id", currentOrganizationId);

    if (period) {
      query = query.eq("academic_year", period.year).eq("semester", period.semester);
    }

    let { data, error } = await query.order("date", { ascending: false });

    if (error && String(error.message || "").toLowerCase().includes("academic_year")) {
      ({ data, error } = await supabase
        .from("gatepass")
        .select("*")
        .eq("archived", false)
        .eq("organization_id", currentOrganizationId)
        .gte("date", period?.startDate || "0001-01-01")
        .lte("date", period?.endDate || "9999-12-31")
        .order("date", { ascending: false }));
    }

    if (error) throw error;

    const tbody = document.getElementById("gatepass-requests-tbody");
    
    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No gatepass requests recorded</td></tr>`;
      return 0;
    }

    tbody.innerHTML = data
      .map(
        (record) => `
        <tr>
          <td><strong>${escapeHtml(record.sr_code || "N/A")}</strong></td>
          <td>${escapeHtml(record.name || "N/A")}</td>
          <td>${escapeHtml(record.reason || "N/A")}</td>
          <td>${formatDate(record.date)}</td>
          <td>${escapeHtml(record.time_out || "N/A")}</td>
          <td>${escapeHtml(record.time_in || "N/A")}</td>
          <td><span class="badge bg-success">Approved</span></td>
        </tr>
      `
      )
      .join("");

    return data.length;
  } catch (error) {
    console.error("Error loading gatepass requests:", error);
    document.getElementById("gatepass-requests-tbody").innerHTML = 
      `<tr><td colspan="7" class="text-center py-4 text-danger">Error loading data: ${escapeHtml(error.message)}</td></tr>`;
    return 0;
  }
}

// Load Good Moral Requests
async function loadGoodMoralRequests() {
  try {
    const supabase = await getSupabase();
    const period = getAcademicPeriodRange();
    let query = supabase
      .from("good_moral")
      .select("*")
      .eq("archived", false)
      .eq("organization_id", currentOrganizationId);

    if (period) {
      query = query.eq("academic_year", period.year).eq("semester", period.semester);
    }

    let { data, error } = await query.order("date", { ascending: false });

    if (error && String(error.message || "").toLowerCase().includes("academic_year")) {
      ({ data, error } = await supabase
        .from("good_moral")
        .select("*")
        .eq("archived", false)
        .eq("organization_id", currentOrganizationId)
        .gte("date", period?.startDate || "0001-01-01")
        .lte("date", period?.endDate || "9999-12-31")
        .order("date", { ascending: false }));
    }

    if (error) throw error;

    const tbody = document.getElementById("good-moral-tbody");
    
    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No good moral requests recorded</td></tr>`;
      return 0;
    }

    tbody.innerHTML = data
      .map(
        (record) => `
        <tr>
          <td><strong>${escapeHtml(record.sr_code || "N/A")}</strong></td>
          <td>${escapeHtml(record.name || "N/A")}</td>
          <td>${escapeHtml(record.purpose || "N/A")}</td>
          <td>${formatDate(record.date)}</td>
          <td>${escapeHtml(record.time_in || "N/A")} - ${escapeHtml(record.time_out || "N/A")}</td>
          <td><span class="badge bg-success">Approved</span></td>
        </tr>
      `
      )
      .join("");

    return data.length;
  } catch (error) {
    console.error("Error loading good moral requests:", error);
    document.getElementById("good-moral-tbody").innerHTML = 
      `<tr><td colspan="6" class="text-center py-4 text-danger">Error loading data: ${escapeHtml(error.message)}</td></tr>`;
    return 0;
  }
}

// Load ID Replacement Requests
async function loadIdReplacementRequests() {
  try {
    const supabase = await getSupabase();
    const period = getAcademicPeriodRange();
    let query = supabase
      .from("id_replacement")
      .select("*")
      .eq("archived", false)
      .eq("organization_id", currentOrganizationId);

    if (period) {
      query = query.eq("academic_year", period.year).eq("semester", period.semester);
    }

    let { data, error } = await query.order("date", { ascending: false });

    if (error && String(error.message || "").toLowerCase().includes("academic_year")) {
      ({ data, error } = await supabase
        .from("id_replacement")
        .select("*")
        .eq("archived", false)
        .eq("organization_id", currentOrganizationId)
        .gte("date", period?.startDate || "0001-01-01")
        .lte("date", period?.endDate || "9999-12-31")
        .order("date", { ascending: false }));
    }

    if (error) throw error;

    const tbody = document.getElementById("id-replacement-tbody");
    
    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No ID replacement requests recorded</td></tr>`;
      return 0;
    }

    tbody.innerHTML = data
      .map(
        (record) => `
        <tr>
          <td><strong>${escapeHtml(record.sr_code || "N/A")}</strong></td>
          <td>${escapeHtml(record.name || "N/A")}</td>
          <td>${escapeHtml(record.reason || "N/A")}</td>
          <td>${formatDate(record.date)}</td>
          <td>${escapeHtml(record.time_out || "N/A")}</td>
          <td>${escapeHtml(record.time_in || "N/A")}</td>
          <td><span class="badge bg-success">Approved</span></td>
        </tr>
      `
      )
      .join("");

    return data.length;
  } catch (error) {
    console.error("Error loading ID replacement requests:", error);
    document.getElementById("id-replacement-tbody").innerHTML = 
      `<tr><td colspan="7" class="text-center py-4 text-danger">Error loading data: ${escapeHtml(error.message)}</td></tr>`;
    return 0;
  }
}

// Load Leave of Absence Requests
async function loadLeaveOfAbsenceRequests() {
  try {
    const supabase = await getSupabase();
    const period = getAcademicPeriodRange();
    let query = supabase
      .from("leave_of_absence")
      .select("*")
      .eq("archived", false)
      .eq("organization_id", currentOrganizationId);

    if (period) {
      query = query.eq("academic_year", period.year).eq("semester", period.semester);
    }

    let { data, error } = await query.order("date", { ascending: false });

    if (error && String(error.message || "").toLowerCase().includes("academic_year")) {
      ({ data, error } = await supabase
        .from("leave_of_absence")
        .select("*")
        .eq("archived", false)
        .eq("organization_id", currentOrganizationId)
        .gte("date", period?.startDate || "0001-01-01")
        .lte("date", period?.endDate || "9999-12-31")
        .order("date", { ascending: false }));
    }

    if (error) throw error;

    const tbody = document.getElementById("leave-of-absence-tbody");
    
    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No leave of absence requests recorded</td></tr>`;
      return 0;
    }

    tbody.innerHTML = data
      .map(
        (record) => `
        <tr>
          <td><strong>${escapeHtml(record.sr_code || "N/A")}</strong></td>
          <td>${escapeHtml(record.name || "N/A")}</td>
          <td>${escapeHtml(record.semester_period_covered || "N/A")}</td>
          <td>${formatDate(record.date)}</td>
          <td>${escapeHtml(record.time_out || "N/A")}</td>
          <td>${escapeHtml(record.time_in || "N/A")}</td>
          <td><span class="badge bg-success">Approved</span></td>
        </tr>
      `
      )
      .join("");

    return data.length;
  } catch (error) {
    console.error("Error loading leave of absence requests:", error);
    document.getElementById("leave-of-absence-tbody").innerHTML = 
      `<tr><td colspan="7" class="text-center py-4 text-danger">Error loading data: ${escapeHtml(error.message)}</td></tr>`;
    return 0;
  }
}

// Load all data and update stats
async function loadAllData() {
  console.log("Starting to load all data...");
  
  const [minorCount, majorCount, uniformCount, gatepassCount, goodMoralCount, idReplacementCount, leaveOfAbsenceCount] = await Promise.all([
    loadMinorOffenses(),
    loadMajorOffenses(),
    loadUniformViolations(),
    loadGatepassRequests(),
    loadGoodMoralRequests(),
    loadIdReplacementRequests(),
    loadLeaveOfAbsenceRequests(),
  ]);

  console.log("Counts:", { minorCount, majorCount, uniformCount, gatepassCount, goodMoralCount, idReplacementCount, leaveOfAbsenceCount });

  // Update overview stats
  document.getElementById("total-minor").textContent = minorCount;
  document.getElementById("total-major").textContent = majorCount;
  document.getElementById("total-uniform").textContent = uniformCount;
  document.getElementById("total-gatepass").textContent = gatepassCount;
  document.getElementById("total-goodmoral").textContent = goodMoralCount;
  document.getElementById("total-idreplacement").textContent = idReplacementCount;
  document.getElementById("total-leaveofabsence").textContent = leaveOfAbsenceCount;
  
  console.log("Stats updated in DOM");
}

// Initialize
(async function init() {
  console.log("Initializing reports page...");
  const isHead = await checkHeadAccess();
  console.log("Is head user:", isHead);
  if (isHead) {
    console.log("Loading all data...");
    await loadAllData();
    console.log("Data loading complete");
  }
})();
