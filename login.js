import { supabase } from "./supabaseClient.js";

const loginForm = document.querySelector("#login-form");
const statusEl = document.querySelector("#login-status");

async function redirectIfLoggedIn() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) {
    window.location.href = "index.html";
  }
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    statusEl.textContent = "Signing in...";
    const formData = new FormData(loginForm);
    const email = formData.get("email");
    const password = formData.get("password");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      statusEl.textContent = error.message || "Login failed.";
      return;
    }

    statusEl.textContent = "Success! Redirecting...";
    window.location.href = "index.html";
  });
}

redirectIfLoggedIn();
