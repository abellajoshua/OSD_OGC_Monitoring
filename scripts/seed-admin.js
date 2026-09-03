require("dotenv").config();

const { getSupabaseClient, hasServiceRolePrivileges } = require("../api/_supabase");

const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL || "admin@example.com").trim().toLowerCase();
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "Pass@12345";
const ADMIN_FULL_NAME = process.env.SEED_ADMIN_FULL_NAME || "System Admin";

async function findAuthUserByEmail(supabase, email) {
  let page = 1;
  const perPage = 200;

  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Unable to list auth users: ${error.message}`);

    const users = data?.users || [];
    const match = users.find((user) => String(user.email || "").toLowerCase() === email);
    if (match) return match;

    if (users.length < perPage) return null;
    page += 1;
  }
}

async function seedAdmin() {
  if (!hasServiceRolePrivileges()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing or is not a service role key.");
  }

  const supabase = getSupabaseClient();
  const existing = await findAuthUserByEmail(supabase, ADMIN_EMAIL);
  let userId;

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: ADMIN_FULL_NAME, role: "admin" },
    });
    if (error) throw new Error(`Unable to update admin auth user: ${error.message}`);
    userId = data.user.id;
    console.log(`Auth user updated: ${ADMIN_EMAIL}`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: ADMIN_FULL_NAME, role: "admin" },
    });
    if (error) throw new Error(`Unable to create admin auth user: ${error.message}`);
    userId = data.user.id;
    console.log(`Auth user created: ${ADMIN_EMAIL}`);
  }

  // The admin account is management-only, so it stays unassigned to an organization.
  const { error: profileError } = await supabase
    .from("user_accounts")
    .upsert(
      {
        user_id: userId,
        email: ADMIN_EMAIL,
        full_name: ADMIN_FULL_NAME,
        role: "admin",
        organization_id: null,
      },
      { onConflict: "email" }
    );

  if (profileError) {
    throw new Error(`Unable to upsert user_accounts row: ${profileError.message}`);
  }

  console.log("user_accounts profile synced with role 'admin'.");
  console.log("");
  console.log("Admin login credentials:");
  console.log(`  email:    ${ADMIN_EMAIL}`);
  console.log(`  password: ${ADMIN_PASSWORD}`);
}

seedAdmin().catch((error) => {
  console.error(`Seed failed: ${error.message}`);
  process.exit(1);
});
