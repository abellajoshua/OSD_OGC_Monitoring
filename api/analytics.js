const {
  getSupabaseClient,
  getRequestUserContext,
  getScopedOrganizationId,
  applyOrganizationScope,
  getErrorStatus,
} = require("./_supabase");

const MODULES = [
  { key: "minor", label: "Minor Offense", table: "minor_offenses", dateColumn: "date_of_complaint", color: "#a41321" },
  { key: "major", label: "Major Offense", table: "major_offenses", dateColumn: "date_of_complaint", color: "#7b1f1f" },
  { key: "uniform", label: "Non-Wearing Uniform", table: "non_wearing_uniform", dateColumn: "date", color: "#0f766e" },
  { key: "gatepass", label: "Gatepass", table: "gatepass", dateColumn: "date", color: "#2563eb" },
  { key: "goodmoral", label: "Good Moral", table: "good_moral", dateColumn: "date", color: "#d97706" },
  { key: "idreplacement", label: "ID Replacement", table: "id_replacement", dateColumn: "date", color: "#475569" },
  { key: "leaveofabsence", label: "Leave of Absence", table: "leave_of_absence", dateColumn: "date", color: "#ef4444" },
];

function normalizeDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date) {
  const clone = new Date(date);
  clone.setHours(0, 0, 0, 0);
  return clone;
}

function shiftDays(date, days) {
  const clone = new Date(date);
  clone.setDate(clone.getDate() + days);
  return clone;
}

function isCompleted(moduleKey, record) {
  if (moduleKey === "minor" || moduleKey === "major") {
    return Boolean(String(record.sanction || "").trim() && String(record.date_of_suspension || "").trim());
  }

  return Boolean(String(record.time_out || "").trim());
}

function getRecordDate(moduleKey, record) {
  const value = moduleKey === "minor" || moduleKey === "major" ? record.date_of_complaint : record.date;
  return normalizeDate(value || record.created_at);
}

async function fetchModuleRows(supabase, module, organizationId) {
  let query = supabase
    .from(module.table)
    .select([
      "id",
      module.dateColumn,
      "created_at",
      module.key === "minor" || module.key === "major" ? "offense" : "time_out",
      module.key === "minor" || module.key === "major" ? "sanction" : "sr_code",
      module.key === "minor" || module.key === "major" ? "date_of_suspension" : "",
      "sr_code",
    ].filter(Boolean).join(","));

  query = applyOrganizationScope(query, organizationId).eq("archived", false);
  let { data, error } = await query;

  if (error && String(error.message || "").toLowerCase().includes("archived")) {
    query = supabase.from(module.table).select([
      "id",
      module.dateColumn,
      "created_at",
      module.key === "minor" || module.key === "major" ? "offense" : "time_out",
      module.key === "minor" || module.key === "major" ? "sanction" : "sr_code",
      module.key === "minor" || module.key === "major" ? "date_of_suspension" : "",
      "sr_code",
    ].filter(Boolean).join(","));
    query = applyOrganizationScope(query, organizationId);
    ({ data, error } = await query);
  }

  if (error) throw error;
  return data || [];
}

function countEntriesBetween(entries, startDate, endDate) {
  return entries.filter((entry) => entry.date && entry.date >= startDate && entry.date < endDate).length;
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const context = await getRequestUserContext(req);
    const supabase = getSupabaseClient();
    const scopedOrganizationId = getScopedOrganizationId(req, context);

    const moduleRows = await Promise.all(
      MODULES.map(async (module) => {
        const rows = await fetchModuleRows(supabase, module, scopedOrganizationId);
        const completed = rows.filter((record) => isCompleted(module.key, record)).length;
        return {
          ...module,
          count: rows.length,
          completed,
          pending: Math.max(rows.length - completed, 0),
          rows,
        };
      })
    );

    const totalRecords = moduleRows.reduce((sum, module) => sum + module.count, 0);
    const completedRecords = moduleRows.reduce((sum, module) => sum + module.completed, 0);
    const pendingRecords = Math.max(totalRecords - completedRecords, 0);
    const resolutionRate = totalRecords ? Math.round((completedRecords / totalRecords) * 100) : 0;
    const topModule = [...moduleRows].sort((left, right) => right.count - left.count)[0] || null;

    const offenseCounts = new Map();
    const minorAndMajorCodes = new Set();

    moduleRows
      .filter((module) => module.key === "minor" || module.key === "major")
      .forEach((module) => {
        module.rows.forEach((record) => {
          const offense = String(record.offense || "").trim();
          if (offense) {
            offenseCounts.set(offense, (offenseCounts.get(offense) || 0) + 1);
          }

          const srCode = String(record.sr_code || "").trim().toLowerCase();
          if (srCode) {
            minorAndMajorCodes.add(srCode);
          }
        });
      });

    const topOffenseEntry = [...offenseCounts.entries()].sort((left, right) => right[1] - left[1])[0] || null;
    const topOffense = topOffenseEntry ? { name: topOffenseEntry[0], count: topOffenseEntry[1] } : null;

    const goodMoralFlags = moduleRows.find((module) => module.key === "goodmoral")?.rows.filter((record) => {
      return minorAndMajorCodes.has(String(record.sr_code || "").trim().toLowerCase());
    }).length || 0;

    const entries = moduleRows.flatMap((module) =>
      module.rows
        .map((record) => ({
          moduleKey: module.key,
          date: getRecordDate(module.key, record),
        }))
        .filter((entry) => entry.date)
    );

    const today = startOfDay(new Date());
    const labels = [];
    const values = [];

    for (let dayOffset = 13; dayOffset >= 0; dayOffset -= 1) {
      const startDate = shiftDays(today, -dayOffset);
      const endDate = shiftDays(startDate, 1);
      labels.push(startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
      values.push(countEntriesBetween(entries, startDate, endDate));
    }

    const recentStart = shiftDays(today, -6);
    const previousStart = shiftDays(today, -13);
    const previousEnd = shiftDays(today, -6);
    const recentCount = countEntriesBetween(entries, recentStart, shiftDays(today, 1));
    const previousCount = countEntriesBetween(entries, previousStart, previousEnd);
    const changePercent = previousCount
      ? Math.round(((recentCount - previousCount) / previousCount) * 100)
      : recentCount
        ? 100
        : 0;

    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      scope: {
        organizationId: scopedOrganizationId || null,
      },
      totals: {
        totalRecords,
        completedRecords,
        pendingRecords,
        resolutionRate,
        goodMoralFlags,
      },
      modules: moduleRows.map(({ rows, ...module }) => module),
      status: {
        completed: completedRecords,
        pending: pendingRecords,
      },
      trend: {
        labels,
        values,
        recentCount,
        previousCount,
        changePercent,
      },
      insights: {
        topModule: topModule ? { key: topModule.key, label: topModule.label, count: topModule.count } : null,
        topOffense,
        recentShare: totalRecords ? Math.round((recentCount / totalRecords) * 100) : 0,
      },
    });
  } catch (error) {
    return res.status(getErrorStatus(error)).json({ error: error.message });
  }
};