import assert from "node:assert/strict"
import { evaluateSimilarityTriage } from "./index.js"
import { similarityTriageInput } from "./sample-data.js"

const evaluation = evaluateSimilarityTriage(similarityTriageInput)

assert.equal(evaluation.summary.status, "hold_similarity_review")
assert.equal(evaluation.summary.passagesReviewed, 4)
assert.equal(evaluation.summary.sourcesCompared, 5)
assert.equal(evaluation.summary.heldPassages, 2)
assert.equal(evaluation.summary.revisePassages, 1)
assert.equal(evaluation.summary.clearPassages, 1)
assert.equal(evaluation.summary.acceptedMethodsBoilerplate, 1)
assert.equal(evaluation.summary.criticalFindings, 2)
assert.equal(evaluation.summary.warningFindings, 1)
assert.match(evaluation.auditDigest, /^[a-f0-9]{64}$/)

const codes = evaluation.reviewerActions.map((action) => action.code)
assert.ok(codes.includes("uncited_high_similarity"))
assert.ok(codes.includes("self_overlap_disclosure_missing"))
assert.ok(codes.includes("retracted_source_similarity"))

const methodsPassage = evaluation.passages.find((passage) => passage.passageId === "p-methods-01")
assert.equal(methodsPassage.status, "clear")
assert.equal(methodsPassage.acceptedBoilerplate.length, 1)

const introPassage = evaluation.passages.find((passage) => passage.passageId === "p-intro-01")
assert.equal(introPassage.status, "hold")

console.log("manuscript similarity triage tests passed")
