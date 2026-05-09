let dashboard;

const elements = {
  title: document.querySelector("#title"),
  profile: document.querySelector("#profile"),
  highlighted: document.querySelector("#highlighted"),
  score: document.querySelector("#score"),
  summary: document.querySelector("#summary"),
  findings: document.querySelector("#findings"),
  nextSteps: document.querySelector("#nextSteps"),
  template: document.querySelector("#template"),
  issues: document.querySelector("#issues"),
  citations: document.querySelector("#citations"),
  style: document.querySelector("#style")
};

async function loadDashboard() {
  dashboard = await fetchJson("/api/dashboard");
  elements.title.textContent = dashboard.profile.title;
  elements.profile.innerHTML = profileItem("Domain", dashboard.profile.domain) + profileItem("Words", dashboard.profile.wordCount) + profileItem("Keywords", dashboard.profile.keywords.slice(0, 5).join(", "));
  elements.highlighted.textContent = dashboard.citations.highlightedText;
  elements.score.textContent = dashboard.review.score;
  renderSummary("abstract");
  renderReview();
  renderCitations(dashboard.citations);
}

function renderSummary(mode) {
  const summary = dashboard.summaries[mode];
  elements.summary.textContent = summary.summary;
  elements.findings.innerHTML = summary.keyFindings.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  elements.nextSteps.innerHTML = summary.nextSteps.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderReview() {
  elements.template.textContent = dashboard.review.template;
  elements.issues.innerHTML = dashboard.review.issues
    .map(
      (issue) => `
        <article class="issue ${issue.severity}">
          <div>
            <span>${issue.type}</span>
            <strong>${issue.severity}</strong>
          </div>
          <p>${escapeHtml(issue.message)}</p>
          <small>${escapeHtml(issue.evidence)}</small>
        </article>
      `
    )
    .join("");
}

function renderCitations(citationPayload) {
  elements.citations.innerHTML = citationPayload.recommendations
    .map(
      (paper) => `
        <article class="citation">
          <div>
            <strong>${escapeHtml(paper.title)}</strong>
            <span>${paper.score.toFixed(2)}</span>
          </div>
          <p>${escapeHtml(paper.reason)}</p>
          <code>${escapeHtml(paper.formatted)}</code>
          <button data-insert="${escapeHtml(paper.insertText)}">${escapeHtml(paper.insertText)}</button>
        </article>
      `
    )
    .join("");
}

function profileItem(label, value) {
  return `<div><span>${label}</span><strong>${escapeHtml(String(value))}</strong></div>`;
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-mode]").forEach((item) => item.classList.toggle("active", item === button));
    renderSummary(button.dataset.mode);
  });
});

elements.style.addEventListener("change", async () => {
  renderCitations(await fetchJson(`/api/citations?style=${encodeURIComponent(elements.style.value)}`));
});

loadDashboard().catch((error) => {
  document.body.innerHTML = `<pre>${escapeHtml(error.stack || error.message)}</pre>`;
});
