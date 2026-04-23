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

const MODULE_TABLE_MAP = {
  minor: "minor_offenses",
  major: "major_offenses",
  uniform: "non_wearing_uniform",
  gatepass: "gatepass",
  goodmoral: "good_moral",
  idreplacement: "id_replacement",
  leaveofabsence: "leave_of_absence",
};

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
    const moduleKey = String(req?.query?.module || "")
      .trim()
      .toLowerCase();
    const tableName = MODULE_TABLE_MAP[moduleKey];

    if (!tableName) {
      return res.status(400).json({ error: "Missing or invalid module." });
    }

    const period = getStrictAcademicPeriod(req.query);

    let query = supabase
      .from(tableName)
      .select("*")
      .eq("archived", true)
      .eq("academic_year", period.academicYear)
      .in("semester", period.semesterCandidates)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    query = applyOrganizationScope(query, scopedOrganizationId);

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    logApiFlow("archive.GET", {
      module: moduleKey,
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