import { getSupabase } from "./supabaseClient.js?v=4";

const logoutButton = document.querySelector("#logout-btn");

async function clearInvalidSession(supabase) {
  await supabase.auth.signOut();
  localStorage.removeItem("organizationId");
  localStorage.removeItem("userRole");
  localStorage.removeItem("headOrganizationFilterId");
  window.location.href = "login.html";
}

async function requireAuth() {
  const supabase = await getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "login.html";
    return;
  }

  const { data: userAccount } = await supabase
    .from("user_accounts")
    .select("role, organization_id")
    .eq("user_id", session.user.id)
    .single();

  if (!userAccount) {
    await clearInvalidSession(supabase);
  }
}

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    const supabase = await getSupabase();
    await supabase.auth.signOut();
    localStorage.removeItem("organizationId");
    localStorage.removeItem("userRole");
    localStorage.removeItem("headOrganizationFilterId");
    window.location.href = "login.html";
  });
}

requireAuth().catch(() => {
  window.location.href = "login.html";
});
