const {
  getSupabaseClient,
  buildCsv,
  getRequestUserContext,
  getScopedOrganizationId,
  applyOrganizationScope,
  getErrorStatus,
} = require("../_supabase");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const context = await getRequestUserContext(req);
    const scopedOrganizationId = getScopedOrganizationId(req, context);
    const supabase = getSupabaseClient();
    let query = supabase
      .from("major_offenses")
      .select("*")
      .order("date_of_complaint", { ascending: false })
      .order("id", { ascending: false });
    query = applyOrganizationScope(query, scopedOrganizationId);
    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const headers = [
      "date_of_complaint",
      "name_of_student",
      "sr_code",
      "year_program",
      "contact_number",
      "complainant",
      "sex",
      "offense",
      "sanction",
      "date_of_suspension",
    ];
    const csv = buildCsv(headers, data || []);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=major-offenses.csv");
    res.status(200).send(csv);
  } catch (error) {
    return res.status(getErrorStatus(error)).json({ error: error.message });
  }
};
