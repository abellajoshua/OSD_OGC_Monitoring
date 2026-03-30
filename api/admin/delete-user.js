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
    const { email } = payload;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const { data: userAccount, error: accountError } = await supabase
      .from("user_accounts")
      .select("user_id, organization_id, role")
      .eq("email", email)
      .single();

    if (accountError) {
      return res.status(404).json({ error: "User account not found." });
    }

    if (userAccount.role === "admin") {
      return res.status(403).json({ error: "The single admin account cannot be deleted." });
    }

    const { error: dbError } = await supabase.from("user_accounts").delete().eq("email", email);

    if (dbError) {
      return res.status(500).json({ error: `Failed to delete from database: ${dbError.message}` });
    }

    if (userAccount.user_id) {
      const { error: authError } = await supabase.auth.admin.deleteUser(userAccount.user_id);
      if (authError) {
        return res.status(200).json({
          success: true,
          warning: `User removed from database but Auth deletion failed: ${authError.message}`,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `User ${email} deleted successfully from both database and authentication`,
    });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({ error: error.message });
  }
};
