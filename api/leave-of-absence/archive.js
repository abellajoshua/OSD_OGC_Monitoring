const { getSupabaseClient, buildCsv } = require("../_supabase");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("leave_of_absence")
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
    "reason",
  ];
  const csv = buildCsv(headers, data || []);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="leave_of_absence_archive_${new Date().toISOString().slice(0, 10)}.csv"`
  );
  return res.status(200).send(csv);
};
