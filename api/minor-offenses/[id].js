const { getSupabaseClient, getPayload } = require("../_supabase");

const REQUIRED_FIELDS = [
  "date_of_complaint",
  "name_of_student",
  "sr_code",
  "year_program",
  "contact_number",
  "reported_by",
  "sex",
  "offense",
  "sanction",
  "date_of_sanction",
];

module.exports = async (req, res) => {
  const supabase = getSupabaseClient();
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Missing id." });
  }

  if (req.method === "PUT") {
    const payload = getPayload(req);
    const missing = REQUIRED_FIELDS.filter((field) => !payload[field]);
    if (missing.length) {
      return res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` });
    }

    const { data, error } = await supabase
      .from("minor_offenses")
      .update(payload)
      .eq("id", id)
      .select("id");

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Record not found." });
    }

    return res.status(200).json({ updated: data.length });
  }

  if (req.method === "DELETE") {
    const { data, error } = await supabase
      .from("minor_offenses")
      .delete()
      .eq("id", id)
      .select("id");

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Record not found." });
    }

    return res.status(200).json({ deleted: data.length });
  }

  return res.status(405).json({ error: "Method not allowed." });
};
