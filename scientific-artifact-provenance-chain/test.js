"use strict";

const assert = require("assert");
const {
  buildProvenanceReceipt,
  buildRerunPlan,
  compareArtifactVersions,
  exportDataCite,
  exportJsonLd,
  inferArtifactKind,
  makeArtifactRecord,
  validateProvenanceReceipt,
} = require("./index");

function fixtureReceipt() {
  return buildProvenanceReceipt({
    projectId: "scibase:project:enzyme-kinetics",
    title: "Enzyme kinetics reproducibility bundle",
    doi: "10.5555/scibase.enzyme.2026",
    license: "CC-BY-4.0",
    creators: ["SCIBASE QA"],
    generatedAt: "2026-05-15T00:00:00.000Z",
    artifacts: [
      {
        path: "data/raw/assay.csv",
        content: "sample,rate\nA,1.2\nB,1.4\n",
        license: "CC-BY-4.0",
        metadata: { variables: ["sample", "rate"], instrument: "plate-reader" },
      },
      {
        path: "analysis/fit_model.py",
        content: "import csv\nprint('fit model')\n",
        license: "MIT",
        metadata: { runtime: "python>=3.11" },
      },
      {
        path: "results/fit.csv",
        content: "parameter,value\nkm,0.42\nvmax,1.8\n",
        license: "CC-BY-4.0",
        derivedFrom: ["data/raw/assay.csv", "analysis/fit_model.py"],
        metadata: { variables: ["parameter", "value"] },
      },
      {
        path: "env/environment.yml",
        content: "name: enzyme\nchannels: [conda-forge]\n",
        kind: "environment",
        metadata: { runtime: "conda" },
      },
    ],
    activities: [
      {
        id: "activity:fit",
        type: "analysis",
        actor: "workflow:enzyme-fit",
        command: "python analysis/fit_model.py data/raw/assay.csv results/fit.csv",
        environment: "env/environment.yml",
        used: ["data/raw/assay.csv", "analysis/fit_model.py"],
        generated: ["results/fit.csv"],
      },
    ],
  });
}

function testKindInference() {
  assert.equal(inferArtifactKind("raw/table.csv"), "dataset");
  assert.equal(inferArtifactKind("notebooks/model.ipynb"), "code");
  assert.equal(inferArtifactKind("figures/chart.svg"), "figure");
  assert.equal(inferArtifactKind("models/checkpoint.onnx"), "model");
  assert.equal(inferArtifactKind("Dockerfile"), "environment");
}

function testReceiptValidation() {
  const receipt = fixtureReceipt();
  const result = validateProvenanceReceipt(receipt);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.fairScore.score, 100);
  assert.ok(receipt.receiptId.startsWith("provenance:"));
}

function testMissingReferenceFailsValidation() {
  const receipt = buildProvenanceReceipt({
    projectId: "scibase:project:bad-ref",
    title: "Bad reference",
    license: "CC0-1.0",
    artifacts: [{ path: "data.csv", content: "x\n1\n", license: "CC0-1.0", metadata: { variables: ["x"] } }],
    activities: [{ id: "activity:missing", command: "python run.py", environment: "python:3.11", used: ["missing.csv"] }],
  });
  const result = validateProvenanceReceipt(receipt);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /missing\.csv/);
}

function testVersionDiff() {
  const previous = makeArtifactRecord({ path: "data.csv", content: "x\n1\n", license: "CC0-1.0" });
  const next = makeArtifactRecord({ path: "data.csv", content: "x\n1\n2\n", license: "CC0-1.0" });
  const diff = compareArtifactVersions(previous, next);
  assert.equal(diff.changed, true);
  assert.equal(diff.lineDelta, 1);
  assert.ok(diff.sizeDeltaBytes > 0);
}

function testExportsAndRerunPlan() {
  const receipt = fixtureReceipt();
  const jsonLd = exportJsonLd(receipt);
  const datacite = exportDataCite(receipt);
  const plan = buildRerunPlan(receipt);

  assert.equal(jsonLd["@type"], "schema:Dataset");
  assert.equal(jsonLd["schema:hasPart"].length, 4);
  assert.equal(datacite.identifiers[0].identifier, "10.5555/scibase.enzyme.2026");
  assert.equal(plan[0].ready, true);
  assert.deepEqual(plan[0].outputs, ["results/fit.csv"]);
}

function run() {
  testKindInference();
  testReceiptValidation();
  testMissingReferenceFailsValidation();
  testVersionDiff();
  testExportsAndRerunPlan();
  console.log("scientific-artifact-provenance-chain tests passed");
}

run();