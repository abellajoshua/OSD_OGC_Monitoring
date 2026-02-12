module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  return res.status(200).json({
    SUPABASE_URL: process.env.SUPABASE_URL || "",
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
  });
};
