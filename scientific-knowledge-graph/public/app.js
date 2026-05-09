const dashboard = await fetch("/api/dashboard").then((response) => response.json());

document.querySelector("#graphSummary").textContent = `${dashboard.graph.nodes.length} nodes · ${dashboard.graph.edges.length} relationships`;
document.querySelector("#nodes").innerHTML = dashboard.graph.nodes
  .slice(0, 10)
  .map((node) => `<div class="row"><strong>${node.label}</strong><span>${node.type}</span></div>`)
  .join("");

document.querySelector("#entityTitle").textContent = dashboard.entityPage.entity.label;
document.querySelector("#entity").innerHTML = [
  row("Type", dashboard.entityPage.entity.type),
  row("Usage contexts", dashboard.entityPage.usageContexts.length),
  row("Citation reach", dashboard.entityPage.citations)
].join("");

document.querySelector("#navigation").innerHTML = Object.entries(dashboard.navigation)
  .map(([name, result]) => `<div class="row"><strong>${name}</strong><span>${result.nodes.length} nodes · ${result.edges.length} edges</span></div>`)
  .join("");

document.querySelector("#recommendations").innerHTML = dashboard.recommendations
  .map((item) => `<div class="row"><strong>${item.node.label}</strong><span>${item.score} · ${item.reason}</span></div>`)
  .join("");

function row(label, value) {
  return `<div class="row"><span>${label}</span><strong>${String(value)}</strong></div>`;
}
