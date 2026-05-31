const assert = require("assert");
const graph = require("./sample-data");
const { inspectOrganismBoundaryGraph } = require("./index");

const report = inspectOrganismBoundaryGraph(graph);

function edge(id) {
  return report.edgeDecisions.find((item) => item.edgeId === id);
}

function recommendation(id) {
  return report.recommendationDecisions.find((item) => item.recommendationId === id);
}

assert.strictEqual(report.summary.edgeCount, 5);
assert.strictEqual(report.summary.edgeAllow, 2);
assert.strictEqual(report.summary.edgeReview, 1);
assert.strictEqual(report.summary.edgeSuppress, 2);
assert.strictEqual(report.summary.recommendationCount, 3);
assert.strictEqual(report.summary.recommendationShow, 1);
assert.strictEqual(report.summary.recommendationNotice, 1);
assert.strictEqual(report.summary.recommendationSuppress, 1);

assert.strictEqual(edge("edge:human-sample-organism").decision, "allow");
assert.strictEqual(edge("edge:hela-human-cell-line").decision, "allow");

const strainEdge = edge("edge:balbc-strain-human-parent");
assert.strictEqual(strainEdge.decision, "suppress");
assert(
  strainEdge.blockers.some((item) => item.code === "strain_parent_taxon_mismatch"),
  "BALB/c strain must not map to human parent organism"
);

const hostEdge = edge("edge:pathogen-mouse-host");
assert.strictEqual(hostEdge.decision, "suppress");
assert(
  hostEdge.blockers.some((item) => item.code === "host_taxon_not_supported"),
  "unsupported pathogen host taxon must suppress the edge"
);

const mixedEdge = edge("edge:mixed-sample-dataset");
assert.strictEqual(mixedEdge.decision, "curator_review");
assert(
  mixedEdge.warnings.some((item) => item.code === "mixed_organism_review_missing"),
  "mixed-organism sample should require contamination or co-culture review"
);

assert.strictEqual(recommendation("rec:human-cell-line-context").decision, "show");
assert.strictEqual(recommendation("rec:bad-strain-parent").decision, "suppress");
assert(
  recommendation("rec:bad-strain-parent").blockers.some(
    (item) => item.code === "path_contains_suppressed_edge"
  ),
  "recommendations using suppressed biological edges should be blocked"
);
assert.strictEqual(recommendation("rec:mixed-sample-notice").decision, "show_with_notice");
assert(
  recommendation("rec:mixed-sample-notice").warnings.some(
    (item) => item.code === "path_contains_review_edge"
  ),
  "review-only biological edges should surface recommendation notices"
);

assert.strictEqual(report.jsonLd["@type"], "scibase:OrganismBoundaryReviewPacket");
assert.match(report.auditDigest, /^[a-f0-9]{64}$/);

console.log("organism strain boundary guard tests passed");
