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
const statActive = document.querySelector("[data-stat='active']");
const statPending = document.querySelector("[data-stat='pending']");
const statResolved = document.querySelector("[data-stat='resolved']");
const statFollowups = document.querySelector("[data-stat='followups']");

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
    row.innerHTML = `<td colspan="12">No records yet. Create the first entry below.</td>`;
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
      <td>${record.signature || ""}</td>
    `;
    tableBody.appendChild(row);
  });
}

function renderUniformRows(records) {
  uniformTableBody.innerHTML = "";
  if (!records.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="11">No records yet. Create the first entry below.</td>`;
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
      <td>${record.signature || ""}</td>
    `;
    uniformTableBody.appendChild(row);
  });
}

function renderGatepassRows(records) {
  gatepassTableBody.innerHTML = "";
  if (!records.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="11">No records yet. Create the first entry below.</td>`;
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
      <td>${record.signature || ""}</td>
    `;
    gatepassTableBody.appendChild(row);
  });
}

async function loadRecords() {
  try {
    const response = await fetch("/api/minor-offenses");
    const records = await response.json();
    renderRows(records);
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
    renderUniformRows(records);
  } catch (error) {
    renderUniformRows([]);
  }
}

async function loadGatepassRecords() {
  try {
    const response = await fetch("/api/gatepass");
    const records = await response.json();
    renderGatepassRows(records);
  } catch (error) {
    renderGatepassRows([]);
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
        throw new Error("Unable to save record.");
      }

      recordForm.reset();
      formStatus.textContent = "Record saved.";
      await loadRecords();
      await loadDashboard();
    } catch (error) {
      formStatus.textContent = "Something went wrong. Please try again.";
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
        throw new Error("Unable to save record.");
      }

      uniformForm.reset();
      uniformStatus.textContent = "Record saved.";
      await loadUniformRecords();
      await loadDashboard();
    } catch (error) {
      uniformStatus.textContent = "Something went wrong. Please try again.";
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
        throw new Error("Unable to save record.");
      }

      gatepassForm.reset();
      gatepassStatus.textContent = "Record saved.";
      await loadGatepassRecords();
      await loadDashboard();
    } catch (error) {
      gatepassStatus.textContent = "Something went wrong. Please try again.";
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
loadDashboard();
