const {
  getSupabaseClient,
  getPayload,
  getRequestUserContext,
  ensureRole,
  getErrorStatus,
} = require("../_supabase");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const requester = await getRequestUserContext(req);
    ensureRole(requester, ["admin"]);

    const supabase = getSupabaseClient();
    const payload = getPayload(req);
    const { email, password, fullName, role, organization_id: organizationIdRaw } = payload;

    if (!email || !password || !fullName || !role) {
      return res.status(400).json({
        error: "Missing required fields: email, password, fullName, and role are required",
      });
    }

    if (!["head", "coordinator"].includes(role)) {
      return res.status(400).json({ error: "Invalid role. Use head or coordinator." });
    }

    const organizationId = Number(organizationIdRaw);
    if (!organizationId) {
      return res.status(403).json({
        error: "organization_id is required for head and coordinator accounts.",
      });
    }

    const { data: existingUser } = await supabase
      .from("user_accounts")
      .select("email")
      .eq("email", email)
      .single();

    if (existingUser) {
      return res.status(400).json({
        error: `User with email ${email} already exists in the database.`,
      });
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role,
        organization_id: organizationId,
      },
    });

    if (authError || !authData?.user) {
      return res.status(500).json({
        error: `Authentication error: ${authError?.message || "No user created"}`,
      });
    }

    const { error: dbError } = await supabase.from("user_accounts").insert({
      user_id: authData.user.id,
      email,
      full_name: fullName,
      role,
      organization_id: organizationId,
    });

    if (dbError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({
        error: `Database error: ${dbError.message}. Auth user was removed.`,
      });
    }

    return res.status(201).json({
      success: true,
      message: `User ${email} created successfully`,
      user: {
        email,
        full_name: fullName,
        role,
        organization_id: organizationId,
      },
    });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({ error: error.message });
  }
};
