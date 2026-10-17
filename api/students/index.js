const {
  getSupabaseClient,
  getPayload,
  getRequestUserContext,
  getScopedOrganizationId,
  applyOrganizationScope,
  ensureRole,
  getErrorStatus,
  getAcademicPeriodFromPayload,
  logApiFlow,
  normalizeSemesterLabel,
  normalizeAcademicYear,
} = require("../_supabase");

const REQUIRED_FIELDS = ["sr_code", "name", "program", "year_level"];
const UPSERT_CONFLICT = "organization_id,academic_year,semester,sr_code";

function normalizeStudentRow(row, organizationId) {
  const academicYear = normalizeAcademicYear(row?.academic_year);
  const semester = normalizeSemesterLabel(row?.semester);

  const errors = [];
  const required = REQUIRED_FIELDS.filter((field) => !String(row?.[field] || "").trim());
  if (required.length) errors.push(`missing ${required.join(", ")}`);
  if (!academicYear) errors.push("invalid academic_year");
  if (!semester) errors.push("invalid semester");

  return {
    row: errors.length
      ? null
      : {
          sr_code: String(row.sr_code).trim(),
          name: String(row.name).trim(),
          program: String(row.program).trim(),
          year_level: String(row.year_level).trim(),
          academic_year: academicYear,
          semester,
          organization_id: organizationId,
        },
    errors,
  };
}

module.exports = async (req, res) => {
  try {
    const context = await getRequestUserContext(req);
    const supabase = getSupabaseClient();
    const scopedOrganizationId = getScopedOrganizationId(req, context);

    if (req.method === "GET") {
      let query = supabase
        .from("students")
        .select("*")
        .order("academic_year", { ascending: false })
        .order("semester", { ascending: true })
        .order("name", { ascending: true });
      query = applyOrganizationScope(query, scopedOrganizationId);

      const academicYear = normalizeAcademicYear(req?.query?.academic_year);
      const semester = normalizeSemesterLabel(req?.query?.semester);
      const program = String(req?.query?.program || "").trim();
      const search = String(req?.query?.q || "").trim();

      if (academicYear) query = query.eq("academic_year", academicYear);
      if (semester) query = query.eq("semester", semester);
      if (program) query = query.ilike("program", `%${program}%`);
      if (search) {
        query = query.or(`name.ilike.%${search}%,sr_code.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) return res.status(500).json({ error: error.message });

      logApiFlow("students.GET", {
        organizationId: scopedOrganizationId || null,
        rowCount: (data || []).length,
      });

      return res.status(200).json(data || []);
    }

    if (req.method === "POST") {
      ensureRole(context, ["admin"]);
      const payload = getPayload(req);
      const { organization_id, ...safePayload } = payload;

      const organizationId = Number(organization_id);
      if (!Number.isInteger(organizationId) || organizationId <= 0) {
        return res.status(400).json({ error: "organization_id is required." });
      }

      const { data: organization, error: organizationError } = await supabase
        .from("organizations")
        .select("id")
        .eq("id", organizationId)
        .single();
      if (organizationError || !organization) {
        return res.status(400).json({ error: "Invalid organization_id." });
      }

      const academicPeriod = getAcademicPeriodFromPayload(safePayload);
      if (!academicPeriod) {
        return res.status(400).json({ error: "Missing or invalid academic_year/semester." });
      }

      const { row, errors } = normalizeStudentRow(
        { ...safePayload, academic_year: academicPeriod.academicYear, semester: academicPeriod.semester },
        organizationId
      );
      if (!row) {
        return res.status(400).json({ error: `Invalid student record: ${errors.join("; ")}` });
      }

      const { data, error } = await supabase
        .from("students")
        .upsert({ ...row, created_by: context.userId }, { onConflict: UPSERT_CONFLICT })
        .select("*")
        .single();
      if (error) return res.status(500).json({ error: error.message });

      logApiFlow("students.POST", {
        id: data?.id || null,
        organizationId,
        srCode: data?.sr_code || null,
      });

      return res.status(201).json({ id: data.id, record: data });
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({ error: error.message });
  }
};
