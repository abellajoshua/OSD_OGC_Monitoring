const { getSupabaseClient, buildCsv } = require("../_supabase");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("major_offenses")
    .select("*")
    .order("date_of_complaint", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const headers = [
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
  const csv = buildCsv(headers, data || []);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=major-offenses.csv");
  res.status(200).send(csv);
};
