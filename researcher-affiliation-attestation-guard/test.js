const assert = require("assert");

const { assessAffiliationAttestation, normalizeProfile } = require("./index");
const { trustedProfile, riskyProfile } = require("./sample-data");

const clean = assessAffiliationAttestation(trustedProfile, { asOf: "2026-06-01" });
assert.strictEqual(clean.decision, "release");
assert.strictEqual(clean.summary.findings, 0);
assert.strictEqual(clean.summary.publicAffiliations, 1);

const risky = assessAffiliationAttestation(riskyProfile, { asOf: "2026-06-01" });
assert.strictEqual(risky.decision, "hold");
for (const code of [
  "PUBLIC_PROFILE_WITHOUT_ORCID",
  "UNTRUSTED_AFFILIATION_SOURCE",
  "EXPIRED_PUBLIC_AFFILIATION",
  "AFFILIATION_DOMAIN_MISMATCH",
  "AFFILIATION_WITHOUT_EVIDENCE",
  "MULTIPLE_ACTIVE_PUBLIC_INSTITUTIONS",
  "GRANT_WITHOUT_PUBLIC_CONSENT",
  "GRANT_WITHOUT_EVIDENCE",
  "UNVERIFIED_AFFILIATION_USED_FOR_INVITES",
  "UNVERIFIED_GRANT_USED_FOR_REPUTATION",
]) {
  assert(risky.findings.some((finding) => finding.code === code), `missing ${code}`);
}

const reviseOnly = assessAffiliationAttestation({
  ...trustedProfile,
  affiliations: trustedProfile.affiliations.map((affiliation) => ({ ...affiliation, evidenceRefs: [] })),
  trustInputs: { ...trustedProfile.trustInputs, useAffiliationsForInvites: false },
});
assert.strictEqual(reviseOnly.decision, "revise");
assert(reviseOnly.findings.some((finding) => finding.code === "AFFILIATION_WITHOUT_EVIDENCE"));

assert.throws(
  () => normalizeProfile({ ...trustedProfile, researcherId: "" }),
  /researcherId must be a non-empty string/
);

console.log("researcher affiliation attestation guard tests passed");
