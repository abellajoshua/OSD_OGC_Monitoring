import { supabase } from "./supabaseClient.js";

const logoutButton = document.querySelector("#logout-btn");

async function requireAuth() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "login.html";
  }
}

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "login.html";
  });
}

requireAuth();
