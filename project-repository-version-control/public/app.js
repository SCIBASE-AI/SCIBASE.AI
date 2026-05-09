const dashboard = await fetch("/api/dashboard").then((response) => response.json());

document.querySelector("#repoTitle").textContent = dashboard.manifest.title;
document.querySelector("#manifest").innerHTML = [
  stat("DOI", dashboard.manifest.doi),
  stat("Files", dashboard.manifest.files.length),
  stat("Components", Object.keys(dashboard.manifest.components).join(", ")),
  stat("Integrity", dashboard.manifest.integrityHash.slice(0, 16))
].join("");

document.querySelector("#mergeRequest").innerHTML = `
  <div class="callout">
    <strong>${dashboard.mergeRequest.id}</strong>
    <span>${dashboard.mergeRequest.status}</span>
  </div>
  <ul>
    ${dashboard.mergeRequest.diffs.map((diff) => `<li>${diff.path} · ${diff.type} · ${diff.hunks.length} hunks</li>`).join("")}
  </ul>
`;

document.querySelector("#checks").innerHTML = `
  <div class="status ${dashboard.reproducibility.status}">${dashboard.reproducibility.status}</div>
  <ul>
    ${dashboard.reproducibility.checks.map((check) => `<li>${check.passed ? "PASS" : "FAIL"} · ${check.name}</li>`).join("")}
  </ul>
`;

document.querySelector("#citation").textContent = dashboard.citation.apa;
document.querySelector("#export").textContent = `${dashboard.exportBundle.fileName} · ${dashboard.exportBundle.cliCommand}`;

function stat(label, value) {
  return `<div><span>${label}</span><strong>${String(value)}</strong></div>`;
}
