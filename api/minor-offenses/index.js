const {
  getSupabaseClient,
  getPayload,
  getRequestUserContext,
  getScopedOrganizationId,
  applyOrganizationScope,
  ensureRole,
  getErrorStatus,
} = require("../_supabase");

const REQUIRED_FIELDS = [
  "date_of_complaint",
  "name_of_student",
  "sr_code",
  "year_program",
  "sex",
  "contact_number",
  "complainant",
  "offense",
  "sanction",
  "date_of_suspension",
];

module.exports = async (req, res) => {
  try {
    const context = await getRequestUserContext(req);
    const supabase = getSupabaseClient();
    const scopedOrganizationId = getScopedOrganizationId(req, context);

    if (req.method === "GET") {
      let query = supabase
        .from("minor_offenses")
        .select("*")
        .order("date_of_complaint", { ascending: false })
        .order("id", { ascending: false });
      query = applyOrganizationScope(query, scopedOrganizationId);
      const { data, error } = await query;

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json(data || []);
    }

    if (req.method === "POST") {
      ensureRole(context, ["coordinator"]);
      const payload = getPayload(req);
      const missing = REQUIRED_FIELDS.filter((field) => !payload[field]);
      if (missing.length) {
        return res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` });
      }

      const { organization_id, ...safePayload } = payload;
      const { data, error } = await supabase
        .from("minor_offenses")
        .insert({ ...safePayload, organization_id: context.organizationId })
        .select("id")
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(201).json({ id: data.id });
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({ error: error.message });
  }
};
