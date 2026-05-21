const assert = require("node:assert/strict")
const { evaluateTransferPortfolio } = require("./index")
const { policy, transferRequests } = require("./sample-data")

const packet = evaluateTransferPortfolio({ transferRequests, policy })

assert.equal(packet.summary.totalTransfers, 4)
assert.equal(packet.summary.approved, 1)
assert.equal(packet.summary.conditional, 1)
assert.equal(packet.summary.held, 2)
assert.match(packet.audit.digest, /^[a-f0-9]{64}$/)

const approved = packet.decisions.find((decision) => decision.id === "TR-OK-001")
assert.equal(approved.status, "approve")
assert.equal(approved.blockers.length, 0)
assert.equal(approved.proration.remainingDays, 16)
assert.equal(approved.entitlementTransfer.transferableComputeCredits, 4200)
assert.ok(approved.financeActions.some((action) => action.code === "POST_TRANSFER_PRORATION"))

const commercialSpinout = packet.decisions.find((decision) => decision.id === "TR-HOLD-002")
assert.equal(commercialSpinout.status, "hold")
assert.deepEqual(
  commercialSpinout.blockers.map((finding) => finding.code).sort(),
  [
    "COMPUTE_CREDIT_NOT_TRANSFERABLE",
    "LICENSE_SCOPE_NOT_TRANSFERABLE",
    "OUTSTANDING_INVOICE_HOLD",
    "PO_TRANSFER_AUTHORITY_MISSING",
    "SSO_DOMAIN_TRANSFER_UNVERIFIED",
  ],
)
assert.equal(commercialSpinout.entitlementTransfer.heldComputeCredits, 3000)

const consortiumTransfer = packet.decisions.find((decision) => decision.id === "TR-COND-003")
assert.equal(consortiumTransfer.status, "conditional")
assert.ok(consortiumTransfer.adjustments.some((finding) => finding.code === "CONSORTIUM_DISCOUNT_REDUCED"))
assert.ok(consortiumTransfer.warnings.some((finding) => finding.code === "SSO_DOMAIN_CHANGED"))
assert.ok(consortiumTransfer.warnings.some((finding) => finding.code === "COMPUTE_CREDIT_EXPIRING_SOON"))

const grantMismatch = packet.decisions.find((decision) => decision.id === "TR-HOLD-004")
assert.equal(grantMismatch.status, "hold")
assert.ok(grantMismatch.blockers.some((finding) => finding.code === "COMPUTE_CREDIT_OWNERSHIP_MISMATCH"))
assert.equal(grantMismatch.entitlementTransfer.heldComputeCredits, 6400)

console.log("institutional-account-transfer-revenue-guard tests passed")
