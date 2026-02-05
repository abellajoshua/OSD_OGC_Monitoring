const { getSupabaseClient, getPayload } = require("../_supabase");

const REQUIRED_FIELDS = [
  "date",
  "time_in",
  "time_out",
  "name",
  "sr_code",
  "course",
  "sex",
  "purpose",
];

module.exports = async (req, res) => {
  const supabase = getSupabaseClient();

  if (req.method === "GET") {
    const { data: goodMoral, error: goodError } = await supabase
      .from("good_moral")
      .select("*")
      .order("date", { ascending: false })
      .order("id", { ascending: false });

    if (goodError) {
      return res.status(500).json({ error: goodError.message });
    }

    const { data: minorData, error: minorError } = await supabase
      .from("minor_offenses")
      .select("sr_code");

    if (minorError) {
      return res.status(500).json({ error: minorError.message });
    }

    const codeSet = new Set(
      (minorData || []).map((item) => String(item.sr_code || "").trim())
    );

    const enriched = (goodMoral || []).map((record) => ({
      ...record,
      has_minor_offense: codeSet.has(String(record.sr_code || "").trim()) ? 1 : 0,
    }));

    return res.status(200).json(enriched);
  }

  if (req.method === "POST") {
    const payload = getPayload(req);
    const missing = REQUIRED_FIELDS.filter((field) => !payload[field]);
    if (missing.length) {
      return res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` });
    }

    const { data, error } = await supabase
      .from("good_moral")
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
