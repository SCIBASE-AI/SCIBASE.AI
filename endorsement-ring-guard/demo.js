"use strict"

const { analyzeEndorsements } = require("./index")

const result = analyzeEndorsements({
  users: [
    { id: "ada", institution: "North Lab" },
    { id: "ben", institution: "North Lab" },
    { id: "cy", institution: "North Lab" },
    { id: "dee", institution: "East Institute" },
    { id: "eli", institution: "West Bio" },
  ],
  evidence: [
    { id: "ev-review-1", type: "peer-review" },
    { id: "ev-code-1", type: "code-commit" },
    { id: "ev-repro-1", type: "reproducibility" },
  ],
  endorsements: [
    { from: "ada", to: "eli", evidenceId: "ev-review-1", weight: 2, institution: "North Lab" },
    { from: "ben", to: "eli", evidenceId: "missing", weight: 2, institution: "North Lab" },
    { from: "cy", to: "eli", evidenceId: "ev-code-1", weight: 2, institution: "North Lab" },
    { from: "dee", to: "ada", evidenceId: "ev-repro-1", weight: 3, institution: "East Institute" },
  ],
})

console.log("Endorsement Ring Guard Demo")
console.log("===========================")
console.log(`status: ${result.status}`)
console.log(`accepted endorsements: ${result.acceptedCount}`)
console.log(`held endorsements: ${result.heldCount}`)
console.log(`top hold: ${result.holds[0].type}`)
console.log(`top action: ${result.reviewerActions[0]}`)
console.log(`digest: ${result.auditDigest.slice(0, 16)}...`)
