const assert = require("assert")
const { generateGovernancePacket, evaluateProject, hmacSha256, stableStringify } = require("./index")
const { policy, projects } = require("./sample-data")

const packet = generateGovernancePacket(projects, policy)

assert.strictEqual(packet.summary.projectCount, 4)
assert.strictEqual(packet.summary.approved, 2)
assert.strictEqual(packet.summary.blocked, 2)
assert.strictEqual(packet.summary.review, 0)
assert.match(packet.auditDigest, /^[a-f0-9]{64}$/)

const youthProject = projects.find((project) => project.id === "SCI-YOUTH-091")
const youthEvaluation = evaluateProject(youthProject, policy)

assert.strictEqual(youthEvaluation.status, "blocked")
assert.strictEqual(youthEvaluation.exportDecision, "block")
assert(youthEvaluation.findings.some((finding) => finding.code === "IRB_EXPIRED"))
assert(youthEvaluation.findings.some((finding) => finding.code === "MINOR_GUARDIAN_CONSENT_MISSING"))
assert(youthEvaluation.findings.some((finding) => finding.code === "CONSENT_SCOPE_GAP"))
assert(youthEvaluation.findings.some((finding) => finding.code === "RAW_DATA_EXPORT_BLOCKED"))

const heartProject = projects.find((project) => project.id === "SCI-HEART-042")
const heartEvaluation = evaluateProject(heartProject, policy)

assert.strictEqual(heartEvaluation.status, "approved")
assert.strictEqual(heartEvaluation.exportDecision, "allow")
assert.strictEqual(heartEvaluation.findings.length, 0)

const { signature, ...eventWithoutSignature } = heartEvaluation.webhookEvent
const expectedSignature = `sha256=${hmacSha256(policy.webhookSecret, stableStringify(eventWithoutSignature))}`

assert.strictEqual(signature, expectedSignature)

const genomeEvaluation = packet.evaluations.find((evaluation) => evaluation.projectId === "SCI-GENOME-204")

assert(genomeEvaluation.findings.some((finding) => finding.code === "EXPORT_TARGET_NOT_ALLOWED"))
assert(genomeEvaluation.findings.some((finding) => finding.code === "EXPORT_JURISDICTION_BLOCKED"))
assert(genomeEvaluation.findings.some((finding) => finding.code === "CONSENT_SCOPE_GAP"))

console.log("enterprise-irb-consent-governance tests passed")
