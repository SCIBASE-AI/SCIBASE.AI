const summaryEl = document.querySelector("#summary");
const summariesEl = document.querySelector("#summaries");
const reviewEl = document.querySelector("#review");
const citationsEl = document.querySelector("#citations");

init();

async function init() {
  const report = await getJson("/api/report");
  summaryEl.innerHTML = [
    metric("Manuscript", report.manuscript.domain),
    metric("Review risk", report.review.overallRisk.replace("_", " ")),
    metric("Citations", report.citations.length)
  ].join("");

  summariesEl.innerHTML = Object.values(report.summaries).map((item) => `
    <div class="card">
      <h3>${titleCase(item.mode)}</h3>
      <p>${item.summary}</p>
    </div>
  `).join("");

  reviewEl.innerHTML = report.review.diagnostics.map((item) => `
    <div class="card ${item.severity}">
      <h3>${item.id.replaceAll("_", " ")}</h3>
      <p>${item.severity}: ${item.recommendation}</p>
    </div>
  `).join("");

  citationsEl.innerHTML = report.citations.map((item) => `
    <div class="card">
      <h3>${item.title}</h3>
      <p>Score ${item.score}; DOI ${item.doi}; ${item.formatted}</p>
    </div>
  `).join("");
}

function metric(label, value) {
  return `<div class="metric"><strong>${value}</strong>${label}</div>`;
}

function titleCase(value) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${url}`);
  return response.json();
}
