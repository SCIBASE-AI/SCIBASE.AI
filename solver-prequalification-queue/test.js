const assert = require("assert")
const {
  calculateExpertiseFit,
  evaluateTeamForChallenge,
  generateSolverPrequalificationQueue,
  hmacSha256,
  stableStringify,
} = require("./index")
const { policy, challenges, teams } = require("./sample-data")

const packet = generateSolverPrequalificationQueue(challenges, teams, policy)

assert.deepStrictEqual(packet.summary, {
  approved: 2,
  "needs-review": 1,
  blocked: 1,
  total: 4,
  workspaceGrants: 2,
})

const orchid = packet.evaluations.find((evaluation) => evaluation.teamId === "TEAM-ORCHID")
assert.strictEqual(orchid.decision, "approved")
assert.strictEqual(orchid.workspaceAccess, "grant-private-workspace")
assert.strictEqual(orchid.displayName, "Solver-Aster")
assert.strictEqual(orchid.expertiseScore, 100)
assert.strictEqual(orchid.findings.length, 0)

const vector = packet.evaluations.find((evaluation) => evaluation.teamId === "TEAM-VECTOR")
assert.strictEqual(vector.decision, "needs-review")
assert(vector.findings.some((finding) => finding.code === "EXPERTISE_GAP"))
assert(vector.findings.some((finding) => finding.code === "AVAILABILITY_GAP"))

const meridian = packet.evaluations.find((evaluation) => evaluation.teamId === "TEAM-MERIDIAN")
assert.strictEqual(meridian.decision, "approved")
assert.strictEqual(meridian.displayName, "Meridian Climate Analytics")

const pulse = packet.evaluations.find((evaluation) => evaluation.teamId === "TEAM-PULSE")
assert.strictEqual(pulse.decision, "blocked")
assert(pulse.findings.some((finding) => finding.code === "SPONSOR_CONFLICT"))
assert(pulse.findings.some((finding) => finding.code === "NDA_REQUIRED"))
assert(pulse.findings.some((finding) => finding.code === "IDENTITY_ATTESTATION_MISSING"))

const challenge = challenges.find((candidate) => candidate.id === "CHAL-BIO-042")
const team = teams.find((candidate) => candidate.id === "TEAM-ORCHID")
const expertiseFit = calculateExpertiseFit(team, challenge)
assert.strictEqual(expertiseFit.missing.length, 0)
assert.strictEqual(expertiseFit.score, 100)

const event = orchid.signedEvent
const expectedSignature = `sha256=${hmacSha256(
  policy.webhookSecret,
  stableStringify({
    type: event.type,
    challengeId: event.challengeId,
    teamId: event.teamId,
    decision: event.decision,
    workspaceAccess: event.workspaceAccess,
    findingCodes: event.findingCodes,
    generatedAt: event.generatedAt,
  }),
)}`
assert.strictEqual(event.signature, expectedSignature)

const reviewerPacketJson = JSON.stringify(packet.evaluations.map((evaluation) => evaluation.reviewerPacket))
assert(!reviewerPacketJson.includes("@example.test"), "reviewer packets must not expose member emails")

const directEvaluation = evaluateTeamForChallenge(team, challenge, policy)
assert.strictEqual(directEvaluation.auditDigest, orchid.auditDigest)

console.log("solver-prequalification-queue tests passed")
