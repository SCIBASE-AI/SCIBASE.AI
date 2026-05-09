const payload = await fetch("/api/dashboard").then((response) => response.json());

document.querySelector("#orgName").textContent = payload.dashboard.organization;
document.querySelector("#overview").innerHTML = [
  row("Projects", payload.dashboard.overview.projects),
  row("Storage", `${payload.dashboard.overview.storageGb} GB`),
  row("Compute", `${payload.dashboard.overview.computeHours} hours`),
  row("Average reproducibility", payload.dashboard.overview.averageReproducibility)
].join("");

document.querySelector("#api").innerHTML = payload.api.integrations
  .map((integration) => `<div class="row"><strong>${integration.name}</strong><span>${integration.type} · ${integration.enabled ? "enabled" : "disabled"}</span></div>`)
  .join("");

document.querySelector("#compliance").innerHTML = payload.dashboard.compliance
  .map((item) => `<div class="row"><strong>${item.projectId}</strong><span>${item.mandate} · ${item.status} · score ${item.reproducibilityScore}</span></div>`)
  .join("");

document.querySelector("#export").innerHTML = [
  row("Target", payload.exportPipeline.target),
  row("Format", payload.exportPipeline.format),
  row("Compliance", payload.exportPipeline.complianceStatus),
  row("Preserves", payload.exportPipeline.preservedMetadata.join(", "))
].join("");

function row(label, value) {
  return `<div class="row"><span>${label}</span><strong>${String(value)}</strong></div>`;
}
