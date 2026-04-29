const { getRequestUserContext, ensureRole, getErrorStatus } = require("./_supabase");

const REQUIRED_ENV_KEYS = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const context = await getRequestUserContext(req);
    ensureRole(context, ["admin"]);

    const missing = REQUIRED_ENV_KEYS.filter((key) => !String(process.env[key] || "").trim());

    return res.status(200).json({
      ok: missing.length === 0,
      required: REQUIRED_ENV_KEYS,
      missing,
    });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({ error: error.message });
  }
};
