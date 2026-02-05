const navButtons = document.querySelectorAll(".nav-btn");
const tabs = document.querySelectorAll(".tab");
const heroButtons = document.querySelectorAll("[data-tab]");
const tableBody = document.querySelector("#minor-table-body");
const recordForm = document.querySelector("#record-form");
const formStatus = document.querySelector("#form-status");
const exportButton = document.querySelector("#export-pdf");

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

async function loadRecords() {
  try {
    const response = await fetch("/api/minor-offenses");
    const records = await response.json();
    renderRows(records);
  } catch (error) {
    renderRows([]);
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
    } catch (error) {
      formStatus.textContent = "Something went wrong. Please try again.";
    }
  });
}

if (exportButton) {
  exportButton.addEventListener("click", () => {
    window.location.href = "/api/minor-offenses/pdf";
  });
}

loadRecords();
