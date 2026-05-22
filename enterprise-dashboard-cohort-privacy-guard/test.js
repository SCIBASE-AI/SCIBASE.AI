const assert = require("node:assert/strict")
const { evaluateDashboardPrivacy } = require("./index")
const { dashboards, organization, privacyPolicy } = require("./sample-data")

const packet = evaluateDashboardPrivacy({
  asOf: "2026-05-23T00:00:00.000Z",
  organization,
  dashboards,
  policy: privacyPolicy,
})

assert.equal(packet.summary.totalWidgets, 4)
assert.equal(packet.summary.totalRows, 8)
assert.equal(packet.summary.hold_for_privacy_review, 1)
assert.equal(packet.summary.masked_ready, 3)
assert.equal(packet.summary.ready, 0)
assert.equal(packet.summary.suppressedRows, 1)
assert.equal(packet.summary.maskedRows, 3)
assert.equal(packet.summary.blockedRawExports, 1)

const heatmap = packet.dashboards.find((dashboard) => dashboard.id === "contributor-heatmap")
assert.equal(heatmap.status, "hold_for_privacy_review")

const privateOncology = heatmap.rowDecisions.find((row) => row.rowId === "heatmap-private-oncology")
assert.equal(privateOncology.action, "suppress")
assert.equal(privateOncology.exportDecision, "block_raw_export")
assert.equal(privateOncology.publicValue, null)
assert(privateOncology.findings.some((finding) => finding.code === "small_cohort"))
assert(privateOncology.findings.some((finding) => finding.code === "direct_identifier_block"))
assert(privateOncology.findings.some((finding) => finding.code === "named_contributor_reidentification"))

const collaboration = packet.dashboards.find((dashboard) => dashboard.id === "cross-lab-collaboration")
const materialsBio = collaboration.rowDecisions.find((row) => row.rowId === "collab-materials-bio")
assert.equal(materialsBio.action, "roll_up")
assert.equal(materialsBio.publicLabel, "Institution collaboration aggregate")
assert(materialsBio.findings.some((finding) => finding.code === "cross_lab_rollup_needed"))

const compliance = packet.dashboards.find((dashboard) => dashboard.id === "compliance-open-access")
const institutionTotal = compliance.rowDecisions.find((row) => row.rowId === "oa-institution-total")
assert.equal(institutionTotal.action, "publish")
assert.equal(institutionTotal.exportDecision, "allow_sanitized_export")

const rawExportManifest = packet.exportManifest.find((manifest) => manifest.dashboardId === "contributor-heatmap")
assert.equal(rawExportManifest.status, "raw_export_blocked")
assert.deepEqual(rawExportManifest.allowedTargets, ["dashboard"])
assert.deepEqual(rawExportManifest.blockedRows, ["heatmap-private-oncology"])

const repeated = evaluateDashboardPrivacy({
  asOf: "2026-05-23T00:00:00.000Z",
  organization,
  dashboards,
  policy: privacyPolicy,
})
assert.equal(repeated.audit.digest, packet.audit.digest)

const lenient = evaluateDashboardPrivacy({
  asOf: "2026-05-23T00:00:00.000Z",
  organization,
  dashboards: [dashboards[0]],
  policy: {
    ...privacyPolicy,
    minCohortSize: 3,
    minNamedContributorCount: 2,
  },
})
const lenientPrivateRow = lenient.dashboards[0].rowDecisions.find((row) => row.rowId === "heatmap-private-oncology")
assert.equal(lenientPrivateRow.action, "suppress")
assert(lenientPrivateRow.findings.some((finding) => finding.code === "direct_identifier_block"))

console.log("enterprise dashboard cohort privacy guard tests passed")
