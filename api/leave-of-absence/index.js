const { getSupabaseClient, getPayload } = require("../_supabase");

const REQUIRED_FIELDS = [
  "date",
  "time_in",
  "time_out",
  "name",
  "sr_code",
  "course",
  "sex",
  "semester_period_covered",
];

module.exports = async (req, res) => {
  const supabase = getSupabaseClient();

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("leave_of_absence")
      .select("*")
      .order("date", { ascending: false })
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
      .from("leave_of_absence")
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
