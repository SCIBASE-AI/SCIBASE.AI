const assert = require("node:assert/strict")
const { evaluateEnterpriseIdentities } = require("./index")
const { deprovisioningPolicy, identities } = require("./sample-data")

const packet = evaluateEnterpriseIdentities({ identities, deprovisioningPolicy })

assert.equal(packet.summary.totalIdentities, 4)
assert.equal(packet.summary.clear, 1)
assert.equal(packet.summary.review, 1)
assert.equal(packet.summary.revoke, 2)
assert.match(packet.audit.digest, /^[a-f0-9]{64}$/)

const active = packet.decisions.find((decision) => decision.id === "USR-OK-001")
assert.equal(active.status, "clear")
assert.equal(active.findings.length, 0)
assert.equal(active.adminActions[0].code, "NO_DEPROVISIONING_ACTION")

const departed = packet.decisions.find((decision) => decision.id === "USR-REVOKE-002")
assert.equal(departed.status, "revoke")
assert.ok(departed.findings.some((finding) => finding.code === "PROTECTED_ROLE_NOT_REVOKED"))
assert.ok(departed.findings.some((finding) => finding.code === "ACTIVE_API_TOKEN_AFTER_TERMINATION"))
assert.ok(departed.findings.some((finding) => finding.code === "EXPORT_CONNECTOR_OWNER_REVIEW"))
assert.ok(departed.adminActions.some((action) => action.code === "REVOKE_API_TOKENS"))

const visitor = packet.decisions.find((decision) => decision.id === "USR-REVIEW-003")
assert.equal(visitor.status, "revoke")
assert.ok(visitor.findings.some((finding) => finding.code === "SCIM_ACCOUNT_STILL_ACTIVE"))
assert.ok(visitor.findings.some((finding) => finding.code === "PUBLICATION_OWNER_TRANSFER_NEEDED"))

const transfer = packet.decisions.find((decision) => decision.id === "USR-RECLAIM-004")
assert.equal(transfer.status, "review")
assert.ok(transfer.findings.some((finding) => finding.code === "TRANSFER_PROTECTED_ROLE_REVIEW"))
assert.ok(transfer.findings.some((finding) => finding.code === "COMPUTE_QUOTA_REASSIGNMENT_NEEDED"))
assert.ok(transfer.adminActions.some((action) => action.code === "RECLAIM_COMPUTE_QUOTA"))

console.log("enterprise-scim-deprovisioning-guard tests passed")
