const assert = require("assert")

const {
  auditConsortiumPricing,
  buildExecutiveSummary,
  createAuditDigest,
} = require("./index")

const consortiums = [
  {
    id: "consortium-open-science-north",
    name: "Open Science North Consortium",
    discountCapPct: 18,
    stackingLimitPct: 24,
    eligiblePlans: ["institutional", "lab-plus"],
    members: [
      {
        institutionId: "northwestern-research",
        activeFrom: "2025-01-01",
        activeThrough: "2026-12-31",
        discountCapPct: 18,
      },
      {
        institutionId: "lakeview-bioinformatics",
        activeFrom: "2024-01-01",
        activeThrough: "2025-12-31",
        discountCapPct: 15,
      },
    ],
  },
]

const invoices = [
  {
    invoiceId: "INV-2026-0501",
    accountId: "acct-risky-lakeview",
    institutionId: "lakeview-bioinformatics",
    planTier: "institutional",
    invoiceDate: "2026-05-01",
    claimedConsortiumId: "consortium-open-science-north",
    listAmountUsd: 48000,
    discounts: [
      { type: "consortium", pct: 20, source: "sales override" },
      { type: "coupon", pct: 8, source: "launch coupon" },
    ],
    evidence: {
      purchaseOrder: "PO-LAKE-881",
      membershipRosterSnapshot: null,
      renewalNoticeSentAt: null,
    },
  },
  {
    invoiceId: "INV-2026-0502",
    accountId: "acct-clean-northwestern",
    institutionId: "northwestern-research",
    planTier: "institutional",
    invoiceDate: "2026-05-01",
    claimedConsortiumId: "consortium-open-science-north",
    listAmountUsd: 62000,
    discounts: [{ type: "consortium", pct: 16, source: "contracted consortium tier" }],
    evidence: {
      purchaseOrder: "PO-NW-443",
      membershipRosterSnapshot: "roster-2026-04-30",
      renewalNoticeSentAt: "2026-04-15",
    },
  },
]

const audit = auditConsortiumPricing({ invoices, consortiums, generatedAt: "2026-05-20T10:00:00Z" })

assert.equal(audit.summary.totalInvoices, 2)
assert.equal(audit.summary.heldInvoices, 1)
assert.equal(audit.summary.approvedInvoices, 1)
assert.deepEqual(audit.heldInvoiceIds, ["INV-2026-0501"])
assert.deepEqual(audit.readyInvoiceIds, ["INV-2026-0502"])

const riskyPacket = audit.packets.find((packet) => packet.invoiceId === "INV-2026-0501")
assert.equal(riskyPacket.decision, "hold")
assert.equal(riskyPacket.invoiceHold, true)
assert.deepEqual(
  riskyPacket.flags.map((flag) => flag.code),
  [
    "CONSORTIUM_MEMBERSHIP_INACTIVE",
    "DISCOUNT_EXCEEDS_MEMBER_CAP",
    "DISCOUNT_STACK_OVER_LIMIT",
    "MISSING_ROSTER_EVIDENCE",
    "MISSING_RENEWAL_NOTICE",
  ],
)
assert.ok(riskyPacket.reviewerTasks.some((task) => task.includes("active consortium membership")))
assert.ok(riskyPacket.netAmountUsd > 0)

const cleanPacket = audit.packets.find((packet) => packet.invoiceId === "INV-2026-0502")
assert.equal(cleanPacket.decision, "approve")
assert.equal(cleanPacket.invoiceHold, false)
assert.equal(cleanPacket.flags.length, 0)
assert.equal(cleanPacket.netAmountUsd, 52080)

const summary = buildExecutiveSummary(audit)
assert.ok(summary.includes("1 held invoice"))
assert.ok(summary.includes("$110,000"))
assert.ok(summary.includes("Open Science North Consortium"))

assert.equal(createAuditDigest(riskyPacket), createAuditDigest(riskyPacket))

console.log("consortium-pricing-eligibility-guard tests passed")
