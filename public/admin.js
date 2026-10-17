import { getSupabase } from "./supabaseClient.js?v=5";

const createUserForm = document.querySelector("#create-user-form");
const createStatus = document.querySelector("#create-status");
const usersTableBody = document.querySelector("#users-table-body");
const usersStatus = document.querySelector("#users-status");
const logoutBtn = document.querySelector("#logout-btn");
const refreshBtn = document.querySelector("#refresh-btn");
const organizationSelect = document.querySelector("#new-organization");
const roleSelect = document.querySelector("#new-role");

const studentsCampusSelect = document.querySelector("#students-campus");
const studentsAcademicYearInput = document.querySelector("#students-academic-year");
const studentsSemesterSelect = document.querySelector("#students-semester");
const studentsSearchInput = document.querySelector("#students-search");
const studentsRefreshBtn = document.querySelector("#students-refresh-btn");
const studentsCsvFileInput = document.querySelector("#students-csv-file");
const studentsUploadBtn = document.querySelector("#students-upload-btn");
const studentsUploadSummary = document.querySelector("#students-upload-summary");
const studentsTableBody = document.querySelector("#students-table-body");
const studentsStatus = document.querySelector("#students-status");
const studentsTemplateBtn = document.querySelector("#students-template-btn");
const addStudentBtn = document.querySelector("#add-student-btn");
const studentForm = document.querySelector("#student-form");
const studentFormStatus = document.querySelector("#student-form-status");
const studentModalLabel = document.querySelector("#studentModalLabel");
const studentSaveBtn = document.querySelector("#student-save-btn");

let currentUserAccount = null;
let alangilanOrganizationId = null;
let headAccountExists = false;
let studentsCached = [];

function showCreateError(message) {
  if (!createStatus) return;
  createStatus.innerHTML = `
    <div class="alert alert-danger" style="border: none; border-radius: 8px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 1rem;">
      <strong>Error:</strong> ${escapeHtml(message)}
    </div>
  `;
}

function updateHeadRoleConstraints() {
  if (!roleSelect || !organizationSelect) return;

  const headOption = roleSelect.querySelector('option[value="head"]');
  if (headOption) {
    headOption.disabled = headAccountExists;
    headOption.textContent = headAccountExists
      ? "Head - Already Assigned (Alangilan)"
      : "Head - View Only (Alangilan Only)";
  }

  if (headAccountExists && roleSelect.value === "head") {
    roleSelect.value = "coordinator";
  }

  const isHeadRole = roleSelect.value === "head";
  if (isHeadRole) {
    if (!alangilanOrganizationId) {
      showCreateError("Head role requires an existing Alangilan organization.");
      roleSelect.value = "coordinator";
      organizationSelect.disabled = false;
      return;
    }
    organizationSelect.value = String(alangilanOrganizationId);
    organizationSelect.setAttribute("disabled", "disabled");
    organizationSelect.title = "Head accounts are automatically assigned to Alangilan.";
    return;
  }

  organizationSelect.title = "";
  if (currentUserAccount?.organization_id) {
    organizationSelect.value = String(currentUserAccount.organization_id);
    organizationSelect.setAttribute("disabled", "disabled");
    return;
  }

  organizationSelect.removeAttribute("disabled");
}

async function getAccessToken() {
  const supabase = await getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || "";
}

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

function getResponseErrorMessage(result, fallbackMessage) {
  const rawMessage = String(result?.error || result?.message || result?.raw || fallbackMessage || "Request failed").trim();
  return rawMessage || fallbackMessage || "Request failed";
}

async function checkServerEnvironmentStatus() {
  if (!usersStatus) return;

  try {
    const token = await getAccessToken();
    if (!token) return;

    const response = await fetch("/api/env-status", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const result = await parseApiResponse(response);
    if (!response.ok) {
      return;
    }

    const missing = Array.isArray(result?.missing) ? result.missing : [];
    if (!missing.length) {
      return;
    }

    usersStatus.innerHTML = `
      <div class="alert alert-warning" style="border: none; border-radius: 8px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 1rem; margin: 0 0 1rem 0;">
        <strong>Server Environment Incomplete:</strong> Missing ${escapeHtml(missing.join(", "))}.<br>
        Add these exact keys in Vercel Project Settings → Environment Variables, then redeploy.
      </div>
    `;
  } catch {
    // No-op: avoid blocking admin page load when status check fails.
  }
}

function blurActiveElement() {
  if (document.activeElement && typeof document.activeElement.blur === "function") {
    document.activeElement.blur();
  }
}

function bindCreateUserModalGuards() {
  const modalElement = document.getElementById("createUserModal");
  if (!modalElement) return;

  modalElement.addEventListener("show.bs.modal", () => {
    modalElement.removeAttribute("inert");
    modalElement.setAttribute("aria-hidden", "false");
  });

  modalElement.addEventListener("hide.bs.modal", () => {
    blurActiveElement();
  });

  modalElement.addEventListener("hidden.bs.modal", () => {
    modalElement.setAttribute("inert", "");
    modalElement.setAttribute("aria-hidden", "true");
  });
}

// Check if user is admin
async function checkAdminAccess() {
  const supabase = await getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "login.html";
    return false;
  }

  const { data: userAccount } = await supabase
    .from("user_accounts")
    .select("role, organization_id")
    .eq("user_id", session.user.id)
    .single();

  if (!userAccount || userAccount.role !== "admin") {
    alert("Access denied. Admin privileges required.");
    window.location.href = "index.html";
    return false;
  }

  currentUserAccount = userAccount;

  if (organizationSelect && currentUserAccount.organization_id) {
    organizationSelect.value = String(currentUserAccount.organization_id);
    organizationSelect.setAttribute("disabled", "disabled");
  }

  return true;
}

async function loadOrganizations() {
  if (!organizationSelect) return;
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, type")
    .order("type", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  alangilanOrganizationId = null;
  (data || []).forEach((org) => {
    if (String(org.name || "").trim().toLowerCase() === "alangilan") {
      alangilanOrganizationId = Number(org.id);
    }
  });

  organizationSelect.innerHTML = (data || [])
    .map((org) => `<option value="${org.id}">${escapeHtml(org.name)} (${escapeHtml(org.type)})</option>`)
    .join("");

  updateHeadRoleConstraints();
}

// Load all user accounts
async function loadUsers() {
  try {
    const supabase = await getSupabase();
    
    // Get all users from user_accounts table
    const { data: accounts, error: accountsError } = await supabase
      .from("user_accounts")
      .select("*, organizations(name, type)")
      .order("created_at", { ascending: false });

    if (accountsError) {
      if (accountsError.message.includes("does not exist")) {
        usersStatus.innerHTML = `
          <div class="alert alert-warning" style="border: none; border-radius: 8px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 1.5rem; margin: 0;">
            <h5 style="margin: 0 0 1rem 0; font-weight: 700;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 0.5rem; vertical-align: middle;">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
              </svg>
              Database Setup Required
            </h5>
            <p style="margin-bottom: 1rem; line-height: 1.6;">
              The user_accounts table has not been created in your Supabase database yet.<br>
              Follow these steps to fix this:
            </p>
            <ol style="margin: 0; padding-left: 1.5rem; line-height: 1.8;">
              <li>Open <a href="https://supabase.com/dashboard/projects" target="_blank" style="color: white; text-decoration: underline; font-weight: 600;">Supabase SQL Editor</a> in a new tab</li>
              <li>Copy all contents from <code style="background: rgba(0,0,0,0.2); padding: 0.25rem 0.5rem; border-radius: 4px;">create_user_accounts_table.sql</code></li>
              <li>Paste into SQL Editor and click <strong>"Run"</strong></li>
              <li>Come back and click the Refresh button above</li>
            </ol>
          </div>
        `;
        usersTableBody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-5">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="#f59e0b" style="margin-bottom: 1rem;">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
              </svg>
              <p style="color: #f59e0b; font-weight: 600; margin: 0;">Database Not Configured</p>
              <small style="color: #6b7280;">Follow the instructions above to set up the database</small>
            </td>
          </tr>
        `;
        return;
      }
      throw accountsError;
    }

    headAccountExists = (accounts || []).some((account) => account.role === "head");
    updateHeadRoleConstraints();

    if (!accounts || accounts.length === 0) {
      usersTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-5">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="#d1d5db" style="margin-bottom: 1rem;">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
            </svg>
            <p style="color: #6b7280; font-size: 1rem; margin: 0;">No user accounts found</p>
            <small style="color: #9ca3af;">Create your first user account using the form</small>
          </td>
        </tr>
      `;
      usersStatus.innerHTML = '';
      return;
    }

    usersTableBody.innerHTML = accounts
      .map(
        (account) => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 1rem 1.5rem;">
            <div style="font-weight: 500; color: #111827;">${escapeHtml(account.email)}</div>
          </td>
          <td style="padding: 1rem 1.5rem;">
            <div style="color: #374151;">${escapeHtml(account.full_name || "N/A")}</div>
          </td>
          <td style="padding: 1rem 1.5rem;">
            <span class="badge" style="padding: 0.5rem 1rem; font-weight: 600; font-size: 0.75rem; border-radius: 6px; background: ${
              account.role === "admin"
                ? "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)"
                : account.role === "head"
                ? "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)"
                : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
            }; color: white; text-transform: uppercase; letter-spacing: 0.05em;">
              ${escapeHtml(account.role || "user")}
            </span>
          </td>
          <td style="padding: 1rem 1.5rem; color: #374151;">
            ${escapeHtml(account.organizations?.name || "N/A")}
          </td>
          <td style="padding: 1rem 1.5rem;">
            <div style="color: #6b7280; font-size: 0.875rem;">${new Date(account.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}</div>
            <div style="color: #9ca3af; font-size: 0.75rem;">${new Date(account.created_at).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}</div>
          </td>
          <td style="padding: 1rem 1.5rem;">
            <button class="btn btn-sm delete-user-btn" data-email="${escapeHtml(
              account.email
            )}" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border: none; border-radius: 6px; padding: 0.5rem 1rem; font-weight: 600; font-size: 0.875rem;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 0.25rem; vertical-align: middle;">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
              Delete
            </button>
          </td>
        </tr>
      `
      )
      .join("");

    // Add delete event listeners
    document.querySelectorAll(".delete-user-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const email = e.target.closest('button').dataset.email;
        const confirmMsg = `Are you sure you want to delete this user?\n\nEmail: ${email}\n\nThis action cannot be undone.`;
        if (confirm(confirmMsg)) {
          await deleteUser(email);
        }
      });
    });

    usersStatus.innerHTML = `
      <div class="alert alert-success" style="border: none; border-radius: 8px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 1rem; margin: 0;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 0.5rem; vertical-align: middle;">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        <strong>${accounts.length} ${accounts.length === 1 ? 'user account' : 'user accounts'}</strong> found
      </div>
    `;
  } catch (error) {
    console.error("Error loading users:", error);
    usersStatus.innerHTML = `
      <div class="alert alert-danger" style="border: none; border-radius: 8px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 1rem; margin: 0;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 0.5rem; vertical-align: middle;">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <strong>Error loading users:</strong> ${escapeHtml(error.message)}
      </div>
    `;
    usersTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-5">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="#ef4444" style="margin-bottom: 1rem;">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <p style="color: #ef4444; font-weight: 600; margin: 0;">Error Loading Users</p>
          <small style="color: #6b7280;">Check the error message above for details</small>
        </td>
      </tr>
    `;
  }
}

// Create new user account
async function createUser(email, password, fullName, role, organizationId) {
  try {
    const normalizedRole = String(role || "").toLowerCase();
    if (normalizedRole === "head") {
      if (headAccountExists) {
        throw new Error("A Head account already exists. Only one Head account is allowed.");
      }
      if (!alangilanOrganizationId) {
        throw new Error("Alangilan organization is required before creating a Head account.");
      }
    }

    const finalOrganizationId =
      normalizedRole === "head" ? Number(alangilanOrganizationId) : Number(organizationId);

    const token = await getAccessToken();

    // Call the API endpoint to create user without affecting admin session
    const response = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email,
        password,
        fullName,
        role: normalizedRole,
        organization_id: finalOrganizationId,
      }),
    });

    const result = await parseApiResponse(response);

    if (!response.ok) {
      const rawMessage = getResponseErrorMessage(result, 'Failed to create user');
      const normalizedMessage = rawMessage.toLowerCase().includes('invalid api key')
        ? 'Server admin setup is incomplete. Please configure a valid SUPABASE_SERVICE_ROLE_KEY.'
        : rawMessage;
      throw new Error(normalizedMessage);
    }

    // Show success message in users status area
    usersStatus.innerHTML = `
      <div class="alert alert-success" style="border: none; border-radius: 8px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 1rem; margin: 0;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 0.5rem; vertical-align: middle;">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        <strong>Success!</strong> User account created for ${escapeHtml(email)}. User can now login.
      </div>
    `;
    
    await loadUsers();
    
    // Auto-clear success message after 5 seconds
    setTimeout(() => {
      usersStatus.innerHTML = '';
    }, 5000);
    
    return true;
  } catch (error) {
    console.error("Error creating user:", error);
    createStatus.innerHTML = `
      <div class="alert alert-danger" style="border: none; border-radius: 8px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 1rem;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 0.5rem; vertical-align: middle;">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <strong>Error:</strong> ${escapeHtml(error.message)}
      </div>
    `;
    return false;
  }
}

async function deleteUserAccountDirect(email) {
  const supabase = await getSupabase();

  const { data: userAccount, error: lookupError } = await supabase
    .from("user_accounts")
    .select("role")
    .eq("email", email)
    .single();

  if (lookupError) {
    throw new Error(lookupError.message || "User account not found.");
  }

  if (userAccount?.role === "admin") {
    throw new Error("The single admin account cannot be deleted.");
  }

  const { error: deleteError } = await supabase.from("user_accounts").delete().eq("email", email);

  if (deleteError) {
    throw new Error(deleteError.message || "Failed to delete user account.");
  }
}

// Delete user
async function deleteUser(email) {
  try {
    const token = await getAccessToken();

    // Call the API endpoint to delete user from both Auth and database
    const response = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email }),
    });

    const result = await parseApiResponse(response);

    if (!response.ok) {
      const errorMessage = getResponseErrorMessage(result, 'Failed to delete user');
      if (errorMessage.toLowerCase().includes("invalid api key")) {
        await deleteUserAccountDirect(email);
        usersStatus.innerHTML = `
          <div class="alert alert-success" style="border: none; border-radius: 8px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 1rem; margin: 0;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 0.5rem; vertical-align: middle;">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            <strong>User deleted permanently!</strong> - ${escapeHtml(email)} has been removed successfully.
          </div>
        `;
        await loadUsers();
        setTimeout(() => {
          usersStatus.innerHTML = '';
        }, 5000);
        return;
      }
      throw new Error(errorMessage);
    }

    usersStatus.innerHTML = `
      <div class="alert alert-success" style="border: none; border-radius: 8px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 1rem; margin: 0;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 0.5rem; vertical-align: middle;">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        <strong>User deleted permanently!</strong> - ${escapeHtml(email)} has been removed from database and authentication system
      </div>
    `;
    await loadUsers();
    
    // Auto-clear success message after 5 seconds
    setTimeout(() => {
      usersStatus.innerHTML = '';
    }, 5000);
  } catch (error) {
    console.error("Error deleting user:", error);
    usersStatus.innerHTML = `
      <div class="alert alert-danger" style="border: none; border-radius: 8px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 1rem; margin: 0;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 0.5rem; vertical-align: middle;">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <strong>Error:</strong> ${escapeHtml(error.message)}
      </div>
    `;
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ==================== Student Details Module ====================

const STUDENT_CSV_HEADERS = ["sr_code", "name", "program", "year_level", "academic_year", "semester"];

async function loadStudentCampuses() {
  if (!studentsCampusSelect) return;
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, type")
    .order("type", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    studentsCampusSelect.innerHTML = `<option value="">Failed to load campuses</option>`;
    return;
  }

  studentsCampusSelect.innerHTML =
    `<option value="">All Campuses</option>` +
    (data || [])
      .map((org) => `<option value="${org.id}">${escapeHtml(org.name)} (${escapeHtml(org.type)})</option>`)
      .join("");
}

function setStudentsStatus(html) {
  if (studentsStatus) studentsStatus.innerHTML = html;
}

async function loadStudents() {
  if (!studentsTableBody) return;
  studentsTableBody.innerHTML = `
    <tr>
      <td colspan="7" class="text-center py-5">
        <div class="spinner-border text-primary" role="status" style="width: 2.5rem; height: 2.5rem;">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="text-muted mt-3 mb-0" style="font-size: 1.125rem; font-weight: 500;">Loading students...</p>
      </td>
    </tr>
  `;

  try {
    const token = await getAccessToken();
    const params = new URLSearchParams();
    const organizationId = studentsCampusSelect?.value || "";
    const academicYear = (studentsAcademicYearInput?.value || "").trim();
    const semester = studentsSemesterSelect?.value || "";
    const search = (studentsSearchInput?.value || "").trim();

    if (organizationId) params.set("organization_id", organizationId);
    if (academicYear) params.set("academic_year", academicYear);
    if (semester) params.set("semester", semester);
    if (search) params.set("q", search);

    const response = await fetch(`/api/students?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const result = await parseApiResponse(response);

    if (!response.ok) {
      throw new Error(getResponseErrorMessage(result, "Failed to load students"));
    }

    studentsCached = Array.isArray(result) ? result : [];

    if (!studentsCached.length) {
      studentsTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-5">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="#d1d5db" style="margin-bottom: 1rem;">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
            </svg>
            <p style="color: #6b7280; font-size: 1rem; margin: 0;">No student records found</p>
            <small style="color: #9ca3af;">Upload a CSV or add a student manually</small>
          </td>
        </tr>
      `;
      setStudentsStatus("");
      return;
    }

    studentsTableBody.innerHTML = studentsCached
      .map(
        (student) => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 1rem 1.5rem;">
            <div style="font-weight: 600; color: #111827;">${escapeHtml(student.sr_code)}</div>
          </td>
          <td style="padding: 1rem 1.5rem; color: #374151;">${escapeHtml(student.name)}</td>
          <td style="padding: 1rem 1.5rem; color: #374151;">${escapeHtml(student.program)}</td>
          <td style="padding: 1rem 1.5rem; color: #374151;">${escapeHtml(student.year_level)}</td>
          <td style="padding: 1rem 1.5rem; color: #374151;">${escapeHtml(student.academic_year)}</td>
          <td style="padding: 1rem 1.5rem; color: #374151;">${escapeHtml(student.semester)}</td>
          <td style="padding: 1rem 1.5rem;">
            <div class="d-flex gap-2">
              <button class="btn btn-sm edit-student-btn" data-id="${student.id}" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; border-radius: 6px; padding: 0.5rem 0.9rem; font-weight: 600; font-size: 0.875rem;">Edit</button>
              <button class="btn btn-sm delete-student-btn" data-id="${student.id}" data-sr-code="${escapeHtml(student.sr_code)}" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border: none; border-radius: 6px; padding: 0.5rem 0.9rem; font-weight: 600; font-size: 0.875rem;">Delete</button>
            </div>
          </td>
        </tr>
      `
      )
      .join("");

    document.querySelectorAll(".edit-student-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const student = studentsCached.find((item) => String(item.id) === String(btn.dataset.id));
        if (student) openStudentModal(student);
      });
    });

    document.querySelectorAll(".delete-student-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const confirmMsg = `Delete student record?\n\nSr-Code: ${btn.dataset.srCode}\n\nThis action cannot be undone.`;
        if (confirm(confirmMsg)) {
          await deleteStudent(btn.dataset.id);
        }
      });
    });

    setStudentsStatus(`
      <div class="alert alert-success" style="border: none; border-radius: 8px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 1rem; margin: 0;">
        <strong>${studentsCached.length} ${studentsCached.length === 1 ? "student record" : "student records"}</strong> found
      </div>
    `);
  } catch (error) {
    console.error("Error loading students:", error);
    setStudentsStatus(`
      <div class="alert alert-danger" style="border: none; border-radius: 8px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 1rem; margin: 0;">
        <strong>Error loading students:</strong> ${escapeHtml(error.message)}
      </div>
    `);
    studentsTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-5">
          <p style="color: #ef4444; font-weight: 600; margin: 0;">Error Loading Students</p>
          <small style="color: #6b7280;">Check the error message above for details</small>
        </td>
      </tr>
    `;
  }
}

function downloadStudentsTemplate() {
  const csv = [STUDENT_CSV_HEADERS.join(","), "21-01234,Juan Dela Cruz,BSIT,3rd Year,2025-2026,First Semester"].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "students-template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.some((cell) => String(cell).trim() !== "")) {
        rows.push(row);
      }
      row = [];
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((cell) => String(cell).trim() !== "")) {
    rows.push(row);
  }

  return rows;
}

function mapCsvRows(parsedRows) {
  if (!parsedRows.length) return { rows: [], error: "CSV file is empty." };

  const header = parsedRows[0].map((cell) => String(cell).trim().toLowerCase());
  const expected = STUDENT_CSV_HEADERS.map((h) => h.toLowerCase());
  const missing = expected.filter((column) => !header.includes(column));

  if (missing.length) {
    return { rows: [], error: `CSV header missing columns: ${missing.join(", ")}` };
  }

  const rows = parsedRows.slice(1)
    .map((cells) => {
      const record = {};
      header.forEach((column, index) => {
        record[column] = String(cells[index] || "").trim();
      });
      return record;
    })
    .filter((record) => Object.values(record).some((value) => value !== ""));

  return { rows, error: null };
}

async function uploadStudentsCsv() {
  if (!studentsCsvFileInput || !studentsUploadBtn || !studentsUploadSummary) return;

  const file = studentsCsvFileInput.files?.[0];
  if (!file) {
    studentsUploadSummary.innerHTML = `
      <div class="alert alert-warning mb-0" style="border: none; border-radius: 8px; padding: 0.75rem 1rem;">Select a CSV file first.</div>
    `;
    return;
  }

  const organizationId = Number(studentsCampusSelect?.value || "");
  if (!organizationId) {
    studentsUploadSummary.innerHTML = `
      <div class="alert alert-warning mb-0" style="border: none; border-radius: 8px; padding: 0.75rem 1rem;">Choose a campus from the Campus dropdown before uploading.</div>
    `;
    return;
  }

  studentsUploadBtn.disabled = true;
  studentsUploadBtn.textContent = "Uploading...";

  try {
    const text = await file.text();
    const parsed = parseCsv(String(text).replace(/^\uFEFF/, ""));
    const { rows, error: mapError } = mapCsvRows(parsed);

    if (mapError) {
      throw new Error(mapError);
    }

    if (!rows.length) {
      throw new Error("No data rows found in the CSV.");
    }

    const token = await getAccessToken();
    const response = await fetch("/api/students/bulk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        organization_id: organizationId,
        rows,
      }),
    });

    const result = await parseApiResponse(response);

    if (!response.ok) {
      throw new Error(getResponseErrorMessage(result, "Upload failed"));
    }

    const rejected = Number(result.rejected || 0);
    const upserted = Number(result.upserted || 0);
    const errorLines = Array.isArray(result.errors) ? result.errors.slice(0, 5) : [];

    studentsUploadSummary.innerHTML = `
      <div class="alert ${rejected ? "alert-warning" : "alert-success"} mb-0" style="border: none; border-radius: 8px; padding: 0.75rem 1rem;">
        <strong>Upload complete.</strong> ${upserted} row(s) upserted, ${rejected} rejected.
        ${errorLines.length ? `<br><small>${errorLines.map((line) => escapeHtml(line)).join("<br>")}${(result.errors || []).length > 5 ? "<br>..." : ""}</small>` : ""}
      </div>
    `;

    studentsCsvFileInput.value = "";
    await loadStudents();
  } catch (error) {
    console.error("Error uploading students CSV:", error);
    studentsUploadSummary.innerHTML = `
      <div class="alert alert-danger mb-0" style="border: none; border-radius: 8px; padding: 0.75rem 1rem;">
        <strong>Error:</strong> ${escapeHtml(error.message)}
      </div>
    `;
  } finally {
    studentsUploadBtn.disabled = false;
    studentsUploadBtn.textContent = "Upload CSV";
  }
}

function getStudentModal() {
  const modalElement = document.getElementById("studentModal");
  return modalElement ? bootstrap.Modal.getOrCreateInstance(modalElement) : null;
}

function openStudentModal(student = null) {
  if (!studentForm) return;

  studentForm.reset();
  studentFormStatus.innerHTML = "";

  const isEdit = Boolean(student);
  if (studentModalLabel) {
    studentModalLabel.textContent = isEdit ? "Edit Student" : "Add Student";
  }
  if (studentSaveBtn) {
    studentSaveBtn.textContent = isEdit ? "Update Student" : "Save Student";
  }
  document.querySelector("#student-id").value = student ? String(student.id) : "";

  if (student) {
    document.querySelector("#student-sr-code").value = student.sr_code || "";
    document.querySelector("#student-name").value = student.name || "";
    document.querySelector("#student-program").value = student.program || "";
    document.querySelector("#student-year-level").value = student.year_level || "";
    document.querySelector("#student-academic-year").value = student.academic_year || "";
    document.querySelector("#student-semester").value = student.semester || "First Semester";
  } else {
    document.querySelector("#student-semester").value = studentsSemesterSelect?.value || "First Semester";
    document.querySelector("#student-academic-year").value = (studentsAcademicYearInput?.value || "").trim();
  }

  const modal = getStudentModal();
  if (modal) modal.show();
}

async function saveStudent(formData) {
  const id = String(formData.get("id") || "").trim();
  const token = await getAccessToken();

  if (id) {
    const response = await fetch(`/api/students/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        sr_code: formData.get("sr_code"),
        name: formData.get("name"),
        program: formData.get("program"),
        year_level: formData.get("year_level"),
        academic_year: formData.get("academic_year"),
        semester: formData.get("semester"),
      }),
    });
    const result = await parseApiResponse(response);
    if (!response.ok) {
      throw new Error(getResponseErrorMessage(result, "Failed to update student"));
    }
    return result;
  }

  const organizationId = Number(studentsCampusSelect?.value || "");
  if (!organizationId) {
    throw new Error("Choose a campus from the Campus dropdown before adding a student.");
  }

  const response = await fetch("/api/students", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      organization_id: organizationId,
      sr_code: formData.get("sr_code"),
      name: formData.get("name"),
      program: formData.get("program"),
      year_level: formData.get("year_level"),
      academic_year: formData.get("academic_year"),
      semester: formData.get("semester"),
    }),
  });

  const result = await parseApiResponse(response);
  if (!response.ok) {
    throw new Error(getResponseErrorMessage(result, "Failed to add student"));
  }
  return result;
}

async function deleteStudent(id) {
  try {
    const token = await getAccessToken();
    const response = await fetch(`/api/students/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await parseApiResponse(response);
    if (!response.ok) {
      throw new Error(getResponseErrorMessage(result, "Failed to delete student"));
    }

    setStudentsStatus(`
      <div class="alert alert-success" style="border: none; border-radius: 8px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 1rem; margin: 0;">
        <strong>Student record deleted.</strong>
      </div>
    `);
    await loadStudents();
  } catch (error) {
    console.error("Error deleting student:", error);
    setStudentsStatus(`
      <div class="alert alert-danger" style="border: none; border-radius: 8px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 1rem; margin: 0;">
        <strong>Error:</strong> ${escapeHtml(error.message)}
      </div>
    `);
  }
}

function bindStudentModuleEvents() {
  if (studentsRefreshBtn) {
    studentsRefreshBtn.addEventListener("click", () => loadStudents());
  }

  if (studentsSearchInput) {
    let debounceTimer = null;
    studentsSearchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => loadStudents(), 400);
    });
  }

  if (studentsCampusSelect) {
    studentsCampusSelect.addEventListener("change", () => loadStudents());
  }

  if (studentsAcademicYearInput) {
    studentsAcademicYearInput.addEventListener("change", () => loadStudents());
  }

  if (studentsSemesterSelect) {
    studentsSemesterSelect.addEventListener("change", () => loadStudents());
  }

  if (studentsTemplateBtn) {
    studentsTemplateBtn.addEventListener("click", downloadStudentsTemplate);
  }

  if (studentsUploadBtn) {
    studentsUploadBtn.addEventListener("click", uploadStudentsCsv);
  }

  if (addStudentBtn) {
    addStudentBtn.addEventListener("click", () => openStudentModal(null));
  }

  if (studentForm) {
    studentForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      studentFormStatus.innerHTML = `
        <div class="alert alert-info" style="border: none; border-radius: 8px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 1rem;">
          Saving student record...
        </div>
      `;

      try {
        const formData = new FormData(studentForm);
        await saveStudent(formData);
        const modal = getStudentModal();
        if (modal) modal.hide();
        await loadStudents();
      } catch (error) {
        studentFormStatus.innerHTML = `
          <div class="alert alert-danger" style="border: none; border-radius: 8px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 1rem;">
            <strong>Error:</strong> ${escapeHtml(error.message)}
          </div>
        `;
      }
    });
  }

  const studentModalElement = document.getElementById("studentModal");
  if (studentModalElement) {
    studentModalElement.addEventListener("show.bs.modal", () => {
      studentModalElement.removeAttribute("inert");
      studentModalElement.setAttribute("aria-hidden", "false");
    });
    studentModalElement.addEventListener("hidden.bs.modal", () => {
      studentModalElement.setAttribute("inert", "");
      studentModalElement.setAttribute("aria-hidden", "true");
    });
  }
}

// Form submit handler
if (createUserForm) {
  createUserForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    createStatus.innerHTML = `<div class="alert alert-info" style="border: none; border-radius: 8px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 1rem;">
      <div class="spinner-border spinner-border-sm me-2" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      Creating user account...
    </div>`;

    const formData = new FormData(createUserForm);
    const email = formData.get("email");
    const password = formData.get("password");
    const fullName = formData.get("name");
    const role = formData.get("role");
    const organizationId = formData.get("organization_id");

    if (role === "head" && headAccountExists) {
      showCreateError("A Head account already exists. Only one Head account is allowed.");
      return;
    }

    const success = await createUser(email, password, fullName, role, organizationId);
    
    // Close modal on success
    if (success) {
      const modalElement = document.getElementById('createUserModal');
      if (modalElement) {
        blurActiveElement();
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
          modal.hide();
        }
        modalElement.setAttribute("inert", "");
      }
      // Clear the form
      createUserForm.reset();
      createStatus.innerHTML = '';
    }
  });
}

if (roleSelect) {
  roleSelect.addEventListener("change", () => {
    createStatus.innerHTML = "";
    updateHeadRoleConstraints();
  });
}

// Refresh button
if (refreshBtn) {
  refreshBtn.addEventListener("click", async () => {
    usersStatus.innerHTML = `<div class="alert alert-info" style="border: none; border-radius: 8px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 1rem; margin: 0;">
      <div class="spinner-border spinner-border-sm me-2" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      Refreshing user list...
    </div>`;
    await loadUsers();
  });
}

// Logout functionality
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    const supabase = await getSupabase();
    await supabase.auth.signOut();
    window.location.href = "login.html";
  });
}

// Initialize on page load
(async function init() {
  bindCreateUserModalGuards();
  bindStudentModuleEvents();
  const isAdmin = await checkAdminAccess();
  if (isAdmin) {
    await loadOrganizations();
    await loadUsers();
    await loadStudentCampuses();
    await loadStudents();
    await checkServerEnvironmentStatus();
  }
})();
