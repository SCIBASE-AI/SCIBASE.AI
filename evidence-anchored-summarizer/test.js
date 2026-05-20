"use strict"

const assert = require("node:assert/strict")
const { buildSummary } = require("./index")

const input = {
  sourceId: "preprint-42",
  title: "Adaptive Sequencing for Rare Variant Detection",
  mode: "executive",
  evidence: [
    { id: "ev-objective", source: "abstract", locator: "sentence 1" },
    { id: "ev-methods", source: "methods", locator: "paragraph 3" },
    { id: "ev-results", source: "results", locator: "figure 2" },
    { id: "ev-limits", source: "discussion", locator: "paragraph 5" },
  ],
  claims: [
    {
      id: "claim-objective",
      section: "objective",
      kind: "context",
      text: "The study evaluates adaptive sequencing for rare variant detection.",
      evidenceIds: ["ev-objective"],
    },
    {
      id: "claim-method",
      section: "methods",
      kind: "method",
      text: "The pipeline compares targeted adaptive reads against baseline whole-genome sampling.",
      evidenceIds: ["ev-methods"],
    },
    {
      id: "claim-result",
      section: "results",
      kind: "finding",
      text: "Adaptive sequencing improves recall for low-frequency variants while reducing total reads.",
      evidenceIds: ["ev-results"],
    },
    {
      id: "claim-limit",
      section: "limitations",
      kind: "limitation",
      text: "The benchmark is limited to synthetic mixtures and needs external cohort validation.",
      evidenceIds: ["ev-limits"],
    },
  ],
}

{
  const summary = buildSummary(input)
  assert.equal(summary.status, "ready")
  assert.equal(summary.mode, "executive")
  assert.equal(summary.bullets.length, 4)
  assert.equal(summary.bullets[0].claimId, "claim-result")
  assert.deepEqual(summary.bullets[0].evidenceIds, ["ev-results"])
  assert.match(summary.evidenceDigest, /^[0-9a-f]{64}$/)
}

{
  const summary = buildSummary({
    ...input,
    mode: "layperson",
    claims: [
      ...input.claims,
      {
        id: "claim-stat",
        section: "results",
        kind: "finding",
        text: "The p < 0.05 regression result has a narrow confidence interval.",
        evidenceIds: ["ev-results"],
      },
    ],
  })
  const statBullet = summary.bullets.find((bullet) => bullet.claimId === "claim-stat")
  assert.ok(statBullet.text.includes("statistical signal"))
  assert.ok(statBullet.text.includes("trend analysis"))
  assert.ok(statBullet.text.includes("uncertainty range"))
}

{
  const summary = buildSummary({
    ...input,
    claims: [
      {
        id: "claim-unanchored",
        section: "results",
        kind: "finding",
        text: "Unsupported claim.",
        evidenceIds: [],
      },
      {
        id: "claim-missing",
        section: "methods",
        kind: "method",
        text: "Missing evidence claim.",
        evidenceIds: ["does-not-exist"],
      },
    ],
  })
  assert.equal(summary.status, "blocked")
  assert.ok(summary.blockers.includes("claim claim-unanchored has no evidence anchors"))
  assert.ok(summary.blockers.includes("claim claim-missing references missing evidence: does-not-exist"))
  assert.ok(summary.warnings.includes("missing objective claim in summary input"))
}

console.log("evidence-anchored-summarizer tests passed")
