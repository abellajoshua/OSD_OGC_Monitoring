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

const EDITABLE_FIELDS = ["sr_code", "name", "program", "year_level"];

module.exports = async (req, res) => {
  try {
    const context = await getRequestUserContext(req);
    ensureRole(context, ["admin"]);

    const supabase = getSupabaseClient();
    const id = Number(req?.query?.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid student id." });
    }

    const { data: existing, error: existingError } = await supabase
      .from("students")
      .select("id")
      .eq("id", id)
      .single();
    if (existingError || !existing) {
      return res.status(404).json({ error: "Student record not found." });
    }

    if (req.method === "PATCH") {
      const payload = getPayload(req);
      const updates = {};

      EDITABLE_FIELDS.forEach((field) => {
        if (typeof payload?.[field] !== "undefined") {
          updates[field] = String(payload[field] || "").trim();
        }
      });

      if (typeof payload?.academic_year !== "undefined") {
        const academicYear = normalizeAcademicYear(payload.academic_year);
        if (!academicYear) {
          return res.status(400).json({ error: "Invalid academic_year." });
        }
        updates.academic_year = academicYear;
      }

      if (typeof payload?.semester !== "undefined") {
        const semester = normalizeSemesterLabel(payload.semester);
        if (!semester) {
          return res.status(400).json({ error: "Invalid semester." });
        }
        updates.semester = semester;
      }

      const required = EDITABLE_FIELDS.filter((field) => !updates[field]);
      if (required.length) {
        return res.status(400).json({ error: `Fields cannot be empty: ${required.join(", ")}` });
      }

      const { data, error } = await supabase
        .from("students")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        const isUniqueViolation = String(error?.message || "").toLowerCase().includes("duplicate");
        return res.status(isUniqueViolation ? 409 : 500).json({
          error: isUniqueViolation
            ? "A student with this Sr-Code already exists for the selected campus, academic year, and semester."
            : error.message,
        });
      }

      logApiFlow("students.PATCH", { id, updates });

      return res.status(200).json({ id: data.id, record: data });
    }

    if (req.method === "DELETE") {
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) return res.status(500).json({ error: error.message });

      logApiFlow("students.DELETE", { id });

      return res.status(200).json({ success: true, id });
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({ error: error.message });
  }
};
