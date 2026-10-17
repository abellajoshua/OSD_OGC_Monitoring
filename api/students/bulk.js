const {
  getSupabaseClient,
  getPayload,
  getRequestUserContext,
  ensureRole,
  getErrorStatus,
  logApiFlow,
  normalizeSemesterLabel,
  normalizeAcademicYear,
} = require("../_supabase");

const UPSERT_CONFLICT = "organization_id,academic_year,semester,sr_code";
const REQUIRED_FIELDS = ["sr_code", "name", "program", "year_level"];

function normalizeRow(raw, organizationId, index) {
  const academicYear = normalizeAcademicYear(raw?.academic_year);
  const semester = normalizeSemesterLabel(raw?.semester);

  const errors = [];
  REQUIRED_FIELDS.forEach((field) => {
    if (!String(raw?.[field] || "").trim()) errors.push(`missing ${field}`);
  });
  if (!academicYear) errors.push("invalid academic_year");
  if (!semester) errors.push("invalid semester");

  if (errors.length) {
    return { row: null, error: `Row ${index}: ${errors.join(", ")}` };
  }

  return {
    row: {
      sr_code: String(raw.sr_code).trim(),
      name: String(raw.name).trim(),
      program: String(raw.program).trim(),
      year_level: String(raw.year_level).trim(),
      academic_year: academicYear,
      semester,
      organization_id: organizationId,
    },
    error: null,
  };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const context = await getRequestUserContext(req);
    ensureRole(context, ["admin"]);

    const supabase = getSupabaseClient();
    const payload = getPayload(req);

    const organizationId = Number(payload?.organization_id);
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

    const rows = Array.isArray(payload?.rows) ? payload.rows : [];
    if (!rows.length) {
      return res.status(400).json({ error: "rows array is required." });
    }

    if (rows.length > 2000) {
      return res.status(400).json({ error: "Too many rows. Maximum is 2000 per upload." });
    }

    const normalized = rows.map((raw, index) => normalizeRow(raw, organizationId, index + 1));
    const errors = normalized.filter((item) => item.error).map((item) => item.error);
    const validRows = normalized.filter((item) => item.row).map((item) => item.row);

    if (!validRows.length) {
      return res.status(400).json({
        error: "No valid rows to import.",
        errors,
      });
    }

    const { data, error } = await supabase
      .from("students")
      .upsert(
        validRows.map((row) => ({ ...row, created_by: context.userId })),
        { onConflict: UPSERT_CONFLICT }
      )
      .select("id, sr_code");

    if (error) return res.status(500).json({ error: error.message });

    logApiFlow("students.bulk.POST", {
      organizationId,
      received: rows.length,
      valid: validRows.length,
      rejected: errors.length,
    });

    return res.status(200).json({
      success: true,
      organization_id: organizationId,
      received: rows.length,
      valid: validRows.length,
      rejected: errors.length,
      upserted: (data || []).length,
      errors,
    });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({ error: error.message });
  }
};
