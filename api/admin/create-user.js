const {
  getSupabaseClient,
  hasServiceRolePrivileges,
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
    if (!hasServiceRolePrivileges()) {
      return res.status(503).json({
        error:
          "Server admin key is not configured for account provisioning. Please set a valid SUPABASE_SERVICE_ROLE_KEY.",
      });
    }

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

    const normalizedRole = String(role || "").trim().toLowerCase();

    if (!["head", "coordinator"].includes(normalizedRole)) {
      return res.status(400).json({ error: "Invalid role. Use head or coordinator." });
    }

    let organizationId = Number(organizationIdRaw);
    if (!organizationId && normalizedRole === "coordinator") {
      return res.status(403).json({
        error: "organization_id is required for head and coordinator accounts.",
      });
    }

    const { data: organizations, error: organizationsError } = await supabase
      .from("organizations")
      .select("id, name");

    if (organizationsError) {
      return res.status(500).json({ error: `Unable to validate organizations: ${organizationsError.message}` });
    }

    const alangilanOrganization = (organizations || []).find(
      (org) => String(org.name || "").trim().toLowerCase() === "alangilan"
    );

    if (normalizedRole === "head") {
      if (!alangilanOrganization?.id) {
        return res.status(400).json({
          error: "Head account requires an existing Alangilan organization.",
        });
      }

      const { data: existingHead, error: existingHeadError } = await supabase
        .from("user_accounts")
        .select("id, email")
        .eq("role", "head")
        .limit(1)
        .maybeSingle();

      if (existingHeadError) {
        return res.status(500).json({
          error: `Unable to verify existing Head account: ${existingHeadError.message}`,
        });
      }

      if (existingHead) {
        return res.status(409).json({
          error: "A Head account already exists. Only one Head account is allowed.",
        });
      }

      organizationId = Number(alangilanOrganization.id);
    }

    if (normalizedRole === "coordinator") {
      const assignedOrganization = (organizations || []).find((org) => Number(org.id) === organizationId);
      if (!assignedOrganization) {
        return res.status(400).json({ error: "Invalid organization_id." });
      }
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
        role: normalizedRole,
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
      role: normalizedRole,
      organization_id: organizationId,
    });

    if (dbError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      if (dbError.message && dbError.message.toLowerCase().includes("single_head")) {
        return res.status(409).json({
          error: "A Head account already exists. Only one Head account is allowed.",
        });
      }
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
        role: normalizedRole,
        organization_id: organizationId,
      },
    });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({ error: error.message });
  }
};
