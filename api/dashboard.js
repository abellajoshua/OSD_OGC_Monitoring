const {
  getSupabaseClient,
  getRequestUserContext,
  getScopedOrganizationId,
  applyOrganizationScope,
  getErrorStatus,
} = require("./_supabase");

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

async function countTable(supabase, table, organizationId) {
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  query = applyOrganizationScope(query, organizationId);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function countWithFilter(supabase, table, filter, organizationId) {
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  query = applyOrganizationScope(query, organizationId);
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
    const context = await getRequestUserContext(req);
    const supabase = getSupabaseClient();
    const scopedOrganizationId = getScopedOrganizationId(req, context);
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
      countTable(supabase, "minor_offenses", scopedOrganizationId),
      countTable(supabase, "non_wearing_uniform", scopedOrganizationId),
      countTable(supabase, "gatepass", scopedOrganizationId),
      countTable(supabase, "good_moral", scopedOrganizationId),
      countWithFilter(supabase, "minor_offenses", {
        or: "sanction.is.null,sanction.eq.,date_of_sanction.is.null,date_of_sanction.eq.",
      }, scopedOrganizationId),
      countWithFilter(supabase, "minor_offenses", {
        gte: { column: "date_of_sanction", value: toISODate(weekStart) },
        lte: { column: "date_of_sanction", value: toISODate(today) },
      }, scopedOrganizationId),
      countWithFilter(supabase, "non_wearing_uniform", {
        or: "time_out.is.null,time_out.eq.",
      }, scopedOrganizationId),
      countWithFilter(supabase, "gatepass", {
        or: "time_out.is.null,time_out.eq.",
      }, scopedOrganizationId),
      countWithFilter(supabase, "good_moral", {
        or: "time_out.is.null,time_out.eq.",
      }, scopedOrganizationId),
    ]);

    return res.status(200).json({
      activeCases: minorCount + uniformCount + gatepassCount + goodMoralCount,
      pendingSanctions,
      resolvedThisWeek,
      followUpsDue: followUpsUniform + followUpsGatepass + followUpsGoodMoral,
    });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({ error: error.message });
  }
};
