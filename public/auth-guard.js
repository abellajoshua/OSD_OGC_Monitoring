import { getSupabase } from "./supabaseClient.js?v=4";

const logoutButton = document.querySelector("#logout-btn");

async function requireAuth() {
  const supabase = await getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "login.html";
  }
}

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    const supabase = await getSupabase();
    await supabase.auth.signOut();
    window.location.href = "login.html";
  });
}

requireAuth().catch(() => {
  window.location.href = "login.html";
});
