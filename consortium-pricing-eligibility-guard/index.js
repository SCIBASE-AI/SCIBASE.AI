const crypto = require("crypto")

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function toNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function toDate(value) {
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

function roundCurrency(value) {
  return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100
}

function formatCurrency(value) {
  return `$${Math.round(toNumber(value)).toLocaleString("en-US")}`
}

function isActiveDuring(member, invoiceDate) {
  const invoice = toDate(invoiceDate)
  const activeFrom = toDate(member && member.activeFrom)
  const activeThrough = toDate(member && member.activeThrough)

  if (!invoice || !activeFrom || !activeThrough) {
    return false
  }

  return activeFrom <= invoice && invoice <= activeThrough
}

function findConsortium(consortiums, id) {
  return asArray(consortiums).find((consortium) => consortium.id === id) || null
}

function findMember(consortium, institutionId) {
  return asArray(consortium && consortium.members).find((member) => member.institutionId === institutionId) || null
}

function sumDiscounts(discounts, type) {
  return asArray(discounts)
    .filter((discount) => !type || discount.type === type)
    .reduce((total, discount) => total + toNumber(discount.pct), 0)
}

function makeFlag(code, severity, message, evidence, reviewerTask) {
  return { code, severity, message, evidence, reviewerTask }
}

function buildReviewerTasks(flags) {
  const taskMap = {
    CONSORTIUM_NOT_FOUND: "Verify the claimed consortium exists before applying a preferred price.",
    CONSORTIUM_MEMBERSHIP_INACTIVE: "Confirm active consortium membership or remove the consortium discount before invoicing.",
    PLAN_NOT_ELIGIBLE: "Confirm the plan tier is eligible for consortium pricing.",
    DISCOUNT_EXCEEDS_MEMBER_CAP: "Reduce the consortium discount to the member or contract cap.",
    DISCOUNT_STACK_OVER_LIMIT: "Remove coupon, volume, or manual discounts until total stacking is within policy.",
    MISSING_ROSTER_EVIDENCE: "Attach the dated consortium roster snapshot used for eligibility.",
    MISSING_RENEWAL_NOTICE: "Attach renewal notice evidence before approving the invoice.",
  }

  return flags.map((flag) => taskMap[flag.code] || flag.reviewerTask).filter(Boolean)
}

function auditInvoice(invoice, consortiums) {
  const consortium = findConsortium(consortiums, invoice.claimedConsortiumId)
  const member = findMember(consortium, invoice.institutionId)
  const memberActive = Boolean(member && isActiveDuring(member, invoice.invoiceDate))
  const consortiumDiscountPct = sumDiscounts(invoice.discounts, "consortium")
  const totalDiscountPct = sumDiscounts(invoice.discounts)
  const memberCap = member ? toNumber(member.discountCapPct, toNumber(consortium && consortium.discountCapPct)) : 0
  const consortiumCap = toNumber(consortium && consortium.discountCapPct)
  const effectiveCap = memberCap || consortiumCap
  const stackingLimit = toNumber(consortium && consortium.stackingLimitPct, 0)
  const flags = []

  if (!consortium) {
    flags.push(
      makeFlag(
        "CONSORTIUM_NOT_FOUND",
        "high",
        `Invoice claims unknown consortium ${invoice.claimedConsortiumId}.`,
        { invoiceId: invoice.invoiceId, claimedConsortiumId: invoice.claimedConsortiumId },
      ),
    )
  } else if (!memberActive) {
    flags.push(
      makeFlag(
        "CONSORTIUM_MEMBERSHIP_INACTIVE",
        "high",
        `${invoice.institutionId} is not an active member on ${invoice.invoiceDate}.`,
        {
          invoiceDate: invoice.invoiceDate,
          institutionId: invoice.institutionId,
          activeThrough: member && member.activeThrough,
        },
      ),
    )
  }

  if (consortium && !asArray(consortium.eligiblePlans).includes(invoice.planTier)) {
    flags.push(
      makeFlag(
        "PLAN_NOT_ELIGIBLE",
        "medium",
        `${invoice.planTier} is not eligible for ${consortium.name} pricing.`,
        { planTier: invoice.planTier, eligiblePlans: asArray(consortium.eligiblePlans) },
      ),
    )
  }

  if (effectiveCap > 0 && consortiumDiscountPct > effectiveCap) {
    flags.push(
      makeFlag(
        "DISCOUNT_EXCEEDS_MEMBER_CAP",
        "high",
        `Consortium discount ${consortiumDiscountPct}% exceeds cap ${effectiveCap}%.`,
        { consortiumDiscountPct, effectiveCap, memberCap, consortiumCap },
      ),
    )
  }

  if (stackingLimit > 0 && totalDiscountPct > stackingLimit) {
    flags.push(
      makeFlag(
        "DISCOUNT_STACK_OVER_LIMIT",
        "medium",
        `Stacked discount ${totalDiscountPct}% exceeds stacking limit ${stackingLimit}%.`,
        { totalDiscountPct, stackingLimit, discounts: asArray(invoice.discounts) },
      ),
    )
  }

  if (!invoice.evidence || !invoice.evidence.membershipRosterSnapshot) {
    flags.push(
      makeFlag(
        "MISSING_ROSTER_EVIDENCE",
        "medium",
        "Missing dated roster snapshot for consortium eligibility.",
        { invoiceId: invoice.invoiceId },
      ),
    )
  }

  if (!invoice.evidence || !invoice.evidence.renewalNoticeSentAt) {
    flags.push(
      makeFlag(
        "MISSING_RENEWAL_NOTICE",
        "medium",
        "Missing renewal notice evidence for preferred consortium pricing.",
        { invoiceId: invoice.invoiceId },
      ),
    )
  }

  const listAmountUsd = roundCurrency(invoice.listAmountUsd)
  const boundedDiscountPct = Math.min(Math.max(totalDiscountPct, 0), 95)
  const netAmountUsd = roundCurrency(listAmountUsd * (1 - boundedDiscountPct / 100))
  const invoiceHold = flags.some((flag) => flag.severity === "high" || flag.severity === "medium")

  return {
    invoiceId: invoice.invoiceId,
    accountId: invoice.accountId,
    institutionId: invoice.institutionId,
    consortiumId: invoice.claimedConsortiumId,
    consortiumName: consortium ? consortium.name : "Unknown consortium",
    decision: invoiceHold ? "hold" : "approve",
    invoiceHold,
    listAmountUsd,
    netAmountUsd,
    consortiumDiscountPct,
    totalDiscountPct,
    effectiveCap,
    stackingLimit,
    flags,
    reviewerTasks: buildReviewerTasks(flags),
  }
}

function summarizePackets(packets) {
  const totalListAmountUsd = roundCurrency(packets.reduce((total, packet) => total + packet.listAmountUsd, 0))
  const totalNetAmountUsd = roundCurrency(packets.reduce((total, packet) => total + packet.netAmountUsd, 0))
  const heldInvoices = packets.filter((packet) => packet.invoiceHold).length

  return {
    totalInvoices: packets.length,
    heldInvoices,
    approvedInvoices: packets.length - heldInvoices,
    totalListAmountUsd,
    totalNetAmountUsd,
    protectedDiscountUsd: roundCurrency(totalListAmountUsd - totalNetAmountUsd),
    consortiumNames: Array.from(new Set(packets.map((packet) => packet.consortiumName))).sort(),
  }
}

function auditConsortiumPricing(input) {
  const packets = asArray(input && input.invoices).map((invoice) => auditInvoice(invoice, asArray(input.consortiums)))
  const summary = summarizePackets(packets)

  return {
    generatedAt: input && input.generatedAt ? input.generatedAt : new Date().toISOString(),
    summary,
    packets,
    heldInvoiceIds: packets.filter((packet) => packet.invoiceHold).map((packet) => packet.invoiceId),
    readyInvoiceIds: packets.filter((packet) => !packet.invoiceHold).map((packet) => packet.invoiceId),
  }
}

function buildExecutiveSummary(audit) {
  const summary = audit.summary
  const heldLabel = summary.heldInvoices === 1 ? "held invoice" : "held invoices"
  const approvedLabel = summary.approvedInvoices === 1 ? "approved invoice" : "approved invoices"

  return [
    `Consortium pricing audit reviewed ${summary.totalInvoices} invoices: ${summary.heldInvoices} ${heldLabel}, ${summary.approvedInvoices} ${approvedLabel}.`,
    `Gross invoice exposure is ${formatCurrency(summary.totalListAmountUsd)} with ${formatCurrency(summary.totalNetAmountUsd)} net booked after preferred pricing.`,
    `Consortiums reviewed: ${summary.consortiumNames.join(", ")}.`,
  ].join(" ")
}

function createAuditDigest(packet) {
  const payload = {
    invoiceId: packet.invoiceId,
    accountId: packet.accountId,
    decision: packet.decision,
    flags: asArray(packet.flags).map((flag) => flag.code),
    netAmountUsd: packet.netAmountUsd,
  }

  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16)
}

module.exports = {
  auditConsortiumPricing,
  buildExecutiveSummary,
  createAuditDigest,
}
