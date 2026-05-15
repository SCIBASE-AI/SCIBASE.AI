"use strict";

const crypto = require("node:crypto");

const TAX_RATES = {
  "US-CA": 0.0875,
  "US-MA": 0.0625,
  "GB": 0.2,
  "DE": 0.19,
};

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function stableHash(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function requireFields(object, fields, label) {
  const missing = fields.filter((field) => object[field] === undefined || object[field] === null);
  if (missing.length > 0) throw new Error(`${label} is missing required field(s): ${missing.join(", ")}`);
}

function parseDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid date: ${value}`);
  return parsed;
}

function finding(severity, id, invoiceId, title, detail, remediation) {
  return { severity, id, invoiceId, title, detail, remediation };
}

function centsForLines(lines) {
  return lines.reduce((total, line) => total + line.quantity * line.unitCents, 0);
}

function expectedTaxCents(invoice, customer) {
  if (customer.taxProfile.exemptionStatus === "exempt") return 0;
  if (customer.taxProfile.reverseCharge === true) return 0;
  const rate = TAX_RATES[invoice.taxJurisdiction];
  if (rate === undefined) return null;
  return Math.round(centsForLines(invoice.lines) * rate);
}

function hasCurrentExemption(customer, now) {
  const certificate = customer.taxProfile.exemptionCertificate;
  if (!certificate) return false;
  return certificate.status === "verified" && parseDate(certificate.expiresAt) > now;
}

function evaluateTaxTreatment(invoice, customer, now) {
  const findings = [];
  const expectedTax = expectedTaxCents(invoice, customer);

  if (customer.taxProfile.exemptionStatus === "exempt" && !hasCurrentExemption(customer, now)) {
    findings.push(finding(
      "blocker",
      "exemption-certificate-expired",
      invoice.id,
      "Invoice claims tax exemption without current certificate",
      `${customer.name} is marked exempt but the exemption certificate is missing, unverified, or expired.`,
      "Put the invoice on billing hold until a current exemption certificate is verified.",
    ));
  }

  if (customer.taxProfile.reverseCharge === true && !customer.taxProfile.vatId) {
    findings.push(finding(
      "blocker",
      "reverse-charge-vat-id-missing",
      invoice.id,
      "Reverse charge invoice lacks VAT ID evidence",
      `${customer.name} uses reverse charge but has no VAT ID on file.`,
      "Collect and verify the VAT ID before issuing the invoice with zero tax.",
    ));
  }

  if (expectedTax === null) {
    findings.push(finding(
      "warning",
      "unknown-tax-jurisdiction",
      invoice.id,
      "Tax jurisdiction has no configured rate",
      `${invoice.taxJurisdiction} is not present in the configured tax rate table.`,
      "Route the invoice to finance review before issuance.",
    ));
  } else if (invoice.taxCents !== expectedTax) {
    findings.push(finding(
      "blocker",
      "tax-amount-mismatch",
      invoice.id,
      "Invoice tax does not match configured treatment",
      `Expected ${expectedTax} cents but invoice records ${invoice.taxCents} cents.`,
      "Recalculate tax or correct exemption/reverse-charge evidence before billing.",
    ));
  }

  return findings;
}

function evaluateGrantControls(invoice, grantBudgets) {
  const findings = [];
  const grant = grantBudgets.find((budget) => budget.id === invoice.grantBudgetId);

  if (!grant) {
    findings.push(finding(
      "warning",
      "grant-budget-missing",
      invoice.id,
      "Invoice is not attached to a grant budget",
      `${invoice.id} has no recognized grant budget.`,
      "Attach a grant or mark the invoice as non-grant commercial revenue.",
    ));
    return findings;
  }

  const usedCents = grant.usedCents + centsForLines(invoice.lines);
  if (usedCents > grant.approvedCents) {
    findings.push(finding(
      "blocker",
      "grant-budget-exceeded",
      invoice.id,
      "Invoice would exceed approved grant budget",
      `${grant.id} would exceed its approved amount by ${usedCents - grant.approvedCents} cents.`,
      "Hold billing until the grant budget is expanded or line items are moved to another funding source.",
    ));
  }

  for (const line of invoice.lines) {
    if (!grant.allowedCategories.includes(line.category)) {
      findings.push(finding(
        "blocker",
        "grant-category-disallowed",
        invoice.id,
        "Invoice line item is outside grant-approved categories",
        `${line.description} uses category ${line.category}, which is not allowed by ${grant.id}.`,
        "Remove the line item from the grant invoice or obtain written budget approval.",
      ));
    }
  }

  return findings;
}

function evaluateSettlement(invoice, settlementEvents) {
  const findings = [];
  const settled = settlementEvents.find((event) => event.invoiceId === invoice.id && event.status === "settled");
  const grossCents = centsForLines(invoice.lines) + invoice.taxCents;

  if (!settled) {
    findings.push(finding(
      "warning",
      "settlement-event-missing",
      invoice.id,
      "Invoice has no settled payment event",
      `${invoice.id} has no processor settlement event yet.`,
      "Keep fulfillment entitlements provisional until settlement is recorded.",
    ));
    return findings;
  }

  if (settled.amountCents !== grossCents) {
    findings.push(finding(
      "blocker",
      "settlement-amount-mismatch",
      invoice.id,
      "Payment settlement does not match invoice gross amount",
      `Expected settlement ${grossCents} cents but received ${settled.amountCents} cents.`,
      "Reconcile processor fees, credits, refunds, or invoice amount before recognizing payment.",
    ));
  }

  return findings;
}

function buildInvoiceSummary(invoice, findings) {
  const invoiceFindings = findings.filter((item) => item.invoiceId === invoice.id);
  const blockerCount = invoiceFindings.filter((item) => item.severity === "blocker").length;
  const warningCount = invoiceFindings.filter((item) => item.severity === "warning").length;
  let recommendedAction = "issue-invoice";
  if (blockerCount > 0) recommendedAction = "billing-hold";
  else if (warningCount > 0) recommendedAction = "finance-review";

  return {
    invoiceId: invoice.id,
    grossCents: centsForLines(invoice.lines) + invoice.taxCents,
    taxCents: invoice.taxCents,
    blockerCount,
    warningCount,
    recommendedAction,
  };
}

function decide(findings) {
  if (findings.some((item) => item.severity === "blocker")) return "billing-hold";
  if (findings.some((item) => item.severity === "warning")) return "finance-review";
  return "billable";
}

function assertBundle(bundle) {
  requireFields(bundle, ["customers", "invoices", "grantBudgets", "settlementEvents"], "revenue controls bundle");
}

function analyzeRevenueTaxControls(bundle, options = {}) {
  assertBundle(bundle);
  const now = parseDate(options.now || bundle.now || new Date().toISOString());
  const findings = [];

  for (const invoice of bundle.invoices) {
    requireFields(invoice, ["id", "customerId", "taxJurisdiction", "taxCents", "lines"], `invoice ${invoice.id || "(unknown)"}`);
    const customer = bundle.customers.find((item) => item.id === invoice.customerId);
    if (!customer) {
      findings.push(finding(
        "blocker",
        "invoice-customer-missing",
        invoice.id,
        "Invoice customer is missing",
        `${invoice.id} references unknown customer ${invoice.customerId}.`,
        "Attach a valid customer record before billing.",
      ));
      continue;
    }
    requireFields(customer, ["id", "name", "taxProfile"], `customer ${customer.id}`);
    findings.push(...evaluateTaxTreatment(invoice, customer, now));
    findings.push(...evaluateGrantControls(invoice, bundle.grantBudgets));
    findings.push(...evaluateSettlement(invoice, bundle.settlementEvents));
  }

  const invoiceSummaries = bundle.invoices.map((invoice) => buildInvoiceSummary(invoice, findings));
  const decision = decide(findings);
  const auditDigest = stableHash({
    decision,
    invoiceSummaries,
    findings,
    evaluatedAt: now.toISOString(),
  });

  return {
    evaluatedAt: now.toISOString(),
    decision,
    findings,
    invoiceSummaries,
    auditDigest: `sha256:${auditDigest}`,
  };
}

module.exports = {
  TAX_RATES,
  analyzeRevenueTaxControls,
  stableHash,
  stableStringify,
};
