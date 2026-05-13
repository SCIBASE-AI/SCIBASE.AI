const dashboard = await fetch("/api/dashboard").then((response) => response.json());

const metrics = [
  ["Review score", dashboard.peerReview.score],
  ["Repro confidence", dashboard.reproducibility.confidence],
  ["Artifacts", dashboard.project.artifactCount],
  ["Gap opportunities", dashboard.researchGaps.opportunities.length],
];

document.querySelector("#metrics").innerHTML = metrics
  .map(([label, value]) => `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`)
  .join("");

document.querySelector("#review").innerHTML = dashboard.peerReview.findings
  .map(
    (finding) => `
      <div class="finding ${finding.severity}">
        <strong>${finding.area}</strong>
        <p>${finding.message}</p>
        <small>${finding.recommendation}</small>
      </div>
    `,
  )
  .join("");

document.querySelector("#reproducibility").innerHTML = `
  <p class="status">${dashboard.reproducibility.status}</p>
  <ul>
    ${dashboard.reproducibility.previousAttempts
      .map((attempt) => `<li>${attempt.date}: ${attempt.actor} - ${attempt.status}</li>`)
      .join("")}
  </ul>
`;

document.querySelector("#gaps").innerHTML = dashboard.researchGaps.opportunities
  .slice(0, 3)
  .map(
    (gap) => `
      <div class="gap">
        <strong>${gap.score} · ${gap.title}</strong>
        <p>${gap.recommendedNextStep}</p>
      </div>
    `,
  )
  .join("");
