import { getSupabase } from "./supabaseClient.js?v=4";

const ADMIN_EMAIL = "mcdoelfamini10@gmail.com";

const loginForm = document.querySelector("#login-form");
const statusEl = document.querySelector("#login-status");

async function redirectIfLoggedIn() {
  const supabase = await getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) {
    // Check if user is admin
    if (session.user.email === ADMIN_EMAIL) {
      window.location.href = "admin.html";
      return;
    }
    
    // Check user role from database
    try {
      const { data: userAccount } = await supabase
        .from("user_accounts")
        .select("role")
        .eq("email", session.user.email)
        .single();
      
      if (userAccount) {
        if (userAccount.role === "head") {
          window.location.href = "reports.html";
        } else {
          window.location.href = "index.html";
        }
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
      
      // Check if user is admin and redirect accordingly
      if (data?.user?.email === ADMIN_EMAIL) {
        window.location.href = "admin.html";
      } else {
        // Check user role from database
        const { data: userAccount } = await supabase
          .from("user_accounts")
          .select("role")
          .eq("email", data.user.email)
          .single();
        
        if (userAccount && userAccount.role === "head") {
          window.location.href = "reports.html";
        } else {
          window.location.href = "index.html";
        }
      }
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
