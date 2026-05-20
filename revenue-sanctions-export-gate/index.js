const crypto = require("crypto")

const BLOCKING_CODES = new Set([
  "DENIED_COUNTERPARTY",
  "RESTRICTED_JURISDICTION",
  "EXPORT_LICENSE_REQUIRED",
  "PROHIBITED_PAYMENT_RAIL",
])

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`
  }

  return JSON.stringify(value)
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex")
}

function hmacSha256(secret, value) {
  return crypto.createHmac("sha256", secret).update(String(value)).digest("hex")
}

function addFinding(findings, severity, code, message, evidence = {}) {
  findings.push({ severity, code, message, evidence })
}

function normalize(value) {
  return String(value || "").trim().toLowerCase()
}

function isDeniedEntity(customer, policy) {
  const candidateNames = [customer.legalName, customer.billingName, customer.parentEntity].map(normalize)
  return policy.deniedEntities.some((entity) => candidateNames.includes(normalize(entity)))
}

function evaluateCustomer(customer, policy, findings) {
  if (policy.restrictedJurisdictions.includes(customer.country)) {
    addFinding(findings, "critical", "RESTRICTED_JURISDICTION", "Customer jurisdiction is restricted for revenue processing.", {
      customerId: customer.id,
      country: customer.country,
    })
  }

  if (isDeniedEntity(customer, policy)) {
    addFinding(findings, "critical", "DENIED_COUNTERPARTY", "Customer or parent entity appears on the denied entity policy list.", {
      customerId: customer.id,
      legalName: customer.legalName,
      parentEntity: customer.parentEntity,
    })
  }

  if (customer.kybStatus !== "verified") {
    addFinding(findings, "high", "KYB_NOT_VERIFIED", "Customer KYB must be verified before invoice release.", {
      customerId: customer.id,
      kybStatus: customer.kybStatus,
    })
  }
}

function evaluatePayment(invoice, customer, policy, findings) {
  if (policy.prohibitedPaymentRailsByCountry[customer.country]?.includes(invoice.paymentRail)) {
    addFinding(findings, "critical", "PROHIBITED_PAYMENT_RAIL", "Payment rail is prohibited for the customer country.", {
      invoiceId: invoice.id,
      paymentRail: invoice.paymentRail,
      country: customer.country,
    })
  }

  if (invoice.amountUsd >= policy.manualReviewThresholdUsd && !invoice.complianceApprovalId) {
    addFinding(findings, "medium", "MANUAL_REVIEW_REQUIRED", "Large invoices require a compliance approval reference.", {
      invoiceId: invoice.id,
      amountUsd: invoice.amountUsd,
      thresholdUsd: policy.manualReviewThresholdUsd,
    })
  }
}

function evaluateRevenueLine(line, policy, findings) {
  if (line.type === "analytics_license") {
    const disallowedClass = line.dataClasses.find((dataClass) => !policy.allowedLicensingDataClasses.includes(dataClass))
    if (disallowedClass) {
      addFinding(findings, "high", "UNLICENSED_DATA_CLASS", "Analytics licensing includes a data class not approved for monetization.", {
        lineId: line.id,
        dataClass: disallowedClass,
      })
    }

    if (!policy.allowedExportJurisdictions.includes(line.destinationCountry)) {
      addFinding(findings, "critical", "EXPORT_LICENSE_REQUIRED", "Analytics licensing destination requires export review or license evidence.", {
        lineId: line.id,
        destinationCountry: line.destinationCountry,
      })
    }
  }

  if (line.type === "ai_compute" && line.exportControlledModel && !line.exportLicenseId) {
    addFinding(findings, "critical", "EXPORT_LICENSE_REQUIRED", "Export-controlled AI compute requires license evidence before billing.", {
      lineId: line.id,
      modelFamily: line.modelFamily,
    })
  }

  if (line.type === "subscription" && line.seats > policy.maxAutoApprovedSeats && !line.enterpriseOrderFormId) {
    addFinding(findings, "medium", "ORDER_FORM_REQUIRED", "Large subscriptions require enterprise order-form evidence.", {
      lineId: line.id,
      seats: line.seats,
    })
  }
}

function evaluateInvoice(invoice, policy) {
  const findings = []

  evaluateCustomer(invoice.customer, policy, findings)
  evaluatePayment(invoice, invoice.customer, policy, findings)

  for (const line of invoice.lines) {
    evaluateRevenueLine(line, policy, findings)
  }

  const blockers = findings.filter((finding) => BLOCKING_CODES.has(finding.code))
  const highFindings = findings.filter((finding) => finding.severity === "high")
  const decision = blockers.length > 0 ? "block" : highFindings.length > 0 ? "hold-for-review" : "release"

  const revenueAction =
    decision === "release"
      ? "recognize"
      : decision === "hold-for-review"
        ? "defer-until-compliance-review"
        : "do-not-invoice"

  const event = {
    type: "revenue.sanctions_export_gate.evaluated",
    invoiceId: invoice.id,
    customerId: invoice.customer.id,
    decision,
    revenueAction,
    findingCount: findings.length,
    generatedAt: policy.asOf,
  }

  return {
    invoiceId: invoice.id,
    customerId: invoice.customer.id,
    customerName: invoice.customer.legalName,
    amountUsd: invoice.amountUsd,
    decision,
    revenueAction,
    findings,
    releaseChecklist: buildReleaseChecklist(invoice, findings),
    auditDigest: sha256(stableStringify({ invoice, findings })),
    signedEvent: {
      ...event,
      signature: `sha256=${hmacSha256(policy.webhookSecret, stableStringify(event))}`,
    },
  }
}

function buildReleaseChecklist(invoice, findings) {
  return [
    {
      item: "KYB verified",
      complete: invoice.customer.kybStatus === "verified",
    },
    {
      item: "No restricted jurisdiction block",
      complete: !findings.some((finding) => finding.code === "RESTRICTED_JURISDICTION"),
    },
    {
      item: "No denied counterparty match",
      complete: !findings.some((finding) => finding.code === "DENIED_COUNTERPARTY"),
    },
    {
      item: "Export evidence present when required",
      complete: !findings.some((finding) => finding.code === "EXPORT_LICENSE_REQUIRED"),
    },
    {
      item: "Payment rail allowed",
      complete: !findings.some((finding) => finding.code === "PROHIBITED_PAYMENT_RAIL"),
    },
  ]
}

function generateRevenueGatePacket(invoices, policy) {
  const evaluations = invoices.map((invoice) => evaluateInvoice(invoice, policy))
  const summary = evaluations.reduce(
    (acc, evaluation) => {
      acc[evaluation.decision] += 1
      acc.totalRevenue += evaluation.amountUsd
      if (evaluation.decision !== "release") acc.heldRevenue += evaluation.amountUsd
      return acc
    },
    { release: 0, "hold-for-review": 0, block: 0, totalRevenue: 0, heldRevenue: 0 },
  )

  return {
    generatedAt: policy.asOf,
    module: "revenue-sanctions-export-gate",
    summary,
    evaluations,
    auditDigest: sha256(stableStringify(evaluations)),
  }
}

module.exports = {
  evaluateInvoice,
  generateRevenueGatePacket,
  stableStringify,
  sha256,
  hmacSha256,
}
