const statsEl = document.querySelector("#stats");
const resultsEl = document.querySelector("#results");
const entityEl = document.querySelector("#entity");
const recommendationsEl = document.querySelector("#recommendations");
const searchEl = document.querySelector("#search");
const typeEl = document.querySelector("#type");
const runEl = document.querySelector("#run");

runEl.addEventListener("click", runSearch);
searchEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") runSearch();
});

init();

async function init() {
  const dashboard = await getJson("/api/dashboard");
  statsEl.innerHTML = [
    stat("Nodes", dashboard.stats.nodeCount),
    stat("Edges", dashboard.stats.edgeCount),
    stat("Entity types", Object.keys(dashboard.stats.byType).length)
  ].join("");
  recommendationsEl.innerHTML = dashboard.recommendations.map(recommendationCard).join("");
  await showEntity("concept-crispr");
  await runSearch();
}

async function runSearch() {
  const params = new URLSearchParams({ q: searchEl.value, minReproducibility: "0.85" });
  if (typeEl.value) params.set("type", typeEl.value);
  const result = await getJson(`/api/query?${params}`);
  resultsEl.innerHTML = result.nodes.slice(0, 10).map(nodeCard).join("") || empty("No matching nodes.");
}

async function showEntity(id) {
  const page = await getJson(`/api/entities/${id}`);
  entityEl.innerHTML = `
    <div class="card">
      <h3>${page.label}</h3>
      <p>${page.type} across ${page.domains.join(", ")}. Citation reach: ${page.citationReach}.</p>
    </div>
    ${page.usageContexts.map((context) => `
      <div class="card">
        <h3>${context.title}</h3>
        <p>${context.kind} in ${context.domain}; reproducibility score ${context.reproducibilityScore}</p>
      </div>
    `).join("")}
  `;
}

function stat(label, value) {
  return `<div class="stat"><strong>${value}</strong>${label}</div>`;
}

function nodeCard(node) {
  return `<div class="card"><h3>${node.label}</h3><p>${node.type} ${node.domains?.length ? `in ${node.domains.join(", ")}` : ""}</p></div>`;
}

function recommendationCard(item) {
  return `<div class="card"><h3>${item.label}</h3><p>Score ${item.score}. ${item.reason}</p></div>`;
}

function empty(message) {
  return `<div class="card"><p>${message}</p></div>`;
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${url}`);
  return response.json();
}
