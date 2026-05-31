import assert from "node:assert/strict";
import { projects, repositoryPolicies, reviewDate } from "./sample-data.js";
import {
  evaluateCredential,
  evaluateProject,
  runCredentialRotationReview
} from "./index.js";

const asOf = new Date(reviewDate);

const cleanProject = evaluateProject(projects[0], repositoryPolicies, asOf);
assert.equal(cleanProject.decision, "release-ready");
assert.equal(cleanProject.severityCounts.high, 0);
assert.equal(cleanProject.severityCounts.critical, 0);

const blockedProject = evaluateProject(projects[1], repositoryPolicies, asOf);
assert.equal(blockedProject.decision, "hold-release");
assert.equal(blockedProject.severityCounts.critical, 3);
assert.ok(
  blockedProject.credentialReports
    .flatMap((report) => report.findings)
    .some((finding) => finding.code === "wildcard-ref-access")
);

const adminTokenReport = blockedProject.credentialReports.find(
  (report) => report.credentialId === "workflow-admin-pat"
);
assert.equal(adminTokenReport.decision, "hold");
assert.deepEqual(
  adminTokenReport.findings
    .filter((finding) => finding.code === "privileged-automation-scope")
    .map((finding) => finding.severity),
  ["high"]
);

const expiringCredential = projects[2].credentials.find(
  (credential) => credential.id === "artifact-signer"
);
const expiringReport = evaluateCredential(
  expiringCredential,
  projects[2],
  repositoryPolicies,
  asOf
);
assert.equal(expiringReport.decision, "rotate");
assert.ok(expiringReport.findings.some((finding) => finding.code === "release-expiry-risk"));

const packet = runCredentialRotationReview(projects, repositoryPolicies, reviewDate);
assert.equal(packet.summary.projects, 3);
assert.equal(packet.summary.credentials, 6);
assert.equal(packet.summary.decisions["hold-release"], 1);
assert.equal(packet.summary.decisions["rotate-before-release"], 1);
assert.equal(packet.summary.decisions["release-ready"], 1);
assert.match(packet.auditDigest, /^sha256:[a-f0-9]{64}$/);

const packetAgain = runCredentialRotationReview(projects, repositoryPolicies, reviewDate);
assert.equal(packetAgain.auditDigest, packet.auditDigest);

console.log("repository automation credential rotation guard tests passed");
