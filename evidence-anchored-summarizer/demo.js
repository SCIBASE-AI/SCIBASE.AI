"use strict"

const { buildSummary } = require("./index")

const summary = buildSummary({
  sourceId: "preprint-42",
  title: "Adaptive Sequencing for Rare Variant Detection",
  mode: "layperson",
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
})

console.log("Evidence-Anchored Summarizer Demo")
console.log("=================================")
console.log(`title: ${summary.title}`)
console.log(`mode: ${summary.mode}`)
console.log(`status: ${summary.status}`)
console.log(`headline: ${summary.headline}`)
console.log(`bullets: ${summary.bullets.length}`)
console.log(`top claim: ${summary.bullets[0].text}`)
console.log(`top evidence: ${summary.bullets[0].evidenceIds.join(", ")}`)
console.log(`digest: ${summary.evidenceDigest.slice(0, 16)}...`)
