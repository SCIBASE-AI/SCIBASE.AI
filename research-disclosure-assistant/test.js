const assert = require("assert");

const { assessResearchDisclosures, normalizePacket } = require("./index");
const { cleanPacket, riskyPacket } = require("./sample-data");

const clean = assessResearchDisclosures(cleanPacket);
assert.strictEqual(clean.decision, "release");
assert.strictEqual(clean.summary.findings, 0);

const risky = assessResearchDisclosures(riskyPacket);
assert.strictEqual(risky.decision, "hold");
for (const code of [
  "MISSING_GRANT_IDENTIFIERS",
  "SPONSOR_ROLE_UNCLEAR",
  "UNDISCLOSED_INDUSTRY_RELATIONSHIP",
  "MISSING_COMPETING_INTEREST",
  "MISSING_AUTHOR_CONTRIBUTIONS",
  "ACKNOWLEDGED_SPONSOR_ROLE_MISMATCH",
  "MISSING_CORRESPONDING_AUTHOR",
]) {
  assert(risky.findings.some((finding) => finding.code === code), `missing ${code}`);
}

const noFunding = assessResearchDisclosures({
  ...cleanPacket,
  fundingStatement: { funders: [], grantIds: [], sponsorRole: "" },
});
assert.strictEqual(noFunding.decision, "hold");
assert(noFunding.findings.some((finding) => finding.code === "MISSING_FUNDER_STATEMENT"));

const orphanDisclosure = assessResearchDisclosures({
  ...cleanPacket,
  competingInterests: [
    ...cleanPacket.competingInterests,
    { authorId: "ghost", statement: "No competing interests declared." },
  ],
});
assert.strictEqual(orphanDisclosure.decision, "revise");
assert(orphanDisclosure.findings.some((finding) => finding.code === "ORPHAN_COMPETING_INTEREST"));

assert.throws(
  () => normalizePacket({ ...cleanPacket, manuscriptId: "" }),
  /manuscriptId must be a non-empty string/
);

console.log("research disclosure assistant tests passed");
