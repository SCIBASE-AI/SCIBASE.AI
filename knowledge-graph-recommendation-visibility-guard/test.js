"use strict"

const assert = require("node:assert/strict")
const { assessRecommendationVisibility } = require("./index")

const baseNodes = [
  { id: "concept-crispr", type: "concept", title: "CRISPR screen", visibility: "public" },
  {
    id: "dataset-neuro-1",
    type: "dataset",
    title: "Neuro screen dataset",
    visibility: "institutional",
    institutionId: "north-lab",
  },
  {
    id: "paper-embargo",
    type: "paper",
    title: "Embargoed methods paper",
    visibility: "embargoed",
    embargoUntil: "2026-06-01T00:00:00Z",
  },
  {
    id: "restricted-cohort",
    type: "dataset",
    title: "Human cohort export",
    visibility: "restricted",
    requiredConsentId: "consent-human-1",
    licenseId: "license-cohort-1",
    clearanceTag: "irb-approved",
  },
]

const baseEvidence = [
  { id: "ev-open", access: "public" },
  { id: "ev-institution", access: "institutional", institutionId: "north-lab" },
  {
    id: "ev-restricted",
    access: "restricted",
    requiredConsentId: "consent-human-1",
    licenseId: "license-cohort-1",
    clearanceTag: "irb-approved",
  },
]

{
  const result = assessRecommendationVisibility({
    now: "2026-05-20T10:00:00Z",
    actor: { id: "ada", role: "researcher", institutionId: "north-lab" },
    nodes: baseNodes,
    evidence: baseEvidence,
    recommendations: [
      {
        id: "rec-safe",
        title: "CRISPR dataset to protocol route",
        score: 0.91,
        nodeIds: ["concept-crispr", "dataset-neuro-1"],
        evidenceIds: ["ev-open", "ev-institution"],
      },
      {
        id: "rec-embargo",
        title: "Embargoed method recommendation",
        score: 0.95,
        nodeIds: ["paper-embargo"],
        evidenceIds: ["ev-open"],
      },
    ],
  })

  assert.equal(result.status, "guarded")
  assert.equal(result.visibleCount, 1)
  assert.equal(result.suppressedCount, 1)
  assert.equal(result.visibleRecommendations[0].id, "rec-safe")
  assert.ok(result.suppressedRecommendations[0].blockers[0].includes("embargoed until"))
  assert.match(result.auditDigest, /^[0-9a-f]{64}$/)
}

{
  const result = assessRecommendationVisibility({
    now: "2026-05-20T10:00:00Z",
    actor: {
      id: "ben",
      role: "researcher",
      institutionId: "north-lab",
      consentIds: ["consent-human-1"],
      licenseIds: ["license-cohort-1"],
      clearanceTags: ["irb-approved"],
    },
    nodes: baseNodes,
    evidence: baseEvidence,
    recommendations: [
      {
        id: "rec-restricted",
        title: "Restricted cohort reuse recommendation",
        score: 0.82,
        nodeIds: ["restricted-cohort"],
        evidenceIds: ["ev-restricted"],
      },
    ],
  })

  assert.equal(result.status, "ready")
  assert.equal(result.visibleCount, 1)
  assert.equal(result.suppressedCount, 0)
}

{
  const result = assessRecommendationVisibility({
    now: "2026-07-01T10:00:00Z",
    actor: { id: "cy", role: "researcher", institutionId: "north-lab" },
    nodes: baseNodes,
    evidence: baseEvidence,
    recommendations: [
      {
        id: "rec-expired-embargo",
        title: "Recently released methods route",
        score: 0.77,
        nodeIds: ["paper-embargo"],
        evidenceIds: ["ev-open"],
      },
    ],
  })

  assert.equal(result.status, "needs-review")
  assert.equal(result.visibleCount, 1)
  assert.ok(result.visibleRecommendations[0].warnings.some((warning) => warning.includes("embargo has expired")))
  assert.equal(result.curatorActions[0].action, "confirm-release-metadata")
}

{
  const result = assessRecommendationVisibility({
    now: "2026-05-20T10:00:00Z",
    actor: { id: "dee", role: "researcher", institutionId: "south-lab" },
    nodes: baseNodes,
    evidence: baseEvidence,
    recommendations: [
      {
        id: "rec-missing",
        title: "Broken recommendation",
        score: 0.9,
        nodeIds: ["dataset-neuro-1", "missing-node"],
        evidenceIds: ["missing-evidence"],
      },
    ],
  })

  assert.equal(result.status, "guarded")
  assert.ok(result.suppressedRecommendations[0].blockers.includes("node dataset-neuro-1 requires institution north-lab"))
  assert.ok(result.suppressedRecommendations[0].blockers.includes("missing graph node missing-node"))
  assert.ok(result.suppressedRecommendations[0].blockers.includes("missing evidence missing-evidence"))
}

console.log("knowledge-graph-recommendation-visibility-guard tests passed")
