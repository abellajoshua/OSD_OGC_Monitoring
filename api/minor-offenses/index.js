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

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("minor_offenses")
      .select("*")
      .order("date_of_complaint", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data || []);
  }

  if (req.method === "POST") {
    const payload = getPayload(req);
    const missing = REQUIRED_FIELDS.filter((field) => !payload[field]);
    if (missing.length) {
      return res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` });
    }

    const { data, error } = await supabase
      .from("minor_offenses")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ id: data.id });
  }

  return res.status(405).json({ error: "Method not allowed." });
};
