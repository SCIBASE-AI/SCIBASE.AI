const data = require("./demo-data.json");
const { evaluateProvisioningDrift } = require("./src/provisioning-drift");

const report = evaluateProvisioningDrift(data);

console.log("Enterprise Identity Provisioning Drift Demo");
console.log("Institution:", data.institution.name);
console.log("Status:", report.summary.status);
console.log("Findings:", report.summary.totalFindings);
console.log("Critical:", report.summary.criticalFindings);
console.log("Project actions:", report.summary.projectActions);
console.log("");

console.log("Top access-review subjects:");
for (const item of report.accessReviewQueue.slice(0, 4)) {
  const labels = item.findings.map((finding) => `${finding.kind}:${finding.severity}`).join(", ");
  console.log(`- ${item.email} [${item.severity}] ${labels}`);
}

console.log("");
console.log("Project actions:");
for (const action of report.projectActions) {
  console.log(`- ${action.decision} ${action.email} on ${action.projectId} (${action.access})`);
}

console.log("");
console.log("Webhook events:");
for (const event of report.webhookEvents) {
  console.log(`- ${event.body.type} ${event.id} ${event.headers["x-scibase-signature"].slice(0, 16)}...`);
}

console.log("");
console.log("Audit digest:", report.auditDigest);
