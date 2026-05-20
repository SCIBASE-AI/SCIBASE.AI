"use strict"

const { assessRecommendationVisibility } = require("./index")

const result = assessRecommendationVisibility({
  now: "2026-05-20T10:00:00Z",
  actor: {
    id: "researcher-ada",
    role: "researcher",
    institutionId: "north-lab",
    consentIds: ["consent-human-1"],
    licenseIds: [],
    clearanceTags: ["irb-approved"],
  },
  nodes: [
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
  ],
  evidence: [
    { id: "ev-open", access: "public" },
    { id: "ev-institution", access: "institutional", institutionId: "north-lab" },
    {
      id: "ev-restricted",
      access: "restricted",
      requiredConsentId: "consent-human-1",
      licenseId: "license-cohort-1",
      clearanceTag: "irb-approved",
    },
  ],
  recommendations: [
    {
      id: "rec-visible",
      title: "Public concept to institutional dataset route",
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
    {
      id: "rec-restricted",
      title: "Restricted cohort reuse recommendation",
      score: 0.86,
      nodeIds: ["restricted-cohort"],
      evidenceIds: ["ev-restricted"],
    },
  ],
})

console.log("Knowledge Graph Recommendation Visibility Guard Demo")
console.log("===================================================")
console.log(`status: ${result.status}`)
console.log(`visible recommendations: ${result.visibleCount}`)
console.log(`suppressed recommendations: ${result.suppressedCount}`)
console.log(`first visible: ${result.visibleRecommendations[0].title}`)
console.log(`first suppressed reason: ${result.suppressedRecommendations[0].blockers[0]}`)
console.log(`curator action: ${result.curatorActions[0].action}`)
console.log(`digest: ${result.auditDigest.slice(0, 16)}...`)
