const { getSupabaseClient } = require("./_supabase");

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

async function countTable(supabase, table) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count || 0;
}

async function countWithFilter(supabase, table, filter) {
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  if (filter.or) query = query.or(filter.or);
  if (filter.gte) query = query.gte(filter.gte.column, filter.gte.value);
  if (filter.lte) query = query.lte(filter.lte.column, filter.lte.value);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const supabase = getSupabaseClient();
    const today = new Date();
    const weekStart = new Date();
    weekStart.setDate(today.getDate() - 6);

    const [
      minorCount,
      uniformCount,
      gatepassCount,
      goodMoralCount,
      pendingSanctions,
      resolvedThisWeek,
      followUpsUniform,
      followUpsGatepass,
      followUpsGoodMoral,
    ] = await Promise.all([
      countTable(supabase, "minor_offenses"),
      countTable(supabase, "non_wearing_uniform"),
      countTable(supabase, "gatepass"),
      countTable(supabase, "good_moral"),
      countWithFilter(supabase, "minor_offenses", {
        or: "sanction.is.null,sanction.eq.,date_of_sanction.is.null,date_of_sanction.eq.",
      }),
      countWithFilter(supabase, "minor_offenses", {
        gte: { column: "date_of_sanction", value: toISODate(weekStart) },
        lte: { column: "date_of_sanction", value: toISODate(today) },
      }),
      countWithFilter(supabase, "non_wearing_uniform", {
        or: "time_out.is.null,time_out.eq.",
      }),
      countWithFilter(supabase, "gatepass", {
        or: "time_out.is.null,time_out.eq.",
      }),
      countWithFilter(supabase, "good_moral", {
        or: "time_out.is.null,time_out.eq.",
      }),
    ]);

    return res.status(200).json({
      activeCases: minorCount + uniformCount + gatepassCount + goodMoralCount,
      pendingSanctions,
      resolvedThisWeek,
      followUpsDue: followUpsUniform + followUpsGatepass + followUpsGoodMoral,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
