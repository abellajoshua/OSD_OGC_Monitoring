const {
  getSupabaseClient,
  getPayload,
  getRequestUserContext,
  getScopedOrganizationId,
  applyOrganizationScope,
  applyAcademicPeriodScope,
  applyActiveRecordsScope,
  logApiFlow,
  getAcademicPeriodFromPayload,
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
      query = applyAcademicPeriodScope(query, req.query);
      query = applyActiveRecordsScope(query);
      const { data, error } = await query;

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      logApiFlow("minor_offenses.GET", {
        organizationId: scopedOrganizationId || null,
        academicYear: String(req?.query?.academic_year || "").trim() || null,
        semester: String(req?.query?.semester || "").trim() || null,
        rowCount: (data || []).length,
      });

      return res.status(200).json(data || []);
    }

    if (req.method === "POST") {
      ensureRole(context, ["coordinator"]);
      const payload = getPayload(req);
      const normalizedPayload = {
        ...payload,
        complainant: payload.complainant || payload.reported_by,
        date_of_suspension: payload.date_of_suspension || payload.date_of_sanction,
      };

      const missing = REQUIRED_FIELDS.filter((field) => !normalizedPayload[field]);
      if (missing.length) {
        return res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` });
      }

      const { organization_id, reported_by, date_of_sanction, ...safePayload } = normalizedPayload;
      const academicPeriod = getAcademicPeriodFromPayload(safePayload);
      if (!academicPeriod) {
        return res.status(400).json({ error: "Missing or invalid academic_year/semester." });
      }

      logApiFlow("minor_offenses.POST.payload", {
        organizationId: context.organizationId,
        payload: safePayload,
      });

      const { data, error } = await supabase
        .from("minor_offenses")
        .insert({
          ...safePayload,
          academic_year: academicPeriod.academicYear,
          semester: academicPeriod.semester,
          organization_id: context.organizationId,
          archived: false,
        })
        .select("*")
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      logApiFlow("minor_offenses.POST.inserted", {
        id: data?.id || null,
        organizationId: data?.organization_id || context.organizationId,
      });

      return res.status(201).json({ id: data.id, record: data });
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({ error: error.message });
  }
};
