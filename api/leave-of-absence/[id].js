const { getSupabaseClient, getPayload } = require("../_supabase");

const REQUIRED_FIELDS = [
  "date",
  "time_in",
  "time_out",
  "name",
  "sr_code",
  "course",
  "sex",
  "reason",
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
      .from("leave_of_absence")
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
      .from("leave_of_absence")
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
