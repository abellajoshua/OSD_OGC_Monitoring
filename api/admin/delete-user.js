const { getSupabaseClient, getPayload } = require("../_supabase");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const supabase = getSupabaseClient();
  const payload = getPayload(req);
  const { email } = payload;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    // First, get the user ID from the database
    const { data: userAccount, error: accountError } = await supabase
      .from("user_accounts")
      .select("user_id")
      .eq("email", email)
      .single();

    if (accountError && accountError.code !== "PGRST116") {
      // PGRST116 is "not found" error
      console.error("Error fetching user account:", accountError);
      return res.status(500).json({ error: `Database error: ${accountError.message}` });
    }

    // Delete from user_accounts table
    const { error: dbError } = await supabase
      .from("user_accounts")
      .delete()
      .eq("email", email);

    if (dbError) {
      console.error("Error deleting from database:", dbError);
      return res.status(500).json({ error: `Failed to delete from database: ${dbError.message}` });
    }

    // Delete from Supabase Auth if we found the user_id
    if (userAccount && userAccount.user_id) {
      const { error: authError } = await supabase.auth.admin.deleteUser(
        userAccount.user_id
      );

      if (authError) {
        console.error("Error deleting from Auth:", authError);
        // Don't fail completely - user was removed from database at least
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
    console.error("Unexpected error:", error);
    return res.status(500).json({ error: error.message });
  }
};
