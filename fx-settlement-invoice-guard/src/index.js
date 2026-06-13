"use strict";

const RELEASE = "RELEASE_INVOICE";
const REVIEW = "REVIEW_BEFORE_RELEASE";
const HOLD = "HOLD_INVOICE";

const MINOR_UNITS = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  JPY: 0,
  KRW: 0,
  CHF: 2,
  CAD: 2,
  AUD: 2,
  SGD: 2
};

function normalizeList(value) {
  return Array.isArray(value) ? value : [];
}

function addFinding(findings, severity, code, message, remediation, ref) {
  findings.push({ severity, code, message, remediation, ref });
}

function asDate(value, field, findings) {
  if (!value) {
    addFinding(findings, "block", `${field}_missing`, `${field} is missing.`, `Attach ${field} evidence.`, field);
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    addFinding(findings, "block", `${field}_invalid`, `${field} is invalid: ${value}.`, `Normalize ${field} to ISO-8601.`, field);
    return null;
  }
  return date;
}

function hoursBetween(older, newer) {
  return (newer.getTime() - older.getTime()) / (60 * 60 * 1000);
}

function roundCurrency(amount, currency) {
  const decimals = MINOR_UNITS[currency];
  if (decimals === undefined) return null;
  const factor = 10 ** decimals;
  return Math.round((amount + Number.EPSILON) * factor) / factor;
}

function sumLines(lines) {
  return normalizeList(lines).reduce((sum, line) => sum + Number(line.amount || 0), 0);
}

function validateCurrency(currency, field, findings) {
  if (!currency || !MINOR_UNITS.hasOwnProperty(currency)) {
    addFinding(
      findings,
      "block",
      `${field}_unsupported`,
      `${field} is unsupported or missing: ${currency || "missing"}.`,
      "Use a supported ISO currency and configured minor unit policy.",
      field
    );
    return false;
  }
  return true;
}

function validateMinorUnits(amount, currency, label, findings) {
  const rounded = roundCurrency(amount, currency);
  if (rounded === null) return;
  if (Math.abs(rounded - amount) > 0.000001) {
    addFinding(
      findings,
      "block",
      "minor_unit_rounding_invalid",
      `${label} ${amount} has too many decimals for ${currency}.`,
      `Round ${label} to ${MINOR_UNITS[currency]} minor units before invoice release.`,
      label
    );
  }
}

function evaluateFxSettlementPacket(packet, options = {}) {
  if (!packet || typeof packet !== "object") {
    throw new TypeError("packet must be an object");
  }
  const findings = [];
  const asOf = asDate(options.asOf || packet.releaseAt || "2026-06-14T00:00:00Z", "asOf", findings);
  const invoiceIssuedAt = asDate(packet.invoiceIssuedAt, "invoiceIssuedAt", findings);
  const fxQuotedAt = asDate(packet.fxSnapshot && packet.fxSnapshot.quotedAt, "fxQuotedAt", findings);

  if (!packet.invoiceId || !packet.accountId) {
    addFinding(
      findings,
      "block",
      "invoice_identity_missing",
      "Invoice id or account id is missing.",
      "Attach invoiceId and accountId before revenue release.",
      packet.invoiceId || "invoice"
    );
  }

  const invoiceCurrencyOk = validateCurrency(packet.invoiceCurrency, "invoiceCurrency", findings);
  const settlementCurrencyOk = validateCurrency(packet.settlementCurrency, "settlementCurrency", findings);
  validateCurrency(packet.accountCurrency, "accountCurrency", findings);

  const grossInvoice = sumLines(packet.lineItems);
  const credits = sumLines(packet.creditNotes);
  const netInvoice = grossInvoice - credits;

  if (invoiceCurrencyOk) {
    validateMinorUnits(grossInvoice, packet.invoiceCurrency, "grossInvoice", findings);
    validateMinorUnits(credits, packet.invoiceCurrency, "creditNotes", findings);
    validateMinorUnits(netInvoice, packet.invoiceCurrency, "netInvoice", findings);
  }

  if (netInvoice < 0) {
    addFinding(
      findings,
      "block",
      "negative_net_invoice",
      `Net invoice is negative after credits: ${netInvoice}.`,
      "Hold invoice and issue a refund/credit memo workflow instead.",
      packet.invoiceId
    );
  }

  const fx = packet.fxSnapshot || {};
  if (!fx.source || !fx.rateId || typeof fx.rate !== "number" || fx.rate <= 0) {
    addFinding(
      findings,
      "block",
      "fx_snapshot_incomplete",
      "FX snapshot is missing source, rate id, or positive rate.",
      "Attach immutable FX source, rate id, quotedAt, and positive rate.",
      packet.invoiceId
    );
  }

  if (asOf && fxQuotedAt && hoursBetween(fxQuotedAt, asOf) > (options.maxFxAgeHours || 24)) {
    addFinding(
      findings,
      "review",
      "fx_snapshot_stale",
      "FX snapshot is older than the allowed release window.",
      "Refresh FX snapshot or attach finance approval for stale-rate usage.",
      packet.invoiceId
    );
  }

  if (invoiceIssuedAt && fxQuotedAt && fxQuotedAt < invoiceIssuedAt && hoursBetween(fxQuotedAt, invoiceIssuedAt) > 2) {
    addFinding(
      findings,
      "review",
      "fx_quote_before_invoice_window",
      "FX quote predates invoice issue time beyond the allowed window.",
      "Use an invoice-time quote or document policy approval.",
      packet.invoiceId
    );
  }

  let expectedSettlement = null;
  if (settlementCurrencyOk && typeof fx.rate === "number" && fx.rate > 0) {
    expectedSettlement = roundCurrency(netInvoice * fx.rate, packet.settlementCurrency);
    validateMinorUnits(packet.processorSettlementAmount, packet.settlementCurrency, "processorSettlementAmount", findings);
  }

  if (!packet.processorReference) {
    addFinding(
      findings,
      "block",
      "processor_reference_missing",
      "Processor settlement reference is missing.",
      "Attach payment processor settlement id before revenue close.",
      packet.invoiceId
    );
  }

  if (expectedSettlement !== null) {
    const delta = roundCurrency(Number(packet.processorSettlementAmount || 0) - expectedSettlement, packet.settlementCurrency);
    const absoluteDelta = Math.abs(delta);
    const tolerance = options.settlementTolerance ?? (MINOR_UNITS[packet.settlementCurrency] === 0 ? 1 : 0.01);

    if (absoluteDelta > tolerance) {
      const material = absoluteDelta >= (packet.materialVarianceThreshold || 25);
      addFinding(
        findings,
        material ? "block" : "review",
        material ? "material_fx_settlement_variance" : "fx_settlement_variance",
        `Processor settlement differs from expected settlement by ${delta} ${packet.settlementCurrency}.`,
        material
          ? "Attach finance approval and block release until variance is resolved."
          : "Route to finance review or attach rounding-policy evidence.",
        packet.invoiceId
      );
    }
  }

  if (normalizeList(packet.creditNotes).length > 0 && !packet.creditApprovalId) {
    addFinding(
      findings,
      "review",
      "credit_offset_approval_missing",
      "Credit notes are applied without a credit approval id.",
      "Attach approved credit memo before invoice release.",
      packet.invoiceId
    );
  }

  if (findings.length === 0) {
    addFinding(
      findings,
      "pass",
      "fx_settlement_ready",
      "Invoice FX settlement, rounding, credits, and processor references are release-ready.",
      "No remediation required.",
      packet.invoiceId
    );
  }

  return {
    invoiceId: packet.invoiceId,
    accountId: packet.accountId,
    invoiceCurrency: packet.invoiceCurrency,
    settlementCurrency: packet.settlementCurrency,
    expectedSettlement,
    decision: decide(findings),
    findings
  };
}

function decide(findings) {
  if (findings.some((finding) => finding.severity === "block")) return HOLD;
  if (findings.some((finding) => finding.severity === "review")) return REVIEW;
  return RELEASE;
}

function evaluateFxSettlementBatch(packets, options = {}) {
  return normalizeList(packets).map((packet) => evaluateFxSettlementPacket(packet, options));
}

function summarize(results) {
  const summary = { blocks: 0, reviews: 0, passes: 0 };
  for (const result of normalizeList(results)) {
    for (const finding of result.findings) {
      if (finding.severity === "block") summary.blocks += 1;
      if (finding.severity === "review") summary.reviews += 1;
      if (finding.severity === "pass") summary.passes += 1;
    }
  }
  return summary;
}

module.exports = {
  RELEASE,
  REVIEW,
  HOLD,
  evaluateFxSettlementPacket,
  evaluateFxSettlementBatch,
  summarize,
  roundCurrency
};
