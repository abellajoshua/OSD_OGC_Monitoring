const {
  getSupabaseClient,
  getRequestUserContext,
  getScopedOrganizationId,
  applyOrganizationScope,
  normalizeAcademicYear,
  normalizeSemesterLabel,
  getSemesterCandidates,
  logApiFlow,
  getErrorStatus,
} = require("./_supabase");

function getStrictAcademicPeriod(queryParams) {
  const yearInput = String(queryParams?.academic_year || queryParams?.year || "").trim();
  const semesterInput = String(queryParams?.semester || "").trim();

  const academicYear = normalizeAcademicYear(yearInput);
  const semester = normalizeSemesterLabel(semesterInput);
  const semesterCandidates = getSemesterCandidates(semesterInput);

  if (!academicYear || !semester || !semesterCandidates.length) {
    const error = new Error("Missing or invalid academic_year/year and semester.");
    error.status = 400;
    throw error;
  }

  return {
    academicYear,
    semester,
    semesterCandidates,
  };
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const context = await getRequestUserContext(req);
    const supabase = getSupabaseClient();
    const scopedOrganizationId = getScopedOrganizationId(req, context);
    const period = getStrictAcademicPeriod(req.query);

    let query = supabase
      .from("major_offenses")
      .select("*")
      .eq("status", "dismissed")
      .eq("archived", true)
      .eq("academic_year", period.academicYear)
      .in("semester", period.semesterCandidates)
      .order("date_of_complaint", { ascending: false })
      .order("id", { ascending: false });

    query = applyOrganizationScope(query, scopedOrganizationId);
    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    logApiFlow("case_dismissal.GET", {
      organizationId: scopedOrganizationId || null,
      academicYear: period.academicYear,
      semester: period.semester,
      rowCount: (data || []).length,
    });

    return res.status(200).json(data || []);
  } catch (error) {
    return res.status(getErrorStatus(error)).json({ error: error.message });
  }
};