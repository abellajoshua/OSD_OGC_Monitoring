import { getSupabase } from "./supabaseClient.js?v=4";

const ADMIN_EMAIL = "mcdoelfamini10@gmail.com";

const createUserForm = document.querySelector("#create-user-form");
const createStatus = document.querySelector("#create-status");
const usersTableBody = document.querySelector("#users-table-body");
const usersStatus = document.querySelector("#users-status");
const logoutBtn = document.querySelector("#logout-btn");
const refreshBtn = document.querySelector("#refresh-btn");

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

  if (session.user.email !== ADMIN_EMAIL) {
    alert("Access denied. Admin privileges required.");
    window.location.href = "index.html";
    return false;
  }

  return true;
}

// Load all user accounts
async function loadUsers() {
  try {
    const supabase = await getSupabase();
    
    // Get all users from user_accounts table
    const { data: accounts, error: accountsError } = await supabase
      .from("user_accounts")
      .select("*")
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
            <td colspan="5" class="text-center py-5">
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

    if (!accounts || accounts.length === 0) {
      usersTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-5">
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
                : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
            }; color: white; text-transform: uppercase; letter-spacing: 0.05em;">
              ${escapeHtml(account.role || "user")}
            </span>
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
        <td colspan="5" class="text-center py-5">
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
async function createUser(email, password, fullName, role) {
  try {
    // Call the API endpoint to create user without affecting admin session
    const response = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, fullName, role }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create user');
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

// Delete user
async function deleteUser(email) {
  try {
    // Call the API endpoint to delete user from both Auth and database
    const response = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete user');
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

    const success = await createUser(email, password, fullName, role);
    
    // Close modal on success
    if (success) {
      const modalElement = document.getElementById('createUserModal');
      if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
          modal.hide();
        }
      }
      // Clear the form
      createUserForm.reset();
      createStatus.innerHTML = '';
    }
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
  const isAdmin = await checkAdminAccess();
  if (isAdmin) {
    await loadUsers();
  }
})();
