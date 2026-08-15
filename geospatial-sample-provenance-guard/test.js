const assert = require("assert");
const { project } = require("./sample-data");
const {
  buildReviewPacket,
  countryBoundsMatch,
  evaluateGeospatialProvenance,
  renderMarkdownReport,
  renderSvgSummary
} = require("./index");

const evaluation = evaluateGeospatialProvenance(project);
const packet = buildReviewPacket(project);

assert.strictEqual(packet.guard, "geospatial-sample-provenance-guard");
assert.strictEqual(packet.issue, "SCIBASE-AI/SCIBASE.AI#17");
assert.strictEqual(packet.decision, "block-geospatial-graph-publication");

assert.ok(
  evaluation.findings.some((finding) => finding.rule === "sensitive-site-overprecise-public-coordinate"),
  "expected sensitive precision finding"
);
assert.ok(
  evaluation.findings.some((finding) => finding.rule === "coordinate-crs-not-normalized"),
  "expected CRS finding"
);
assert.ok(
  evaluation.findings.some((finding) => finding.rule === "country-coordinate-mismatch"),
  "expected country-coordinate mismatch finding"
);
assert.ok(
  evaluation.findings.some((finding) => finding.rule === "sample-voucher-missing"),
  "expected missing voucher finding"
);
assert.ok(
  evaluation.findings.some((finding) => finding.rule === "sample-dataset-edge-doi-mismatch"),
  "expected DOI edge mismatch finding"
);

assert.strictEqual(countryBoundsMatch(project, project.samples[0]), true);
assert.strictEqual(countryBoundsMatch(project, project.samples[1]), false);

const cleanProject = JSON.parse(JSON.stringify(project));
cleanProject.samples = [
  {
    id: "sample-clean-1",
    label: "General plant trait sample",
    country: "Kenya",
    latitude: -0.273,
    longitude: 36.071,
    crs: "EPSG:4326",
    precisionDecimals: 3,
    collectionDate: "2026-04-12",
    datasetDoi: "10.5281/zenodo.2026052201",
    voucherId: "EAH-2026-0412",
    labels: [],
    publicRecommendation: true
  },
  {
    id: "sample-clean-2",
    label: "Basalt reference swab",
    country: "Iceland",
    latitude: 64.145,
    longitude: -21.942,
    crs: "EPSG:4326",
    precisionDecimals: 3,
    collectionDate: "2026-03-04",
    datasetDoi: "10.5281/zenodo.2026052202",
    voucherId: "IS-NHM-7781",
    labels: [],
    publicRecommendation: true
  }
];
cleanProject.edges = [
  { id: "edge-clean-1", from: "sample-clean-1", to: "dataset-kenya-plant", predicate: "includedInDataset" },
  { id: "edge-clean-2", from: "sample-clean-2", to: "dataset-peru-water", predicate: "includedInDataset" }
];

const cleanPacket = buildReviewPacket(cleanProject);
assert.strictEqual(cleanPacket.decision, "geospatial-provenance-ready");
assert.strictEqual(cleanPacket.findings.length, 0);

const duplicateDoiProject = JSON.parse(JSON.stringify(cleanProject));
duplicateDoiProject.datasets.push({
  id: "dataset-duplicate-doi",
  doi: duplicateDoiProject.datasets[0].doi,
  title: "Ambiguous duplicate DOI dataset",
  license: "CC-BY-4.0"
});
const duplicateDoiPacket = buildReviewPacket(duplicateDoiProject);
assert.strictEqual(duplicateDoiPacket.decision, "block-geospatial-graph-publication");
assert.ok(
  duplicateDoiPacket.findings.some((finding) => finding.rule === "dataset-doi-duplicate"),
  "expected duplicate DOI provenance to block publication"
);

const invalidCollectionProject = JSON.parse(JSON.stringify(cleanProject));
invalidCollectionProject.samples[0].collectionDate = "not-a-date";
const invalidCollectionPacket = buildReviewPacket(invalidCollectionProject);
assert.strictEqual(invalidCollectionPacket.decision, "block-geospatial-graph-publication");
assert.ok(
  invalidCollectionPacket.findings.some((finding) => finding.rule === "collection-date-invalid"),
  "expected invalid collection date to block publication"
);

const unknownCountryProject = JSON.parse(JSON.stringify(cleanProject));
unknownCountryProject.samples[0].country = "Unconfigured-country";
const unknownCountryPacket = buildReviewPacket(unknownCountryProject);
assert.strictEqual(unknownCountryPacket.decision, "block-geospatial-graph-publication");
assert.ok(
  unknownCountryPacket.findings.some((finding) => finding.rule === "country-bounds-unavailable"),
  "expected public recommendation without country bounds to block publication"
);

const duplicateEdgeProject = JSON.parse(JSON.stringify(cleanProject));
duplicateEdgeProject.edges.push({ ...duplicateEdgeProject.edges[0], id: "edge-duplicate-relation" });
const duplicateEdgePacket = buildReviewPacket(duplicateEdgeProject);
assert.strictEqual(duplicateEdgePacket.decision, "hold-geospatial-edges-for-curator-review");
assert.ok(
  duplicateEdgePacket.findings.some((finding) => finding.rule === "graph-edge-duplicate"),
  "expected duplicate relation to require curator review"
);

const markdown = renderMarkdownReport(packet);
assert.ok(markdown.includes("## Findings"));
assert.ok(markdown.includes("sensitive-site-overprecise-public-coordinate"));

const svg = renderSvgSummary(packet);
assert.ok(svg.includes("<svg"));
assert.ok(svg.includes("Geospatial Sample Provenance Guard"));

console.log("geospatial-sample-provenance-guard tests passed");
