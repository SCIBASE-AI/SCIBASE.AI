const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { auditAnonymousReviewPacket, detectIdentity, writeAuditReports } = require("./index");
const { samplePacket } = require("./sample-data");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeReadyPacket() {
  const packet = clone(samplePacket);
  packet.reviewPacket.variant = "redacted";
  packet.reviewPacket.sections = packet.reviewPacket.sections.map((section) => ({
    ...section,
    text: section.kind === "acknowledgements" ? "Acknowledgements withheld until award disclosure." : section.text,
    redacted: true,
  }));
  packet.artifacts = packet.artifacts.map((artifact) => ({
    ...artifact,
    path: `review/${artifact.id}`,
    requiresRedaction: false,
    metadata: artifact.type === "notebook" ? { kernelspec: "python3" } : {},
    outputs: artifact.type === "notebook" ? ["Loaded blinded cohort from review/cohort.csv", "Final AUROC 0.83"] : [],
  }));
  packet.commitHistory = packet.commitHistory.map((commit) => ({
    ...commit,
    authorName: "anonymous-solver",
    authorEmail: "",
    message: "redacted submission commit",
  }));
  packet.accessGrants = packet.accessGrants.map((grant) =>
    grant.role === "sponsor" ? { ...grant, packetVariant: "redacted" } : grant,
  );
  packet.redactionReceipts = packet.artifacts.map((artifact) => ({ artifactId: artifact.id, transformDigest: `sha256:${artifact.id}` }));
  packet.auditLogs = packet.auditLogs.map((log) => (log.containsIdentity ? { ...log, visibility: "arbitrator-only" } : log));
  return packet;
}

function codes(report) {
  return new Set(report.findings.map((finding) => finding.code));
}

assert.deepStrictEqual(detectIdentity("alice.nguyen@stanford.edu /Users/alice @labsolver").sort(), [
  "email",
  "github-handle",
  "home-directory",
  "institution",
]);

const report = auditAnonymousReviewPacket(samplePacket);
const findingCodes = codes(report);
assert.strictEqual(report.decision, "hold-review-packet");
assert.strictEqual(report.riskScore, 100);
assert(findingCodes.has("COMMIT_AUTHOR_LEAK"));
assert(findingCodes.has("FILE_PATH_IDENTITY_LEAK"));
assert(findingCodes.has("NOTEBOOK_OUTPUT_IDENTITY_LEAK"));
assert(findingCodes.has("DOCUMENT_METADATA_LEAK"));
assert(findingCodes.has("EXIF_GPS_OR_DEVICE_LEAK"));
assert(findingCodes.has("ACKNOWLEDGEMENT_IDENTITY_LEAK"));
assert(findingCodes.has("UNBLINDED_REVIEWER_ROLE"));
assert(findingCodes.has("REDACTION_EVIDENCE_MISSING"));
assert(findingCodes.has("AUDIT_LOG_UNPROTECTED"));

const repeatedReport = auditAnonymousReviewPacket(samplePacket);
assert.strictEqual(report.evidenceDigest, repeatedReport.evidenceDigest, "audit digest should be deterministic");

const readyReport = auditAnonymousReviewPacket(makeReadyPacket());
assert.strictEqual(readyReport.decision, "release-redacted-packet");
assert.strictEqual(readyReport.findingCount, 0);
assert.strictEqual(readyReport.riskScore, 0);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "anonymous-review-packet-"));
const paths = writeAuditReports(report, tempDir);
for (const outputPath of Object.values(paths)) {
  assert(fs.existsSync(outputPath), `expected report at ${outputPath}`);
}
assert(fs.readFileSync(paths.markdownPath, "utf8").includes("Anonymous Review Packet Guard"));

console.log("anonymous-review-packet-guard tests passed");
