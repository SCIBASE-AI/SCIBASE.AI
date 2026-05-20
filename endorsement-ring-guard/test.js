"use strict"

const assert = require("node:assert/strict")
const { analyzeEndorsements } = require("./index")

const users = [
  { id: "ada", institution: "North Lab" },
  { id: "ben", institution: "North Lab" },
  { id: "cy", institution: "North Lab" },
  { id: "dee", institution: "East Institute" },
  { id: "eli", institution: "West Bio" },
]

const evidence = [
  { id: "ev-review-1", type: "peer-review" },
  { id: "ev-code-1", type: "code-commit" },
  { id: "ev-repro-1", type: "reproducibility" },
]

{
  const result = analyzeEndorsements({
    users,
    evidence,
    endorsements: [
      { from: "ada", to: "eli", evidenceId: "ev-review-1", weight: 2, institution: "North Lab" },
      { from: "dee", to: "eli", evidenceId: "ev-repro-1", weight: 3, institution: "East Institute" },
    ],
  })

  assert.equal(result.status, "ready")
  assert.equal(result.acceptedCount, 2)
  assert.equal(result.heldCount, 0)
  assert.deepEqual(result.reputationDeltas, [{ userId: "eli", delta: 5 }])
  assert.match(result.auditDigest, /^[0-9a-f]{64}$/)
}

{
  const result = analyzeEndorsements({
    users,
    evidence,
    endorsements: [
      { from: "ada", to: "ben", evidenceId: "ev-review-1", weight: 2, institution: "North Lab" },
      { from: "ben", to: "ada", evidenceId: "ev-code-1", weight: 2, institution: "North Lab" },
      { from: "cy", to: "cy", evidenceId: "ev-repro-1", weight: 1, institution: "North Lab" },
    ],
  })

  assert.equal(result.status, "needs-review")
  assert.equal(result.acceptedCount, 0)
  assert.ok(result.holds.some((hold) => hold.type === "reciprocal-endorsement"))
  assert.ok(result.holds.some((hold) => hold.type === "self-endorsement"))
}

{
  const result = analyzeEndorsements({
    users,
    evidence,
    endorsements: [
      { from: "ada", to: "eli", evidenceId: "ev-review-1", weight: 2, institution: "North Lab" },
      { from: "ben", to: "eli", evidenceId: "missing", weight: 2, institution: "North Lab" },
      { from: "cy", to: "eli", evidenceId: "ev-code-1", weight: 2, institution: "North Lab" },
    ],
  })

  assert.equal(result.status, "needs-review")
  assert.ok(result.holds.some((hold) => hold.type === "missing-evidence"))
  assert.ok(result.holds.some((hold) => hold.type === "institution-concentration"))
  assert.equal(result.reputationDeltas.length, 0)
}

{
  const result = analyzeEndorsements({
    users,
    evidence,
    endorsements: [{ from: "ada", to: "eli", evidenceId: "ev-review-1", weight: 9 }],
  })

  assert.equal(result.status, "blocked")
  assert.ok(result.blockers.includes("endorsement ada->eli has invalid weight"))
}

console.log("endorsement-ring-guard tests passed")
