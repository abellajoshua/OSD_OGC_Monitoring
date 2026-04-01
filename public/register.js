import { getSupabase } from "./supabaseClient.js?v=4";

const registerForm = document.querySelector("#register-form");
const statusEl = document.querySelector("#register-status");

async function redirectIfLoggedIn() {
  const supabase = await getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) {
    window.location.href = "index.html";
  }
}

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    statusEl.textContent = "Creating account...";
    const formData = new FormData(registerForm);
    const name = formData.get("name");
    const email = formData.get("email");
    const role = formData.get("role");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirm_password");

    if (password !== confirmPassword) {
      statusEl.textContent = "Passwords do not match.";
      return;
    }

    try {
      const supabase = await getSupabase();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role,
          },
        },
      });

      if (error) {
        statusEl.textContent = error.message || "Registration failed.";
        return;
      }

      statusEl.textContent =
        "Account created. Check your email to confirm, then login.";
    } catch (error) {
      statusEl.textContent =
        error?.message?.includes("Failed to fetch")
          ? "Unable to reach Supabase. Check internet and SUPABASE_URL."
          : error.message || "Registration failed.";
    }
  });
}

redirectIfLoggedIn().catch((error) => {
  statusEl.textContent =
    error?.message?.includes("Failed to fetch")
      ? "Unable to reach Supabase. Check internet and firewall/VPN."
      : error.message || "Unable to connect to Supabase.";
});
