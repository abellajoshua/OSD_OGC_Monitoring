const {
  getSupabaseClient,
  getPayload,
  getRequestUserContext,
  ensureRole,
  getErrorStatus,
} = require("../_supabase");

const REQUIRED_FIELDS = ["date", "time_in", "time_out", "name", "sr_code", "course", "sex", "reason"];

module.exports = async (req, res) => {
  try {
    const context = await getRequestUserContext(req);
    const supabase = getSupabaseClient();

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("id_replacement")
        .select("*")
        .eq("organization_id", context.organizationId)
        .order("date", { ascending: false })
        .order("id", { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data || []);
    }

    if (req.method === "POST") {
      ensureRole(context, ["coordinator"]);
      const payload = getPayload(req);
      const missing = REQUIRED_FIELDS.filter((field) => !payload[field]);
      if (missing.length) return res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` });

      const { organization_id, ...safePayload } = payload;
      const { data, error } = await supabase
        .from("id_replacement")
        .insert({ ...safePayload, organization_id: context.organizationId })
        .select("id")
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json({ id: data.id });
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({ error: error.message });
  }
};
