const assert = require("assert");

const { assessReproducibilityBundle, normalizeCandidate } = require("./index");
const { releaseCandidate, riskyCandidate } = require("./sample-data");

const clean = assessReproducibilityBundle(releaseCandidate);
assert.strictEqual(clean.decision, "release");
assert.strictEqual(clean.summary.findings, 0);
assert.strictEqual(clean.summary.requiredTypesCovered, 7);

const risky = assessReproducibilityBundle(riskyCandidate);
assert.strictEqual(risky.decision, "hold");
for (const code of [
  "MISSING_REQUIRED_COMPONENT",
  "DUPLICATE_MANIFEST_PATH",
  "INVALID_COMPONENT_DIGEST",
  "UNVERSIONED_COMPONENT",
  "MISSING_RUNTIME_LOCKFILE",
  "UNPINNED_RUNTIME_IMAGE",
  "MISSING_DATA_PROVENANCE",
  "MISSING_METADATA_EXPORT_TARGETS",
  "INCOMPLETE_RELEASE_METADATA",
  "MISSING_AUTHOR_ATTRIBUTION",
  "INVALID_EXPORT_BUNDLE",
  "BUNDLE_OMITS_MANIFEST_COMPONENTS",
]) {
  assert(risky.findings.some((finding) => finding.code === code), `missing ${code}`);
}

const reviseOnly = assessReproducibilityBundle({
  ...releaseCandidate,
  components: releaseCandidate.components.map((component) =>
    component.id === "analysis-code"
      ? { ...component, runtimeImage: "ghcr.io/scibase/python-research:latest" }
      : component
  ),
});
assert.strictEqual(reviseOnly.decision, "revise");
assert(reviseOnly.findings.some((finding) => finding.code === "UNPINNED_RUNTIME_IMAGE"));

assert.throws(
  () => normalizeCandidate({ ...releaseCandidate, repositoryId: "" }),
  /repositoryId must be a non-empty string/
);

console.log("repository reproducibility bundle guard tests passed");
