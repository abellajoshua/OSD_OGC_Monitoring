import { getSupabase } from "./supabaseClient.js?v=3";

const HEAD_ROLE = "head";

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
    .select("role")
    .eq("email", session.user.email)
    .single();

  console.log("User account:", userAccount, "Error:", error);

  if (error) {
    console.error("Error checking user role:", error);
    alert(`Error checking user role: ${error.message}`);
    return false;
  }

  if (!userAccount || userAccount.role !== HEAD_ROLE) {
    alert("Access denied. This page is for HEAD role only.");
    window.location.href = "index.html";
    return false;
  }

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
    
    // Close mobile sidebar
    const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById("sidebarNav"));
    if (offcanvas) {
      offcanvas.hide();
    }
  });
});

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
    console.log("Fetching minor offenses...");
    
    const { data, error } = await supabase
      .from("minor_offenses")
      .select("*")
      .order("date_of_complaint", { ascending: false });

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

// Load Uniform Violations
async function loadUniformViolations() {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("non_wearing_uniform")
      .select("*")
      .order("date", { ascending: false });

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
    const { data, error } = await supabase
      .from("gatepass")
      .select("*")
      .order("date", { ascending: false });

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
    const { data, error } = await supabase
      .from("good_moral")
      .select("*")
      .order("date", { ascending: false });

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
    const { data, error } = await supabase
      .from("id_replacement")
      .select("*")
      .order("date", { ascending: false });

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
    const { data, error } = await supabase
      .from("leave_of_absence")
      .select("*")
      .order("date", { ascending: false });

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
    console.error("Error loading leave of absence requests:", error);
    document.getElementById("leave-of-absence-tbody").innerHTML = 
      `<tr><td colspan="7" class="text-center py-4 text-danger">Error loading data: ${escapeHtml(error.message)}</td></tr>`;
    return 0;
  }
}

// Load all data and update stats
async function loadAllData() {
  console.log("Starting to load all data...");
  
  const [minorCount, uniformCount, gatepassCount, goodMoralCount, idReplacementCount, leaveOfAbsenceCount] = await Promise.all([
    loadMinorOffenses(),
    loadUniformViolations(),
    loadGatepassRequests(),
    loadGoodMoralRequests(),
    loadIdReplacementRequests(),
    loadLeaveOfAbsenceRequests(),
  ]);

  console.log("Counts:", { minorCount, uniformCount, gatepassCount, goodMoralCount, idReplacementCount, leaveOfAbsenceCount });

  // Update overview stats
  document.getElementById("total-minor").textContent = minorCount;
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
