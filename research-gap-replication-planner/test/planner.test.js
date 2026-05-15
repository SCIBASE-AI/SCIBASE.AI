import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  auditHash,
  createResearchAssistantPlan,
  rankResearchOpportunities,
  reviewManuscript,
  scoreReproducibility,
} from "../src/planner.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sample = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "sample", "corpus.json"), "utf8"))

const opportunities = rankResearchOpportunities(sample)
assert.equal(opportunities[0].topic, "alzheimer + crispr + single-cell")
assert.equal(opportunities[0].decision, "prioritize")
assert.ok(opportunities[0].rationale.includes("low replication count"))
assert.ok(opportunities[0].rationale.includes("fits lab capabilities"))

const review = reviewManuscript(sample.manuscripts[0])
assert.equal(review.recommendation, "hold")
assert.equal(review.findings[0].category, "claims-vs-evidence")
assert.equal(review.findings[0].message, "Claim has no supporting evidence artifact.")
assert.ok(review.findings.some((finding) => finding.category === "statistical-risk"))

const weakRepro = scoreReproducibility(sample.projects[0], sample.reproducibilityAttempts)
assert.equal(weakRepro.status, "hold")
assert.ok(weakRepro.missingArtifacts.includes("environmentLock"))
assert.ok(weakRepro.priorAttempts.some((attempt) => attempt.outcome === "failed"))

const strongRepro = scoreReproducibility(sample.projects[1], sample.reproducibilityAttempts)
assert.equal(strongRepro.status, "ready")
assert.equal(strongRepro.missingArtifacts.length, 0)

const plan = createResearchAssistantPlan(sample)
assert.equal(plan.status, "hold")
assert.equal(plan.requirementCoverage.autoPeerReviewReports, true)
assert.equal(plan.requirementCoverage.claimsVsEvidenceAlignment, true)
assert.equal(plan.requirementCoverage.reproducibilityConfidence, true)
assert.equal(plan.requirementCoverage.previousAttemptLinks, true)
assert.equal(plan.requirementCoverage.researchGapFinder, true)
assert.equal(plan.requirementCoverage.personalizedOpportunityFeed, true)
assert.match(plan.auditHash, /^[a-f0-9]{64}$/)
assert.equal(auditHash({ b: 2, a: 1 }), auditHash({ a: 1, b: 2 }))

console.log("research-gap-replication-planner tests passed")
