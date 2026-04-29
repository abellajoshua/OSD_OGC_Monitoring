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

const REQUIRED_FIELDS = ["date", "time_in", "time_out", "name", "sr_code", "course", "sex", "reason"];

module.exports = async (req, res) => {
  try {
    const context = await getRequestUserContext(req);
    const supabase = getSupabaseClient();
    const scopedOrganizationId = getScopedOrganizationId(req, context);

    if (req.method === "GET") {
      let query = supabase
        .from("non_wearing_uniform")
        .select("*")
        .order("date", { ascending: false })
        .order("id", { ascending: false });
      query = applyOrganizationScope(query, scopedOrganizationId);
      query = applyAcademicPeriodScope(query, req.query);
      query = applyActiveRecordsScope(query);
      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });

      logApiFlow("non_wearing_uniform.GET", {
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
      const missing = REQUIRED_FIELDS.filter((field) => !payload[field]);
      if (missing.length) return res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` });

      const { organization_id, ...safePayload } = payload;
      const academicPeriod = getAcademicPeriodFromPayload(safePayload);
      if (!academicPeriod) {
        return res.status(400).json({ error: "Missing or invalid academic_year/semester." });
      }

      logApiFlow("non_wearing_uniform.POST.payload", {
        organizationId: context.organizationId,
        payload: safePayload,
      });

      const { data, error } = await supabase
        .from("non_wearing_uniform")
        .insert({
          ...safePayload,
          academic_year: academicPeriod.academicYear,
          semester: academicPeriod.semester,
          organization_id: context.organizationId,
          archived: false,
        })
        .select("*")
        .single();
      if (error) return res.status(500).json({ error: error.message });

      logApiFlow("non_wearing_uniform.POST.inserted", {
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
