const previousVersion = {
  datasetId: "ds-cell-response-042",
  version: "2026.04",
  title: "Cell response assay normalized table",
  license: "CC-BY-4.0",
  doi: "10.5555/scibase.cell-response.042",
  schema: [
    { name: "sample_id", type: "string", role: "identifier", required: true, nullable: false },
    { name: "donor_group", type: "string", role: "category", required: true, nullable: false, allowedValues: ["control", "treated"] },
    { name: "dose_mg", type: "number", role: "measure", unit: "mg", required: true, nullable: false },
    { name: "response_score", type: "number", role: "measure", unit: "normalized_score", required: true, nullable: false },
    { name: "assay_date", type: "date", role: "timestamp", required: true, nullable: false }
  ]
};

const nextVersion = {
  datasetId: "ds-cell-response-042",
  version: "2026.05",
  title: "Cell response assay normalized table",
  license: "CC-BY-4.0",
  doi: "10.5555/scibase.cell-response.042",
  schema: [
    { name: "sample_id", type: "string", role: "identifier", required: true, nullable: false },
    { name: "cohort", previousNames: ["donor_group"], type: "string", role: "category", required: true, nullable: false, allowedValues: ["control", "treated", "washout"] },
    { name: "dose_ug", previousNames: ["dose_mg"], type: "number", role: "measure", unit: "ug", required: true, nullable: false },
    { name: "response_score", type: "integer", role: "measure", unit: "normalized_score", required: true, nullable: false },
    { name: "assay_date", type: "date", role: "timestamp", required: true, nullable: false },
    { name: "instrument_batch", type: "string", role: "category", required: false, nullable: true }
  ]
};

const consumers = [
  {
    id: "preview-table-v2",
    kind: "preview",
    description: "Metadata-aware table preview",
    requiredFields: ["sample_id", "response_score", "assay_date"],
    acceptedTypes: { sample_id: ["string"], response_score: ["number", "integer"], assay_date: ["date"] },
    toleratedUnitConversions: {}
  },
  {
    id: "public-api-normalized-response",
    kind: "api",
    description: "Public API endpoint for normalized response scores",
    requiredFields: ["sample_id", "donor_group", "dose_mg", "response_score"],
    acceptedTypes: {
      sample_id: ["string"],
      donor_group: ["string"],
      dose_mg: ["number"],
      response_score: ["number"]
    },
    toleratedUnitConversions: { "dose_mg->dose_ug": "multiply by 1000" }
  },
  {
    id: "notebook-rerun-dose-response",
    kind: "rerun",
    description: "Notebook rerun for dose response figure regeneration",
    requiredFields: ["sample_id", "dose_mg", "response_score"],
    acceptedTypes: { sample_id: ["string"], dose_mg: ["number"], response_score: ["number"] },
    toleratedUnitConversions: {}
  }
];

module.exports = {
  previousVersion,
  nextVersion,
  consumers
};
