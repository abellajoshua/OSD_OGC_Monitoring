import { getSupabase } from "./supabaseClient.js?v=5";

const studentsAcademicYearInput = document.querySelector("#students-academic-year");
const studentsSemesterSelect = document.querySelector("#students-semester");
const studentsProgramInput = document.querySelector("#students-program");
const studentsSearchInput = document.querySelector("#students-search");
const studentsRefreshBtn = document.querySelector("#students-refresh-btn");
const studentsExportBtn = document.querySelector("#students-export-btn");
const studentsStatus = document.querySelector("#students-status");
const studentsTableBody = document.querySelector("#students-table-body");
const campusSubtitle = document.querySelector("#campus-subtitle");

let cachedStudents = [];
let currentOrganizationName = "";
let offenseCountMap = new Map();

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = String(text ?? "");
  return div.innerHTML;
}

function normalizeSrCodeKey(value) {
  return String(value || "").trim().toLowerCase();
}

function buildOffenseCountMap(minorRows, majorRows) {
  const map = new Map();
  const bump = (srCode) => {
    const key = normalizeSrCodeKey(srCode);
    if (!key) return;
    map.set(key, (map.get(key) || 0) + 1);
  };

  (minorRows || []).forEach((row) => bump(row.sr_code));
  (majorRows || []).forEach((row) => bump(row.sr_code));
  return map;
}

function renderOffenseCountBadge(srCode) {
  const count = offenseCountMap.get(normalizeSrCodeKey(srCode)) || 0;
  if (!count) {
    return `<span style="color:#9ca3af;">0</span>`;
  }
  if (count === 1) {
    return `<span class="badge" title="1 total offense" style="padding:0.35rem 0.7rem;border-radius:6px;font-weight:700;font-size:0.8rem;background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);color:white;">1</span>`;
  }
  return `<span class="badge" title="${count} total offenses (repeat offender)" style="padding:0.35rem 0.6rem;border-radius:6px;font-weight:700;font-size:0.8rem;background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);color:white;white-space:nowrap;">${count} &middot; Repeat</span>`;
}

async function loadOffenseCounts(supabase) {
  try {
    const [minorResult, majorResult] = await Promise.all([
      supabase.from("minor_offenses").select("sr_code"),
      supabase.from("major_offenses").select("sr_code"),
    ]);

    if (minorResult.error) throw minorResult.error;
    if (majorResult.error) throw majorResult.error;

    offenseCountMap = buildOffenseCountMap(minorResult.data, majorResult.data);
  } catch (error) {
    console.error("Error loading offense counts:", error);
    offenseCountMap = new Map();
  }
}

function escapeCell(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

async function getAccessToken() {
  const supabase = await getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || "";
}

async function parseApiResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text, error: `Non-JSON response received (${response.status}).` };
  }
}

function setStatus(message, type = "info") {
  if (!studentsStatus) return;
  if (!message) {
    studentsStatus.textContent = "";
    return;
  }
  studentsStatus.textContent = message;
  studentsStatus.style.color = type === "error" ? "#dc2626" : "#374151";
}

async function resolveAccountContext(supabase) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "login.html";
    return null;
  }

  const { data: account } = await supabase
    .from("user_accounts")
    .select("role, organization_id, organizations(name)")
    .eq("user_id", session.user.id)
    .single();

  if (!account) {
    await supabase.auth.signOut();
    window.location.href = "login.html";
    return null;
  }

  return account;
}

async function loadStudents() {
  if (!studentsTableBody) return;
  studentsTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-5">Loading students...</td></tr>`;

  try {
    const token = await getAccessToken();
    if (!token) return;

    const params = new URLSearchParams();
    const academicYear = (studentsAcademicYearInput?.value || "").trim();
    const semester = studentsSemesterSelect?.value || "";
    const program = (studentsProgramInput?.value || "").trim();
    const search = (studentsSearchInput?.value || "").trim();

    if (academicYear) params.set("academic_year", academicYear);
    if (semester) params.set("semester", semester);
    if (program) params.set("program", program);
    if (search) params.set("q", search);

    const response = await fetch(`/api/students?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const result = await parseApiResponse(response);

    if (!response.ok) {
      throw new Error(String(result?.error || result?.raw || "Failed to load students"));
    }

    cachedStudents = Array.isArray(result) ? result : [];

    if (!cachedStudents.length) {
      studentsTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-5">
            No student records found for your campus.
          </td>
        </tr>
      `;
      setStatus("", "");
      return;
    }

    studentsTableBody.innerHTML = cachedStudents
      .map(
        (student) => `
        <tr>
          <td>${escapeHtml(student.sr_code)}</td>
          <td>${escapeHtml(student.name)}</td>
          <td>${escapeHtml(student.program)}</td>
          <td>${escapeHtml(student.year_level)}</td>
          <td>${escapeHtml(student.academic_year)}</td>
          <td>${escapeHtml(student.semester)}</td>
          <td>${renderOffenseCountBadge(student.sr_code)}</td>
        </tr>
      `
      )
      .join("");

    setStatus(
      `${cachedStudents.length} ${cachedStudents.length === 1 ? "student" : "students"} found`,
      "info"
    );
  } catch (error) {
    console.error("Error loading students:", error);
    setStatus(`Error loading students: ${error.message}`, "error");
    studentsTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-5" style="color: #dc2626;">
          Error loading students. Check the message above.
        </td>
      </tr>
    `;
  }
}

function downloadCsv() {
  if (!cachedStudents.length) return;

  const headers = ["sr_code", "name", "program", "year_level", "academic_year", "semester", "offense_count"];
  const lines = cachedStudents.map((student) =>
    headers
      .map((header) =>
        escapeCell(header === "offense_count" ? offenseCountMap.get(normalizeSrCodeKey(student.sr_code)) || 0 : student[header])
      )
      .join(",")
  );
  const csv = [headers.join(","), ...lines].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `students-${currentOrganizationName || "campus"}-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function bindEvents() {
  if (studentsRefreshBtn) {
    studentsRefreshBtn.addEventListener("click", async () => {
      const supabase = await getSupabase();
      await loadOffenseCounts(supabase);
      await loadStudents();
    });
  }

  if (studentsExportBtn) {
    studentsExportBtn.addEventListener("click", downloadCsv);
  }

  if (studentsSearchInput) {
    let debounceTimer = null;
    studentsSearchInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => loadStudents(), 400);
    });
  }

  [studentsAcademicYearInput, studentsSemesterSelect, studentsProgramInput].forEach((element) => {
    if (element) {
      element.addEventListener("change", () => loadStudents());
    }
  });
}

(async function init() {
  const supabase = await getSupabase();
  const account = await resolveAccountContext(supabase);
  if (!account) return;

  if (account.role === "admin") {
    window.location.href = "admin.html";
    return;
  }

  currentOrganizationName = String(account.organizations?.name || "").trim();
  if (campusSubtitle) {
    campusSubtitle.textContent = currentOrganizationName
      ? `${currentOrganizationName} student directory`
      : "Your campus student directory";
  }

  bindEvents();
  await loadOffenseCounts(supabase);
  await loadStudents();
})();
