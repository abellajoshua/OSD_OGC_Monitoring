const navButtons = document.querySelectorAll(".nav-btn");
const tabs = document.querySelectorAll(".tab");
const heroButtons = document.querySelectorAll("[data-tab]");
const tableBody = document.querySelector("#minor-table-body");
const recordForm = document.querySelector("#record-form");
const formStatus = document.querySelector("#form-status");
const exportButton = document.querySelector("#export-pdf");
const uniformTableBody = document.querySelector("#uniform-table-body");
const uniformForm = document.querySelector("#uniform-form");
const uniformStatus = document.querySelector("#uniform-status");
const gatepassTableBody = document.querySelector("#gatepass-table-body");
const gatepassForm = document.querySelector("#gatepass-form");
const gatepassStatus = document.querySelector("#gatepass-status");
const goodmoralTableBody = document.querySelector("#goodmoral-table-body");
const goodmoralForm = document.querySelector("#goodmoral-form");
const goodmoralStatus = document.querySelector("#goodmoral-status");
const statActive = document.querySelector("[data-stat='active']");
const statPending = document.querySelector("[data-stat='pending']");
const statResolved = document.querySelector("[data-stat='resolved']");
const statFollowups = document.querySelector("[data-stat='followups']");
const archiveButtons = document.querySelectorAll("[data-archive]");

const minorFilter = document.querySelector("[data-filter-scope='minor']");
const uniformFilter = document.querySelector("[data-filter-scope='uniform']");
const gatepassFilter = document.querySelector("[data-filter-scope='gatepass']");
const goodmoralFilter = document.querySelector("[data-filter-scope='goodmoral']");

let minorRecords = [];
let uniformRecords = [];
let gatepassRecords = [];
let goodmoralRecords = [];

function switchTab(targetId) {
  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.id === targetId);
  });
  navButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === targetId);
  });
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function renderRows(records) {
  tableBody.innerHTML = "";
  if (!records.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="11">No records yet. Create the first entry below.</td>`;
    tableBody.appendChild(row);
    return;
  }

  records.forEach((record) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatDate(record.date_of_complaint)}</td>
      <td>${record.name_of_student || ""}</td>
      <td>${record.sr_code || ""}</td>
      <td>${record.year_program || ""}</td>
      <td>${record.contact_number || ""}</td>
      <td>${record.reported_by || ""}</td>
      <td>${record.sex === "M" ? "✔" : ""}</td>
      <td>${record.sex === "F" ? "✔" : ""}</td>
      <td>${record.offense || ""}</td>
      <td>${record.sanction || ""}</td>
      <td>${formatDate(record.date_of_sanction)}</td>
    `;
    tableBody.appendChild(row);
  });
}

function renderUniformRows(records) {
  uniformTableBody.innerHTML = "";
  if (!records.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="10">No records yet. Create the first entry below.</td>`;
    uniformTableBody.appendChild(row);
    return;
  }

  records.forEach((record, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${formatDate(record.date)}</td>
      <td>${record.time_in || ""}</td>
      <td>${record.time_out || ""}</td>
      <td>${record.name || ""}</td>
      <td>${record.sr_code || ""}</td>
      <td>${record.course || ""}</td>
      <td>${record.sex === "M" ? "✔" : ""}</td>
      <td>${record.sex === "F" ? "✔" : ""}</td>
      <td>${record.reason || ""}</td>
    `;
    uniformTableBody.appendChild(row);
  });
}

function renderGatepassRows(records) {
  gatepassTableBody.innerHTML = "";
  if (!records.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="10">No records yet. Create the first entry below.</td>`;
    gatepassTableBody.appendChild(row);
    return;
  }

  records.forEach((record, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${formatDate(record.date)}</td>
      <td>${record.time_in || ""}</td>
      <td>${record.time_out || ""}</td>
      <td>${record.name || ""}</td>
      <td>${record.sr_code || ""}</td>
      <td>${record.course || ""}</td>
      <td>${record.sex === "M" ? "✔" : ""}</td>
      <td>${record.sex === "F" ? "✔" : ""}</td>
      <td>${record.reason || ""}</td>
    `;
    gatepassTableBody.appendChild(row);
  });
}

function renderGoodmoralRows(records) {
  goodmoralTableBody.innerHTML = "";
  if (!records.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="10">No records yet. Create the first entry below.</td>`;
    goodmoralTableBody.appendChild(row);
    return;
  }

  records.forEach((record, index) => {
    const tag = record.has_minor_offense
      ? `<span class="tag tag-alert">Minor Offense</span>`
      : "";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${formatDate(record.date)}</td>
      <td>${record.time_in || ""}</td>
      <td>${record.time_out || ""}</td>
      <td>${record.name || ""} ${tag}</td>
      <td>${record.sr_code || ""}</td>
      <td>${record.course || ""}</td>
      <td>${record.sex === "M" ? "✔" : ""}</td>
      <td>${record.sex === "F" ? "✔" : ""}</td>
      <td>${record.purpose || ""}</td>
    `;
    goodmoralTableBody.appendChild(row);
  });
}

function matchesQuery(record, fields, query) {
  if (!query) return true;
  const haystack = fields.map((field) => String(record[field] || "")).join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function withinDateRange(recordDate, from, to) {
  if (!recordDate) return false;
  const dateValue = new Date(recordDate);
  if (Number.isNaN(dateValue.getTime())) return false;
  if (from) {
    const fromDate = new Date(from);
    if (dateValue < fromDate) return false;
  }
  if (to) {
    const toDate = new Date(to);
    if (dateValue > toDate) return false;
  }
  return true;
}

function applyMinorFilters() {
  if (!minorFilter) return;
  const query = minorFilter.querySelector("[data-filter='query']").value.trim();
  const from = minorFilter.querySelector("[data-filter='from']").value;
  const to = minorFilter.querySelector("[data-filter='to']").value;

  const filtered = minorRecords.filter((record) => {
    const inRange = withinDateRange(record.date_of_complaint, from, to);
    const matches = matchesQuery(record, ["name_of_student", "sr_code", "offense", "reported_by", "year_program"], query);
    return inRange && matches;
  });
  renderRows(filtered);
}

function applyUniformFilters() {
  if (!uniformFilter) return;
  const query = uniformFilter.querySelector("[data-filter='query']").value.trim();
  const from = uniformFilter.querySelector("[data-filter='from']").value;
  const to = uniformFilter.querySelector("[data-filter='to']").value;

  const filtered = uniformRecords.filter((record) => {
    const inRange = withinDateRange(record.date, from, to);
    const matches = matchesQuery(record, ["name", "sr_code", "course", "reason"], query);
    return inRange && matches;
  });
  renderUniformRows(filtered);
}

function applyGatepassFilters() {
  if (!gatepassFilter) return;
  const query = gatepassFilter.querySelector("[data-filter='query']").value.trim();
  const from = gatepassFilter.querySelector("[data-filter='from']").value;
  const to = gatepassFilter.querySelector("[data-filter='to']").value;

  const filtered = gatepassRecords.filter((record) => {
    const inRange = withinDateRange(record.date, from, to);
    const matches = matchesQuery(record, ["name", "sr_code", "course", "reason"], query);
    return inRange && matches;
  });
  renderGatepassRows(filtered);
}

function applyGoodmoralFilters() {
  if (!goodmoralFilter) return;
  const query = goodmoralFilter.querySelector("[data-filter='query']").value.trim();
  const from = goodmoralFilter.querySelector("[data-filter='from']").value;
  const to = goodmoralFilter.querySelector("[data-filter='to']").value;

  const filtered = goodmoralRecords.filter((record) => {
    const inRange = withinDateRange(record.date, from, to);
    const matches = matchesQuery(record, ["name", "sr_code", "course", "purpose"], query);
    return inRange && matches;
  });
  renderGoodmoralRows(filtered);
}

function setupFilters(scopeElement, applyFn) {
  if (!scopeElement) return;
  const queryInput = scopeElement.querySelector("[data-filter='query']");
  const fromInput = scopeElement.querySelector("[data-filter='from']");
  const toInput = scopeElement.querySelector("[data-filter='to']");
  const applyButton = scopeElement.querySelector("[data-filter='apply']");
  const clearButton = scopeElement.querySelector("[data-filter='clear']");

  [queryInput, fromInput, toInput].forEach((input) => {
    input.addEventListener("input", applyFn);
  });

  if (applyButton) {
    applyButton.addEventListener("click", applyFn);
  }

  clearButton.addEventListener("click", () => {
    queryInput.value = "";
    fromInput.value = "";
    toInput.value = "";
    applyFn();
  });
}

async function loadRecords() {
  try {
    const response = await fetch("/api/minor-offenses");
    const records = await response.json();
    minorRecords = records;
    applyMinorFilters();
  } catch (error) {
    renderRows([]);
  }
}

async function loadDashboard() {
  try {
    const response = await fetch("/api/dashboard");
    const stats = await response.json();
    if (statActive) statActive.textContent = stats.activeCases ?? 0;
    if (statPending) statPending.textContent = stats.pendingSanctions ?? 0;
    if (statResolved) statResolved.textContent = stats.resolvedThisWeek ?? 0;
    if (statFollowups) statFollowups.textContent = stats.followUpsDue ?? 0;
  } catch (error) {
    if (statActive) statActive.textContent = "--";
    if (statPending) statPending.textContent = "--";
    if (statResolved) statResolved.textContent = "--";
    if (statFollowups) statFollowups.textContent = "--";
  }
}

async function loadUniformRecords() {
  try {
    const response = await fetch("/api/non-wearing-uniform");
    const records = await response.json();
    uniformRecords = records;
    applyUniformFilters();
  } catch (error) {
    renderUniformRows([]);
  }
}

async function loadGatepassRecords() {
  try {
    const response = await fetch("/api/gatepass");
    const records = await response.json();
    gatepassRecords = records;
    applyGatepassFilters();
  } catch (error) {
    renderGatepassRows([]);
  }
}

async function loadGoodmoralRecords() {
  try {
    const response = await fetch("/api/good-moral");
    const records = await response.json();
    goodmoralRecords = records;
    applyGoodmoralFilters();
  } catch (error) {
    renderGoodmoralRows([]);
  }
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});

heroButtons.forEach((button) => {
  button.addEventListener("click", () => {
    switchTab(button.dataset.tab);
    const scrollTarget = button.dataset.scroll;
    if (scrollTarget) {
      const element = document.getElementById(scrollTarget);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  });
});


if (recordForm) {
  recordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    formStatus.textContent = "Saving record...";
    const formData = new FormData(recordForm);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/minor-offenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const details = await response.json().catch(() => null);
        throw new Error(details?.error || "Unable to save record.");
      }

      recordForm.reset();
      formStatus.textContent = "Record saved.";
      await loadRecords();
      await loadDashboard();
    } catch (error) {
      formStatus.textContent =
        error?.message?.includes("Failed to fetch")
          ? "Server not reachable. Please start the server."
          : error.message || "Something went wrong. Please try again.";
    }
  });
}

if (uniformForm) {
  uniformForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    uniformStatus.textContent = "Saving record...";
    const formData = new FormData(uniformForm);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/non-wearing-uniform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const details = await response.json().catch(() => null);
        throw new Error(details?.error || "Unable to save record.");
      }

      uniformForm.reset();
      uniformStatus.textContent = "Record saved.";
      await loadUniformRecords();
      await loadDashboard();
    } catch (error) {
      uniformStatus.textContent =
        error?.message?.includes("Failed to fetch")
          ? "Server not reachable. Please start the server."
          : error.message || "Something went wrong. Please try again.";
    }
  });
}

if (gatepassForm) {
  gatepassForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    gatepassStatus.textContent = "Saving record...";
    const formData = new FormData(gatepassForm);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/gatepass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const details = await response.json().catch(() => null);
        throw new Error(details?.error || "Unable to save record.");
      }

      gatepassForm.reset();
      gatepassStatus.textContent = "Record saved.";
      await loadGatepassRecords();
      await loadDashboard();
    } catch (error) {
      gatepassStatus.textContent =
        error?.message?.includes("Failed to fetch")
          ? "Server not reachable. Please start the server."
          : error.message || "Something went wrong. Please try again.";
    }
  });
}

if (goodmoralForm) {
  goodmoralForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    goodmoralStatus.textContent = "Saving record...";
    const formData = new FormData(goodmoralForm);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/good-moral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const details = await response.json().catch(() => null);
        throw new Error(details?.error || "Unable to save record.");
      }

      goodmoralForm.reset();
      goodmoralStatus.textContent = "Record saved.";
      await loadGoodmoralRecords();
      await loadDashboard();
    } catch (error) {
      goodmoralStatus.textContent =
        error?.message?.includes("Failed to fetch")
          ? "Server not reachable. Please start the server."
          : error.message || "Something went wrong. Please try again.";
    }
  });
}

if (exportButton) {
  exportButton.addEventListener("click", () => {
    window.location.href = "/api/minor-offenses/pdf";
  });
}

loadRecords();
loadUniformRecords();
loadGatepassRecords();
loadGoodmoralRecords();
loadDashboard();

setupFilters(minorFilter, applyMinorFilters);
setupFilters(uniformFilter, applyUniformFilters);
setupFilters(gatepassFilter, applyGatepassFilters);
setupFilters(goodmoralFilter, applyGoodmoralFilters);

archiveButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const endpoint = button.dataset.archive;
    if (endpoint) {
      window.location.href = `/api/${endpoint}/archive`;
    }
  });
});
