const { getSupabaseClient, buildCsv } = require("../_supabase");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("good_moral")
    .select("*")
    .order("date", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const headers = [
    "date",
    "time_in",
    "time_out",
    "name",
    "sr_code",
    "course",
    "sex",
    "purpose",
  ];
  const csv = buildCsv(headers, data || []);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=good-moral.csv");
  res.status(200).send(csv);
};
