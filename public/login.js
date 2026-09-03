import { getSupabase } from "./supabaseClient.js?v=5";

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

async function getRegisteredUserAccount(supabase, userId) {
  const { data, error } = await supabase
    .from("user_accounts")
    .select("role, organization_id")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

async function signOutAndReject(supabase, message) {
  await supabase.auth.signOut();
  localStorage.removeItem("organizationId");
  localStorage.removeItem("userRole");
  localStorage.removeItem("headOrganizationFilterId");
  statusEl.textContent = message;
}

async function redirectIfLoggedIn() {
  const supabase = await getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) {
    try {
      const userAccount = await getRegisteredUserAccount(supabase, session.user.id);

      if (userAccount) {
        persistUserContext(userAccount);
        routeByRole(userAccount.role);
      } else {
        await signOutAndReject(
          supabase,
          "This account is not registered by admin. Please use an approved account."
        );
      }
    } catch (error) {
      await signOutAndReject(
        supabase,
        error?.message || "Unable to verify account registration. Please contact admin."
      );
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

      const userAccount = await getRegisteredUserAccount(supabase, data.user.id);

      if (!userAccount) {
        await signOutAndReject(
          supabase,
          "This account is not registered by admin. Please contact the administrator."
        );
        return;
      }

      persistUserContext(userAccount);
      statusEl.textContent = "Success! Redirecting...";
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
