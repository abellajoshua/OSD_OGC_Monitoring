import { getSupabase } from "./supabaseClient.js?v=4";

const loginForm = document.querySelector("#login-form");
const statusEl = document.querySelector("#login-status");

function persistUserContext(userAccount) {
  if (!userAccount) return;
  localStorage.setItem("userRole", userAccount.role || "");
  localStorage.setItem("organizationId", String(userAccount.organization_id || ""));
}

function routeByRole(role) {
  if (role === "admin") {
    window.location.href = "admin.html";
    return;
  }
  window.location.href = "index.html";
}

async function redirectIfLoggedIn() {
  const supabase = await getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) {
    // Load role + organization from database profile
    try {
      const { data: userAccount } = await supabase
        .from("user_accounts")
        .select("role, organization_id")
        .eq("user_id", session.user.id)
        .single();
      
      if (userAccount) {
        persistUserContext(userAccount);
        routeByRole(userAccount.role);
      } else {
        window.location.href = "index.html";
      }
    } catch (error) {
      // user_accounts table doesn't exist - default to index
      console.log("Could not check user role, defaulting to index");
      window.location.href = "index.html";
    }
  }
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    statusEl.textContent = "Signing in...";
    const formData = new FormData(loginForm);
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        statusEl.textContent = error.message || "Login failed.";
        return;
      }

      statusEl.textContent = "Success! Redirecting...";

      const { data: userAccount } = await supabase
        .from("user_accounts")
        .select("role, organization_id")
        .eq("user_id", data.user.id)
        .single();

      persistUserContext(userAccount);
      routeByRole(userAccount?.role);
    } catch (error) {
      statusEl.textContent =
        error?.message?.includes("Failed to fetch")
          ? "Unable to reach Supabase. Check internet and SUPABASE_URL."
          : error.message || "Login failed.";
    }
  });
}

redirectIfLoggedIn().catch((error) => {
  statusEl.textContent =
    error?.message?.includes("Failed to fetch")
      ? "Unable to reach Supabase. Check internet and firewall/VPN."
      : error.message || "Unable to connect to Supabase.";
});
