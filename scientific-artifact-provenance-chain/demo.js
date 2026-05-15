"use strict";

const {
  buildProvenanceReceipt,
  buildRerunPlan,
  exportDataCite,
  exportJsonLd,
  validateProvenanceReceipt,
} = require("./index");

const receipt = buildProvenanceReceipt({
  projectId: "scibase:demo:soil-carbon",
  title: "Soil carbon notebook replay package",
  doi: "10.5555/scibase.soil-carbon.demo",
  license: "CC-BY-4.0",
  creators: ["SCIBASE demo researcher"],
  artifacts: [
    {
      path: "data/raw/soil_samples.csv",
      content: "plot,carbon_pct\nnorth,2.1\nsouth,1.8\n",
      license: "CC-BY-4.0",
      metadata: { variables: ["plot", "carbon_pct"], instrument: "field-sampling" },
    },
    {
      path: "notebooks/soil_carbon.ipynb",
      content: "{\"cells\":[{\"cell_type\":\"code\",\"source\":\"print('soil carbon')\"}]}",
      license: "MIT",
      metadata: { runtime: "python>=3.11", kernel: "python3" },
    },
    {
      path: "outputs/soil_summary.csv",
      content: "metric,value\nmean_carbon_pct,1.95\n",
      license: "CC-BY-4.0",
      derivedFrom: ["data/raw/soil_samples.csv", "notebooks/soil_carbon.ipynb"],
      metadata: { variables: ["metric", "value"] },
    },
    {
      path: "env/environment.yml",
      content: "name: soil-carbon\ndependencies:\n  - python=3.11\n  - pandas\n",
      kind: "environment",
    },
  ],
  activities: [
    {
      id: "activity:notebook-run",
      type: "notebook-replay",
      actor: "reviewer-workflow",
      command: "jupyter nbconvert --execute notebooks/soil_carbon.ipynb",
      environment: "env/environment.yml",
      used: ["data/raw/soil_samples.csv", "notebooks/soil_carbon.ipynb"],
      generated: ["outputs/soil_summary.csv"],
    },
  ],
});

console.log(JSON.stringify({
  validation: validateProvenanceReceipt(receipt),
  rerunPlan: buildRerunPlan(receipt),
  jsonLd: exportJsonLd(receipt),
  datacite: exportDataCite(receipt),
}, null, 2));