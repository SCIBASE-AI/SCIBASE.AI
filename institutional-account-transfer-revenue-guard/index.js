const crypto = require("node:crypto")

function cents(value) {
  return Math.round(value)
}

function parseDate(value) {
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`)
  }
  return date
}

function daysInclusive(start, end) {
  const millis = parseDate(end).getTime() - parseDate(start).getTime()
  return Math.floor(millis / 86400000) + 1
}

function daysFrom(start, end) {
  const millis = parseDate(end).getTime() - parseDate(start).getTime()
  return Math.max(0, Math.floor(millis / 86400000) + 1)
}

function daysUntil(value, now = "2026-05-21") {
  const millis = parseDate(value).getTime() - parseDate(now).getTime()
  return Math.ceil(millis / 86400000)
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`
  }

  return JSON.stringify(value)
}

function digestFor(value) {
  return crypto.createHash("sha256").update(stableJson(value)).digest("hex")
}

function blocker(code, message, detail = {}) {
  return { code, severity: "blocker", message, detail }
}

function warning(code, message, detail = {}) {
  return { code, severity: "warning", message, detail }
}

function action(code, owner, message) {
  return { code, owner, message }
}

function calculateProration(request) {
  const periodDays = daysInclusive(request.sourceOrg.billingPeriodStart, request.sourceOrg.billingPeriodEnd)
  const remainingDays = daysFrom(request.effectiveDate, request.sourceOrg.billingPeriodEnd)
  const sourceDaily = request.sourceOrg.monthlySubscriptionCents / periodDays
  const targetDaily = request.targetOrg.monthlySubscriptionCents / periodDays

  const sourceCreditCents = cents(sourceDaily * remainingDays)
  const targetChargeCents = cents(targetDaily * remainingDays)

  return {
    billingPeriodStart: request.sourceOrg.billingPeriodStart,
    billingPeriodEnd: request.sourceOrg.billingPeriodEnd,
    effectiveDate: request.effectiveDate,
    periodDays,
    remainingDays,
    sourceCreditCents,
    targetChargeCents,
    netTransferInvoiceCents: targetChargeCents - sourceCreditCents,
  }
}

function evaluateInvoices(request, policy) {
  const openInvoices = request.invoices.filter((invoice) => invoice.status !== "paid")
  const outstandingCents = openInvoices.reduce((sum, invoice) => sum + invoice.amountCents, 0)
  const oldestOpenInvoiceDays = openInvoices.reduce((age, invoice) => Math.max(age, invoice.ageDays), 0)

  if (
    outstandingCents > policy.maxOutstandingInvoiceCents ||
    oldestOpenInvoiceDays > policy.maxInvoiceAgeDays
  ) {
    return blocker("OUTSTANDING_INVOICE_HOLD", "Resolve open invoices before transferring revenue ownership.", {
      outstandingCents,
      oldestOpenInvoiceDays,
      invoiceIds: openInvoices.map((invoice) => invoice.id),
    })
  }

  return null
}

function evaluatePurchaseOrder(request) {
  if (!request.purchaseOrder.transferAuthorized) {
    return blocker("PO_TRANSFER_AUTHORITY_MISSING", "The purchase order does not authorize moving billing ownership.", {
      purchaseOrderId: request.purchaseOrder.id,
    })
  }

  if (!request.purchaseOrder.budgetOwnerApproved) {
    return blocker("BUDGET_OWNER_APPROVAL_MISSING", "Budget-owner approval is required before the transfer can invoice the target org.", {
      purchaseOrderId: request.purchaseOrder.id,
    })
  }

  return null
}

function evaluateIdentity(request) {
  if (request.sourceOrg.ssoDomain === request.targetOrg.ssoDomain) {
    return null
  }

  if (!request.identity.domainClaimVerified || !request.identity.adminSignoff) {
    return blocker("SSO_DOMAIN_TRANSFER_UNVERIFIED", "Cross-domain SSO transfer needs verified domain claim and admin signoff.", {
      sourceDomain: request.sourceOrg.ssoDomain,
      targetDomain: request.targetOrg.ssoDomain,
      domainClaimVerified: request.identity.domainClaimVerified,
      adminSignoff: request.identity.adminSignoff,
    })
  }

  return warning("SSO_DOMAIN_CHANGED", "Cross-domain transfer is verified, but access migration should be reviewed.", {
    sourceDomain: request.sourceOrg.ssoDomain,
    targetDomain: request.targetOrg.ssoDomain,
  })
}

function evaluateConsortium(request, policy) {
  const currentDiscount = request.sourceOrg.discount

  if (currentDiscount.type !== "consortium") {
    return null
  }

  if (!request.targetOrg.consortium.active || !request.targetOrg.consortium.rosterMatch) {
    return blocker("CONSORTIUM_ELIGIBILITY_MISSING", "Target organization is not eligible for the transferred consortium discount.", {
      requestedDiscountRate: currentDiscount.rate,
      targetRosterMatch: request.targetOrg.consortium.rosterMatch,
    })
  }

  const maxRate = request.targetOrg.consortium.maxDiscountRate ?? policy.defaultConsortiumDiscountRate
  if (currentDiscount.rate > maxRate) {
    return {
      code: "CONSORTIUM_DISCOUNT_REDUCED",
      severity: "adjustment",
      message: "Transferred account needs discount reset to the target consortium cap.",
      detail: {
        requestedDiscountRate: currentDiscount.rate,
        allowedDiscountRate: maxRate,
      },
    }
  }

  return null
}

function evaluateAnalyticsLicense(request) {
  const license = request.analyticsLicense

  if (!license.scopeTransferable) {
    return blocker("LICENSE_SCOPE_NOT_TRANSFERABLE", "Analytics license does not allow assignment to the target org.", {
      licenseId: license.id,
    })
  }

  if (!license.permittedScopes.includes(license.requestedScope)) {
    return blocker("LICENSE_SCOPE_NOT_PERMITTED", "Requested analytics scope is outside the licensed use.", {
      licenseId: license.id,
      requestedScope: license.requestedScope,
      permittedScopes: license.permittedScopes,
    })
  }

  if (!license.dpaInPlace) {
    return warning("DPA_REVIEW_RECOMMENDED", "Confirm the data-processing addendum before moving analytics entitlements.", {
      licenseId: license.id,
    })
  }

  return null
}

function evaluateComputeCredits(request, policy) {
  const findings = []

  for (const credit of request.computeCredits) {
    if (credit.ownerOrgId !== request.sourceOrg.id) {
      findings.push(blocker("COMPUTE_CREDIT_OWNERSHIP_MISMATCH", "Compute credits are owned by a funder or external org and cannot move automatically.", {
        creditId: credit.id,
        ownerOrgId: credit.ownerOrgId,
        remainingCredits: credit.remainingCredits,
      }))
      continue
    }

    if (!credit.transferable) {
      findings.push(blocker("COMPUTE_CREDIT_NOT_TRANSFERABLE", "Credit grant terms do not allow transfer to the target org.", {
        creditId: credit.id,
        remainingCredits: credit.remainingCredits,
      }))
      continue
    }

    const expiryDays = daysUntil(credit.expiresAt)
    if (expiryDays <= policy.minCreditExpiryDays) {
      findings.push(warning("COMPUTE_CREDIT_EXPIRING_SOON", "Credit grant expires soon; finance should confirm whether to transfer or settle it.", {
        creditId: credit.id,
        remainingCredits: credit.remainingCredits,
        expiresAt: credit.expiresAt,
        expiryDays,
      }))
    }
  }

  return findings
}

function buildFinanceActions(findings, proration) {
  const actions = []

  for (const finding of findings) {
    if (finding.severity === "blocker") {
      actions.push(action(`RESOLVE_${finding.code}`, "finance-ops", finding.message))
    }
    if (finding.severity === "adjustment") {
      actions.push(action(`APPLY_${finding.code}`, "revenue-ops", finding.message))
    }
    if (finding.severity === "warning") {
      actions.push(action(`REVIEW_${finding.code}`, "account-admin", finding.message))
    }
  }

  if (proration.netTransferInvoiceCents !== 0) {
    actions.push(action("POST_TRANSFER_PRORATION", "billing-ops", "Post source credit and target charge for the remaining billing period."))
  }

  return actions
}

function evaluateTransferRequest(request, policy) {
  const findings = [
    evaluateInvoices(request, policy),
    evaluatePurchaseOrder(request),
    evaluateIdentity(request),
    evaluateConsortium(request, policy),
    evaluateAnalyticsLicense(request),
    ...evaluateComputeCredits(request, policy),
  ].filter(Boolean)

  const blockers = findings.filter((finding) => finding.severity === "blocker")
  const warnings = findings.filter((finding) => finding.severity === "warning")
  const adjustments = findings.filter((finding) => finding.severity === "adjustment")
  const proration = calculateProration(request)

  const status = blockers.length > 0 ? "hold" : (warnings.length > 0 || adjustments.length > 0 ? "conditional" : "approve")
  const riskScore = blockers.length * 35 + warnings.length * 10 + adjustments.length * 8 + Math.min(20, Math.abs(proration.netTransferInvoiceCents) / 10000)

  const transferableCredits = request.computeCredits
    .filter((credit) => credit.ownerOrgId === request.sourceOrg.id && credit.transferable)
    .reduce((sum, credit) => sum + credit.remainingCredits, 0)
  const heldCredits = request.computeCredits
    .filter((credit) => credit.ownerOrgId !== request.sourceOrg.id || !credit.transferable)
    .reduce((sum, credit) => sum + credit.remainingCredits, 0)

  const decision = {
    id: request.id,
    title: request.title,
    status,
    sourceOrg: request.sourceOrg.name,
    targetOrg: request.targetOrg.name,
    effectiveDate: request.effectiveDate,
    riskScore: Number(riskScore.toFixed(2)),
    blockers,
    warnings,
    adjustments,
    proration,
    entitlementTransfer: {
      analyticsLicenseId: request.analyticsLicense.id,
      requestedAnalyticsScope: request.analyticsLicense.requestedScope,
      transferableComputeCredits: transferableCredits,
      heldComputeCredits: heldCredits,
      sourceSsoDomain: request.sourceOrg.ssoDomain,
      targetSsoDomain: request.targetOrg.ssoDomain,
    },
  }

  return {
    ...decision,
    financeActions: buildFinanceActions(findings, proration),
    auditDigest: digestFor(decision),
  }
}

function evaluateTransferPortfolio({ transferRequests, policy }) {
  const decisions = transferRequests.map((request) => evaluateTransferRequest(request, policy))
  const summary = {
    totalTransfers: decisions.length,
    approved: decisions.filter((decision) => decision.status === "approve").length,
    conditional: decisions.filter((decision) => decision.status === "conditional").length,
    held: decisions.filter((decision) => decision.status === "hold").length,
    netTransferInvoiceCents: decisions.reduce((sum, decision) => sum + decision.proration.netTransferInvoiceCents, 0),
    heldComputeCredits: decisions.reduce((sum, decision) => sum + decision.entitlementTransfer.heldComputeCredits, 0),
    financeActions: decisions.reduce((sum, decision) => sum + decision.financeActions.length, 0),
  }

  return {
    generatedAt: "2026-05-21T13:40:00.000Z",
    policy,
    summary,
    decisions,
    audit: {
      digest: digestFor({ summary, decisions }),
      source: "synthetic-transfer-revenue-review",
    },
  }
}

module.exports = {
  calculateProration,
  evaluateTransferRequest,
  evaluateTransferPortfolio,
}
