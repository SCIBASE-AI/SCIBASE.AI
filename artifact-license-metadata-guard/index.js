const REQUIRED_METADATA = ["title", "creators", "publisher", "publicationYear", "resourceType", "schema.org"];
const OPEN_LICENSES = new Set(["CC-BY-4.0", "CC0-1.0", "MIT", "Apache-2.0", "BSD-3-Clause"]);

function evaluateArtifact(artifact) {
  const findings = [];
  const missingMetadata = REQUIRED_METADATA.filter((field) => !artifact.metadata.includes(field));

  if (!OPEN_LICENSES.has(artifact.license)) findings.push(`license ${artifact.license} is not public-release compatible`);
  if (!artifact.checksum) findings.push("missing checksum coverage");
  if (artifact.identifiers.length === 0) findings.push("missing persistent identifier");
  if (missingMetadata.length > 0) findings.push(`missing metadata fields: ${missingMetadata.join(", ")}`);
  if (artifact.sensitiveUseFlags.length > 0 && artifact.access === "public") {
    findings.push(`sensitive artifact marked public: ${artifact.sensitiveUseFlags.join(", ")}`);
  }
  if (artifact.sensitiveUseFlags.includes("human-subjects") && artifact.license === "CC0-1.0") {
    findings.push("human-subjects supplement should not use unrestricted CC0 release");
  }

  const decision = findings.length === 0 ? "release-ready" : "hold-for-curation";
  const actions = decision === "release-ready"
    ? ["publish artifact", "include in FAIR export manifest"]
    : ["hold artifact release", "request metadata/license remediation", "exclude from public FAIR bundle"];

  return {
    id: artifact.id,
    kind: artifact.kind,
    filename: artifact.filename,
    decision,
    missingMetadata,
    findings,
    actions
  };
}

function evaluateBatch(batch) {
  const artifacts = batch.artifacts.map(evaluateArtifact);
  const summary = artifacts.reduce(
    (acc, artifact) => {
      acc.total += 1;
      acc[artifact.decision] = (acc[artifact.decision] || 0) + 1;
      acc.findingCount += artifact.findings.length;
      return acc;
    },
    { total: 0, findingCount: 0 }
  );

  return { batchId: batch.id, generatedAt: batch.generatedAt, summary, artifacts };
}

module.exports = { REQUIRED_METADATA, OPEN_LICENSES, evaluateArtifact, evaluateBatch };
