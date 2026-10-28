const {
  getSupabaseClient,
  getRequestUserContext,
  getScopedOrganizationId,
  applyOrganizationScope,
  ensureRole,
  getErrorStatus,
  logApiFlow,
  normalizeSemesterLabel,
  normalizeAcademicYear,
} = require("../_supabase");

const LOOKUP_FIELDS = "sr_code, name, program, year_level, academic_year, semester, created_at";

// Resolves an SR Code to the admin-stored student record within the caller's campus.
// Used by coordinator record forms to auto-fill the student name.
module.exports = async (req, res) => {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed." });
    }

    const context = await getRequestUserContext(req);
    ensureRole(context, ["coordinator", "head", "admin"]);

    const srCode = String(req?.query?.sr_code || "").trim();
    if (!srCode) {
      return res.status(400).json({ error: "sr_code is required." });
    }

    const supabase = getSupabaseClient();
    const scopedOrganizationId = getScopedOrganizationId(req, context);

    let query = supabase
      .from("students")
      .select(LOOKUP_FIELDS)
      .eq("sr_code", srCode)
      .order("academic_year", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20);
    query = applyOrganizationScope(query, scopedOrganizationId);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    const rows = data || [];
    const academicYear = normalizeAcademicYear(req?.query?.academic_year);
    const semester = normalizeSemesterLabel(req?.query?.semester);

    // Prefer the record for the selected academic period, else the most recent one.
    const match =
      (academicYear && semester
        ? rows.find((row) => row.academic_year === academicYear && row.semester === semester)
        : null) || rows[0];

    logApiFlow("students.lookup", {
      organizationId: scopedOrganizationId || null,
      srCode,
      found: Boolean(match),
    });

    if (!match) {
      return res.status(200).json({ found: false });
    }

    const { created_at, ...student } = match;
    return res.status(200).json({ found: true, student });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({ error: error.message });
  }
};
