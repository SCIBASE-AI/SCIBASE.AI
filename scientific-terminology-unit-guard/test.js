const assert = require("assert");

const { assessTerminologyAndUnits, normalizeDocument } = require("./index");
const { cleanDocument, riskyDocument } = require("./sample-data");

const clean = assessTerminologyAndUnits(cleanDocument);
assert.strictEqual(clean.decision, "release");
assert.strictEqual(clean.summary.findings, 0);

const risky = assessTerminologyAndUnits(riskyDocument);
assert.strictEqual(risky.decision, "hold");
for (const code of [
  "MISSING_FIRST_USE_EXPANSION",
  "ACRONYM_DRIFT",
  "UNIT_CONFLICT",
  "VARIABLE_MEANING_DRIFT",
  "UNREGISTERED_VARIABLE",
]) {
  assert(risky.findings.some((finding) => finding.code === code), `missing ${code}`);
}

const unknown = assessTerminologyAndUnits({
  ...cleanDocument,
  blocks: [
    {
      id: "new-block",
      author: "eve",
      text: "New metric ABC is introduced.",
      acronyms: [{ short: "ABC", long: "adaptive binding coefficient" }],
      units: [{ quantity: "bindingRate", unit: "s^-1" }],
      variables: [],
    },
  ],
  suggestions: [],
});
assert.strictEqual(unknown.decision, "revise");
assert(unknown.findings.some((finding) => finding.code === "UNKNOWN_ACRONYM"));
assert(unknown.findings.some((finding) => finding.code === "UNKNOWN_QUANTITY_UNIT"));

assert.throws(
  () => normalizeDocument({ ...cleanDocument, documentId: "" }),
  /documentId must be a non-empty string/
);

console.log("scientific terminology and unit guard tests passed");
