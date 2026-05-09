const dashboard = await fetch("/api/dashboard").then((response) => response.json());

document.querySelector("#projectTitle").textContent = dashboard.project.title;
document.querySelector("#project").innerHTML = [
  row("Visibility", dashboard.project.visibility),
  row("Resources", Object.values(dashboard.project.resources).flat().length),
  row("Collaborators", dashboard.project.collaborators.length),
  row("Audit events", dashboard.project.auditLog.length)
].join("");

document.querySelector("#identity").innerHTML = `
  ${row("Authenticated", dashboard.auth.authenticated)}
  ${row("Provider", dashboard.auth.provider)}
  ${row("Linked identities", dashboard.auth.identityLinks.join(", "))}
`;

document.querySelector("#access").innerHTML = dashboard.accessMatrix
  .map((rule) => `<div class="rule"><strong>${rule.role}</strong><span>${rule.principalId}</span><small>${rule.permissions.join(", ")}</small></div>`)
  .join("");

document.querySelector("#profiles").innerHTML = dashboard.profiles
  .map(
    (profile) => `
      <div class="profile">
        <strong>${profile.name}</strong>
        <span>${profile.institution}</span>
        <small>Score ${profile.reputation.score} · ${profile.orcid}</small>
      </div>
    `
  )
  .join("");

function row(label, value) {
  return `<div class="row"><span>${label}</span><strong>${String(value)}</strong></div>`;
}
