const dashboard = await fetch("/api/dashboard").then((response) => response.json());

document.querySelector("#storage").textContent = `${dashboard.manifest.artifacts.length} artifacts · ${dashboard.manifest.totalBytes} bytes`;
document.querySelector("#artifacts").innerHTML = dashboard.manifest.artifacts
  .map((artifact) => `<div class="row"><strong>${artifact.path}</strong><span>${artifact.type} · ${artifact.preview.kind}</span></div>`)
  .join("");

document.querySelector("#metadata").innerHTML = [
  row("DOI", dashboard.metadata.dataCite.identifier.identifier),
  row("Findable", dashboard.metadata.fair.findable),
  row("Accessible", dashboard.metadata.fair.accessible),
  row("Reusable", dashboard.metadata.fair.reusable)
].join("");

document.querySelector("#diff").innerHTML = [
  row("Added samples", dashboard.versionDiff.addedSamples.join(", ") || "none"),
  row("Removed samples", dashboard.versionDiff.removedSamples.join(", ") || "none"),
  row("Row delta", dashboard.versionDiff.rowDelta)
].join("");

document.querySelector("#execution").innerHTML = [
  row("Status", dashboard.execution.status),
  row("Environment", dashboard.execution.environment.name),
  row("Sandbox", `${dashboard.execution.sandbox.isolation}, network ${dashboard.execution.sandbox.network}`),
  row("Score", dashboard.execution.reproducibilityScore)
].join("");

function row(label, value) {
  return `<div class="row"><span>${label}</span><strong>${String(value)}</strong></div>`;
}
