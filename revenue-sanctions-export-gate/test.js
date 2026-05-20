const assert = require("assert")
const { evaluateInvoice, generateRevenueGatePacket, hmacSha256, stableStringify } = require("./index")
const { policy, invoices } = require("./sample-data")

const packet = generateRevenueGatePacket(invoices, policy)

assert.strictEqual(packet.summary.release, 1)
assert.strictEqual(packet.summary["hold-for-review"], 0)
assert.strictEqual(packet.summary.block, 3)
assert.strictEqual(packet.summary.totalRevenue, 228500)
assert.strictEqual(packet.summary.heldRevenue, 186500)
assert.match(packet.auditDigest, /^[a-f0-9]{64}$/)

const released = evaluateInvoice(invoices[0], policy)
assert.strictEqual(released.decision, "release")
assert.strictEqual(released.revenueAction, "recognize")
assert.strictEqual(released.findings.length, 0)

const deniedEntity = evaluateInvoice(invoices[1], policy)
assert.strictEqual(deniedEntity.decision, "block")
assert(deniedEntity.findings.some((finding) => finding.code === "DENIED_COUNTERPARTY"))
assert(deniedEntity.findings.some((finding) => finding.code === "EXPORT_LICENSE_REQUIRED"))
assert(deniedEntity.findings.some((finding) => finding.code === "KYB_NOT_VERIFIED"))

const exportHold = evaluateInvoice(invoices[2], policy)
assert.strictEqual(exportHold.decision, "block")
assert(exportHold.findings.some((finding) => finding.code === "EXPORT_LICENSE_REQUIRED"))

const restricted = evaluateInvoice(invoices[3], policy)
assert.strictEqual(restricted.decision, "block")
assert(restricted.findings.some((finding) => finding.code === "RESTRICTED_JURISDICTION"))
assert(restricted.findings.some((finding) => finding.code === "PROHIBITED_PAYMENT_RAIL"))
assert(restricted.findings.some((finding) => finding.code === "ORDER_FORM_REQUIRED"))

const { signature, ...eventWithoutSignature } = released.signedEvent
const expected = `sha256=${hmacSha256(policy.webhookSecret, stableStringify(eventWithoutSignature))}`
assert.strictEqual(signature, expected)

console.log("revenue-sanctions-export-gate tests passed")
