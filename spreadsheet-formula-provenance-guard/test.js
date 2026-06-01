const assert = require("assert");

const { assessSpreadsheetProvenance, normalizeSpreadsheet } = require("./index");
const { cleanSpreadsheet, riskySpreadsheet } = require("./sample-data");

const clean = assessSpreadsheetProvenance(cleanSpreadsheet);
assert.strictEqual(clean.decision, "release");
assert.strictEqual(clean.summary.findings, 0);
assert.strictEqual(clean.summary.formulaCellsReviewed, 1);

const risky = assessSpreadsheetProvenance(riskySpreadsheet);
assert.strictEqual(risky.decision, "hold");
for (const code of [
  "INVALID_SPREADSHEET_DIGEST",
  "MACRO_ENABLED_DATASET",
  "EXTERNAL_WORKBOOK_LINKS",
  "HIDDEN_SHEET_WITH_DATA",
  "VOLATILE_FORMULA",
  "FORMULA_EXTERNAL_REFERENCE",
  "STALE_OR_MISSING_CALCULATION_EVIDENCE",
  "FORMULA_WITHOUT_PROVENANCE",
  "MISSING_NORMALIZED_EXPORT",
  "INVALID_EXPORT_DIGEST",
]) {
  assert(risky.findings.some((finding) => finding.code === code), `missing ${code}`);
}

const reviseOnly = assessSpreadsheetProvenance({
  ...cleanSpreadsheet,
  sheets: cleanSpreadsheet.sheets.map((sheet) =>
    sheet.name === "model"
      ? {
          ...sheet,
          cells: sheet.cells.map((cell) => ({ ...cell, recalculatedAt: "" })),
        }
      : sheet
  ),
});
assert.strictEqual(reviseOnly.decision, "revise");
assert(reviseOnly.findings.some((finding) => finding.code === "STALE_OR_MISSING_CALCULATION_EVIDENCE"));

assert.throws(
  () => normalizeSpreadsheet({ ...cleanSpreadsheet, datasetId: "" }),
  /datasetId must be a non-empty string/
);

console.log("spreadsheet formula provenance guard tests passed");
