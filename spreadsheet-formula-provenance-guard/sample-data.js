const digestA = "a".repeat(64);
const digestB = "b".repeat(64);
const digestC = "c".repeat(64);

const cleanSpreadsheet = {
  datasetId: "dataset-climate-yield-001",
  filename: "climate-yield-model.xlsx",
  uploadedAt: "2026-06-01T19:00:00Z",
  sha256: digestA,
  macroEnabled: false,
  externalLinks: [],
  exports: [
    { format: "csv", path: "exports/climate-yield-model.csv", sha256: digestB },
    { format: "parquet", path: "exports/climate-yield-model.parquet", sha256: digestC },
  ],
  sheets: [
    {
      name: "observations",
      hidden: false,
      purpose: "Raw normalized observations",
      cells: [
        { address: "A2", cachedValue: "MX-001", sourceRefs: ["instrument:station-mx-001"] },
        { address: "B2", cachedValue: 18.2, sourceRefs: ["instrument:station-mx-001"] },
      ],
    },
    {
      name: "model",
      hidden: false,
      purpose: "Derived yield score",
      cells: [
        {
          address: "D2",
          formula: "=ROUND(observations!B2*1.8,2)",
          cachedValue: 32.76,
          recalculatedAt: "2026-06-01T19:05:00Z",
          sourceRefs: ["observations!B2", "protocols/yield-transform-v3.md"],
        },
      ],
    },
  ],
};

const riskySpreadsheet = {
  datasetId: "dataset-fragile-xlsx-002",
  filename: "fragile-field-results.xlsm",
  uploadedAt: "2026-06-01T19:00:00Z",
  sha256: "not-a-digest",
  macroEnabled: true,
  externalLinks: ["../lab-shared/master-calibration.xlsx"],
  exports: [
    { format: "xlsx", path: "exports/fragile-field-results.xlsx", sha256: "bad-export-digest" },
  ],
  sheets: [
    {
      name: "raw",
      hidden: false,
      purpose: "Raw observations",
      cells: [
        { address: "A2", cachedValue: "BR-204", sourceRefs: [] },
      ],
    },
    {
      name: "hidden-calibration",
      hidden: true,
      purpose: "Undocumented calibration",
      cells: [
        {
          address: "C7",
          formula: "='[master-calibration.xlsx]Sheet1'!B4+RAND()",
          cachedValue: null,
          recalculatedAt: "",
          sourceRefs: [],
        },
        {
          address: "C8",
          formula: "=WEBSERVICE(\"https://example.invalid/current-factor\")",
          cachedValue: null,
          recalculatedAt: "",
          sourceRefs: [],
        },
      ],
    },
  ],
};

module.exports = {
  cleanSpreadsheet,
  riskySpreadsheet,
};
