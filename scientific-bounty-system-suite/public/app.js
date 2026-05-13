const dashboard = await fetch("/api/dashboard").then((response) => response.json());

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: dashboard.payouts.currency,
  maximumFractionDigits: 0,
});

const metrics = [
  ["Readiness", dashboard.challenge.readinessScore],
  ["Package score", dashboard.submission.packageScore],
  ["Arbitration", dashboard.arbitration.totalScore],
  ["Final pool", currency.format(dashboard.payouts.milestone.pool)],
];

document.querySelector("#metrics").innerHTML = metrics
  .map(([label, value]) => `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`)
  .join("");

document.querySelector("#challenge").innerHTML = `
  <p class="status">${dashboard.challenge.status}</p>
  <ul>
    ${dashboard.challenge.posting.deliverables
      .map((item) => `<li>${item.weight}% · ${item.title}</li>`)
      .join("")}
  </ul>
`;

document.querySelector("#submission").innerHTML = `
  <p class="status">${dashboard.submission.status}</p>
  <ul>
    ${dashboard.submission.manifest
      .map((artifact) => `<li>${artifact.type} ${artifact.version} · ${artifact.checksum}</li>`)
      .join("")}
  </ul>
`;

document.querySelector("#arbitration").innerHTML = dashboard.arbitration.rubricResults
  .map(
    (result) => `
      <div class="row">
        <strong>${result.average}/${result.maxScore}</strong>
        <span>${result.title}</span>
      </div>
    `,
  )
  .join("");

document.querySelector("#payouts").innerHTML = `
  <p class="status">${dashboard.payouts.payoutStatus}</p>
  <ul>
    ${dashboard.payouts.teamRoutes
      .map((route) => `<li>${route.role}: ${currency.format(route.amount)}</li>`)
      .join("")}
  </ul>
`;
