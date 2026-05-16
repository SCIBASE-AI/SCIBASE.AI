const assert = require("node:assert/strict");
const data = require("./demo-data.json");
const {
  evaluateProvisioningDrift,
  signWebhook,
  stableJson,
  normalizeEmail
} = require("./src/provisioning-drift");

const report = evaluateProvisioningDrift(data);

assert.equal(normalizeEmail(" Ana.Ortega@Northbridge.Example "), "ana.ortega@northbridge.example");
assert.equal(report.institutionId, "inst-northbridge");
assert.equal(report.summary.status, "block_access_until_remediated");
assert.equal(report.summary.criticalFindings, 1);
assert.equal(report.summary.revokeNow, 2);

const terminatedFinding = report.findings.find(
  (finding) => finding.kind === "terminated_user_active_access"
);
assert.ok(terminatedFinding, "terminated HRIS user should be flagged");
assert.equal(terminatedFinding.email, "li.chen@northbridge.example");
assert.equal(terminatedFinding.action, "disable_platform_user_and_revoke_project_access");

const mfaFinding = report.findings.find((finding) => finding.kind === "mfa_not_enforced");
assert.ok(mfaFinding, "missing MFA should be flagged for SAML user");
assert.equal(mfaFinding.email, "noah.evans@northbridge.example");

const externalReviewerFinding = report.findings.find(
  (finding) =>
    finding.kind === "missing_hris_record" &&
    finding.email === "guest.reviewer@external.example"
);
assert.ok(externalReviewerFinding, "external platform reviewer should be routed for HRIS review");

const liActions = report.projectActions.filter(
  (action) => action.email === "li.chen@northbridge.example"
);
assert.equal(liActions.length, 2, "terminated project admin should produce two project actions");
assert.ok(liActions.every((action) => action.decision === "revoke_now"));

const reviewSubjects = report.accessReviewQueue.map((item) => item.email);
assert.equal(reviewSubjects[0], "li.chen@northbridge.example");
assert.ok(reviewSubjects.includes("noah.evans@northbridge.example"));

for (const event of report.webhookEvents) {
  assert.equal(
    event.headers["x-scibase-signature"],
    signWebhook(data.institution.webhookSigningSeed, event.body)
  );
}

const repeated = evaluateProvisioningDrift(data);
assert.equal(report.auditDigest, repeated.auditDigest, "audit digest should be deterministic");
assert.equal(stableJson({ b: 2, a: 1 }), '{"a":1,"b":2}');

console.log("enterprise-identity-provisioning-drift tests passed");
