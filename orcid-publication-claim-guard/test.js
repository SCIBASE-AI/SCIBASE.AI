const assert = require("assert");
const {
  evaluatePublicationClaims,
  normalizeDoi,
  normalizeText,
  scorePublicationClaim,
} = require("./index");
const {
  existingClaims,
  importedPublications,
  researchers,
} = require("./sample-data");

const primary = researchers[0];

assert.strictEqual(
  normalizeDoi("https://doi.org/10.5555/NORTHBRIDGE.2025.042"),
  "10.5555/northbridge.2025.042"
);
assert.strictEqual(normalizeText("Ada M. Kim"), "ada m kim");

const exact = scorePublicationClaim(
  primary,
  importedPublications.find((item) => item.id === "pub-exact-orcid"),
  existingClaims
);
assert.strictEqual(exact.decision, "auto_accept");
assert.ok(exact.score >= 72);
assert.ok(exact.evidence.some((entry) => entry.includes("exact ORCID")));

const homonym = scorePublicationClaim(
  primary,
  importedPublications.find((item) => item.id === "pub-homonym-orcid-mismatch"),
  existingClaims
);
assert.strictEqual(homonym.decision, "quarantine");
assert.ok(homonym.blockers.some((entry) => entry.includes("different ORCID")));

const weak = scorePublicationClaim(
  primary,
  importedPublications.find((item) => item.id === "pub-weak-but-reviewable"),
  existingClaims
);
assert.strictEqual(weak.decision, "review");
assert.ok(weak.score > 30);
assert.ok(weak.actions.some((entry) => entry.includes("reviewer approval")));

const duplicate = scorePublicationClaim(
  primary,
  importedPublications.find((item) => item.id === "pub-duplicate-doi"),
  existingClaims
);
assert.strictEqual(duplicate.decision, "quarantine");
assert.ok(duplicate.blockers.some((entry) => entry.includes("already claimed")));

const retracted = scorePublicationClaim(
  primary,
  importedPublications.find((item) => item.id === "pub-retracted"),
  existingClaims
);
assert.strictEqual(retracted.decision, "quarantine");
assert.ok(retracted.actions.some((entry) => entry.includes("profile metrics")));

const report = evaluatePublicationClaims({
  researcher: primary,
  publications: importedPublications,
  existingClaims,
});
assert.deepStrictEqual(report.summary, {
  total: 5,
  auto_accept: 1,
  review: 1,
  quarantine: 3,
});
assert.strictEqual(report.decisions[0].auditDigest.length, 64);

console.log("orcid publication claim guard tests passed");
