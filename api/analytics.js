const {
  getSupabaseClient,
  getRequestUserContext,
  getScopedOrganizationId,
  applyOrganizationScope,
  getErrorStatus,
} = require("./_supabase");

const MODULES = [
  { key: "minor", label: "Minor Offense", table: "minor_offenses", dateColumn: "date_of_complaint", color: "#ca8a04" },
  { key: "major", label: "Major Offense", table: "major_offenses", dateColumn: "date_of_complaint", color: "#ec4899" },
  { key: "uniform", label: "Non-Wearing Uniform", table: "non_wearing_uniform", dateColumn: "date", color: "#0891b2" },
  { key: "gatepass", label: "Gatepass", table: "gatepass", dateColumn: "date", color: "#0f766e" },
  { key: "goodmoral", label: "Good Moral", table: "good_moral", dateColumn: "date", color: "#1d4ed8" },
  { key: "idreplacement", label: "ID Replacement", table: "id_replacement", dateColumn: "date", color: "#64748b" },
  { key: "leaveofabsence", label: "Leave of Absence", table: "leave_of_absence", dateColumn: "date", color: "#059669" },
];

function normalizeDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function clampPercent(value) {
  const numeric = Number(value) || 0;
  if (numeric > 100) return 100;
  if (numeric < -100) return -100;
  return numeric;
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

function toISODate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeSemesterLabel(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";

  if (raw === "first" || raw === "1st" || raw.includes("first")) {
    return "First Semester";
  }
  if (raw === "second" || raw === "2nd" || raw.includes("second")) {
    return "Second Semester";
  }
  if (raw === "summer" || raw.includes("summer")) {
    return "Summer Class";
  }

  return "";
}

function getAcademicPeriodRange(query) {
  const year = String(query?.academic_year || "").trim();
  const semester = normalizeSemesterLabel(query?.semester);
  const match = year.match(/^(\d{4})-(\d{4})$/);
  if (!match || !semester) return null;

  const startYear = Number(match[1]);
  const endYear = Number(match[2]);
  if (!Number.isInteger(startYear) || !Number.isInteger(endYear) || endYear !== startYear + 1) {
    return null;
  }

  let startDate;
  let endDate;

  if (semester === "First Semester") {
    startDate = new Date(startYear, 7, 1);
    endDate = new Date(startYear, 11, 31);
  } else if (semester === "Second Semester") {
    startDate = new Date(endYear, 0, 1);
    endDate = new Date(endYear, 4, 31);
  } else if (semester === "Summer Class") {
    startDate = new Date(endYear, 5, 1);
    endDate = new Date(endYear, 7, 0);
  } else {
    return null;
  }

  return {
    year,
    semester,
    startDate: toISODate(startDate),
    endDate: toISODate(endDate),
  };
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

async function fetchModuleRows(supabase, module, organizationId, academicPeriod) {
  const selectColumns = [
    "id",
    module.dateColumn,
    "created_at",
    module.key === "minor" || module.key === "major" ? "offense" : "time_out",
    module.key === "minor" || module.key === "major" ? "sanction" : "sr_code",
    module.key === "minor" || module.key === "major" ? "date_of_suspension" : "",
    "sr_code",
  ].filter(Boolean).join(",");

  const attempts = [
    { useArchived: true, useAcademicColumns: true, useDateRange: false },
    { useArchived: false, useAcademicColumns: true, useDateRange: false },
    { useArchived: true, useAcademicColumns: false, useDateRange: true },
    { useArchived: false, useAcademicColumns: false, useDateRange: true },
  ];

  let lastError = null;

  for (const attempt of attempts) {
    let query = supabase.from(module.table).select(selectColumns);
    query = applyOrganizationScope(query, organizationId);

    if (attempt.useArchived) {
      query = query.eq("archived", false);
    }

    if (academicPeriod) {
      if (attempt.useAcademicColumns) {
        query = query.eq("academic_year", academicPeriod.year).eq("semester", academicPeriod.semester);
      } else if (attempt.useDateRange) {
        query = query.gte(module.dateColumn, academicPeriod.startDate).lte(module.dateColumn, academicPeriod.endDate);
      }
    }

    const { data, error } = await query;

    if (!error) {
      return data || [];
    }

    lastError = error;
    const message = String(error.message || "").toLowerCase();

    if (attempt.useArchived && !message.includes("archived")) {
      continue;
    }

    if (attempt.useAcademicColumns && !(message.includes("academic_year") || message.includes("semester"))) {
      continue;
    }
  }

  if (lastError) throw lastError;
  return [];
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
    const academicPeriod = getAcademicPeriodRange(req.query);

    const moduleRows = await Promise.all(
      MODULES.map(async (module) => {
        const rows = await fetchModuleRows(supabase, module, scopedOrganizationId, academicPeriod);
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
    const changePercent = clampPercent(previousCount
      ? Math.round(((recentCount - previousCount) / previousCount) * 100)
      : recentCount
        ? 100
        : 0);

    return res.status(200).json({
      generatedAt: new Date().toISOString(),
      scope: {
        organizationId: scopedOrganizationId || null,
        academicYear: academicPeriod?.year || null,
        semester: academicPeriod?.semester || null,
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