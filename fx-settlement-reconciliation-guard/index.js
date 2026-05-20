"use strict";

const crypto = require("crypto");

const DEFAULT_POLICY = Object.freeze({
  asOf: "2026-05-20",
  baseCurrency: "USD",
  maxFxVarianceBps: 75,
  maxSettlementLagDays: 5,
  maxBankFeeBps: 180,
  minRateSourceCount: 2,
  requireProviderReference: true,
  requireTaxEvidenceForCrossBorder: true,
});

function evaluateFxSettlements(input, policyOverrides = {}) {
  const policy = { ...DEFAULT_POLICY, ...policyOverrides };
  const rateBooks = new Map((input.rateBooks || []).map((book) => [rateKey(book.currency, book.date), book]));
  const evaluations = [];
  const seenProviderReferences = new Set();

  for (const settlement of input.settlements || []) {
    const findings = [];
    const invoiceAmountCents = assertCents(settlement.invoiceAmountCents, settlement.id, "invoiceAmountCents");
    const remittedBaseCents = assertCents(settlement.remittedBaseCents, settlement.id, "remittedBaseCents");
    const bookedBaseCents = assertCents(settlement.bookedBaseCents || 0, settlement.id, "bookedBaseCents");
    const providerFeeBaseCents = assertCents(settlement.providerFeeBaseCents || 0, settlement.id, "providerFeeBaseCents");
    const invoiceCurrency = settlement.invoiceCurrency || policy.baseCurrency;
    const invoiceDate = settlement.invoiceDate || policy.asOf;
    const settlementDate = settlement.settlementDate || policy.asOf;
    const rateBook = invoiceCurrency === policy.baseCurrency ? baseRateBook(policy.baseCurrency, invoiceDate) : rateBooks.get(rateKey(invoiceCurrency, invoiceDate));

    if (!settlement.invoiceId) {
      findings.push(blocker("missing_invoice_id", "Settlement requires an invoice id"));
    }

    if (policy.requireProviderReference && !settlement.providerReference) {
      findings.push(blocker("missing_provider_reference", "Provider remittance reference is required"));
    }

    if (settlement.providerReference) {
      if (seenProviderReferences.has(settlement.providerReference)) {
        findings.push(blocker("duplicate_provider_reference", `Provider reference ${settlement.providerReference} appears more than once`));
      }
      seenProviderReferences.add(settlement.providerReference);
    }

    if (!rateBook) {
      findings.push(blocker("missing_fx_rate", `No FX rate book found for ${invoiceCurrency} on ${invoiceDate}`));
    } else if (rateBook.sources < policy.minRateSourceCount) {
      findings.push(
        hold(
          "weak_rate_source",
          `${invoiceCurrency} rate has ${rateBook.sources} source(s); minimum is ${policy.minRateSourceCount}`
        )
      );
    }

    if (policy.requireTaxEvidenceForCrossBorder && settlement.customerCountry !== settlement.sellerCountry && !settlement.taxEvidenceId) {
      findings.push(hold("missing_cross_border_tax_evidence", "Cross-border settlement needs tax or reverse-charge evidence"));
    }

    const settlementLagDays = daysBetween(invoiceDate, settlementDate);
    if (settlementLagDays > policy.maxSettlementLagDays) {
      findings.push(
        hold(
          "settlement_lag",
          `${settlementLagDays} day settlement lag exceeds policy limit of ${policy.maxSettlementLagDays}`
        )
      );
    }

    const expectedBaseCents = rateBook ? convertToBase(invoiceAmountCents, rateBook.rateToBase) : 0;
    const expectedNetBaseCents = Math.max(0, expectedBaseCents - providerFeeBaseCents);
    const fxVarianceCents = remittedBaseCents - expectedNetBaseCents;
    const fxVarianceBps = expectedNetBaseCents > 0 ? roundBps(Math.abs(fxVarianceCents / expectedNetBaseCents) * 10000) : 0;
    const providerFeeBps = expectedBaseCents > 0 ? roundBps((providerFeeBaseCents / expectedBaseCents) * 10000) : 0;
    const bookingVarianceCents = bookedBaseCents === 0 ? 0 : remittedBaseCents - bookedBaseCents;

    if (fxVarianceBps > policy.maxFxVarianceBps) {
      findings.push(
        hold(
          "fx_variance",
          `FX variance ${fxVarianceBps} bps exceeds limit ${policy.maxFxVarianceBps} bps`
        )
      );
    }

    if (providerFeeBps > policy.maxBankFeeBps) {
      findings.push(
        hold(
          "provider_fee_cap",
          `Provider fee ${providerFeeBps} bps exceeds limit ${policy.maxBankFeeBps} bps`
        )
      );
    }

    if (bookedBaseCents > 0 && Math.abs(bookingVarianceCents) > Math.max(100, roundCents(expectedBaseCents * 0.0025))) {
      findings.push(
        hold(
          "booking_reconciliation",
          `Remittance differs from booked base revenue by ${money(bookingVarianceCents)}`
        )
      );
    }

    const status = evaluationStatus(findings);
    evaluations.push({
      settlementId: settlement.id,
      invoiceId: settlement.invoiceId || null,
      customerId: settlement.customerId,
      providerReference: settlement.providerReference || null,
      status,
      invoiceCurrency,
      invoiceAmountCents,
      invoiceDate,
      settlementDate,
      settlementLagDays,
      expectedBaseCents,
      providerFeeBaseCents,
      expectedNetBaseCents,
      remittedBaseCents,
      bookedBaseCents,
      fxVarianceCents,
      fxVarianceBps,
      providerFeeBps,
      bookingVarianceCents,
      rateSourceCount: rateBook ? rateBook.sources : 0,
      findings,
      recommendedActions: recommendedActions(status, findings),
    });
  }

  const report = {
    asOf: policy.asOf,
    policy,
    settlementCount: evaluations.length,
    totals: summarize(evaluations),
    evaluations,
  };

  return {
    ...report,
    auditDigest: digest(report),
  };
}

function baseRateBook(currency, date) {
  return { currency, date, rateToBase: 1, sources: Number.MAX_SAFE_INTEGER };
}

function rateKey(currency, date) {
  return `${currency}:${date}`;
}

function convertToBase(cents, rateToBase) {
  if (typeof rateToBase !== "number" || rateToBase <= 0) {
    throw new Error("rateToBase must be a positive number");
  }
  return roundCents(cents * rateToBase);
}

function evaluationStatus(findings) {
  if (findings.some((finding) => finding.severity === "blocker")) return "blocked";
  if (findings.some((finding) => finding.severity === "hold")) return "held";
  return "ready";
}

function summarize(evaluations) {
  const totals = {
    readyCount: 0,
    heldCount: 0,
    blockedCount: 0,
    expectedBaseCents: 0,
    remittedBaseCents: 0,
    providerFeeBaseCents: 0,
    fxVarianceCents: 0,
    bookingVarianceCents: 0,
  };

  for (const evaluation of evaluations) {
    if (evaluation.status === "ready") totals.readyCount += 1;
    if (evaluation.status === "held") totals.heldCount += 1;
    if (evaluation.status === "blocked") totals.blockedCount += 1;
    totals.expectedBaseCents += evaluation.expectedBaseCents;
    totals.remittedBaseCents += evaluation.remittedBaseCents;
    totals.providerFeeBaseCents += evaluation.providerFeeBaseCents;
    totals.fxVarianceCents += evaluation.fxVarianceCents;
    totals.bookingVarianceCents += evaluation.bookingVarianceCents;
  }

  return totals;
}

function recommendedActions(status, findings) {
  if (status === "ready") {
    return ["Post remittance to base-currency revenue", "Archive rate book, provider reference, and audit digest"];
  }

  const actions = new Set();
  for (const finding of findings) {
    if (finding.code === "missing_fx_rate") actions.add("Attach an approved FX rate book before recognizing revenue");
    if (finding.code === "weak_rate_source") actions.add("Add an independent rate source or finance approval");
    if (finding.code === "fx_variance") actions.add("Reconcile remittance with provider FX quote before posting");
    if (finding.code === "provider_fee_cap") actions.add("Route excessive provider fee for finance review");
    if (finding.code === "settlement_lag") actions.add("Investigate delayed settlement and update cash forecast");
    if (finding.code === "booking_reconciliation") actions.add("Adjust booked revenue or record FX gain/loss entry");
    if (finding.code === "duplicate_provider_reference") actions.add("Deduplicate provider remittance references before cash application");
    if (finding.code === "missing_provider_reference") actions.add("Attach provider reference from Stripe, PayPal, bank, or invoice rail");
    if (finding.code === "missing_cross_border_tax_evidence") actions.add("Attach tax, VAT, or reverse-charge evidence");
    if (finding.code === "missing_invoice_id") actions.add("Attach the invoice id before settlement review");
  }
  return Array.from(actions);
}

function blocker(code, message) {
  return { severity: "blocker", code, message };
}

function hold(code, message) {
  return { severity: "hold", code, message };
}

function assertCents(value, context, field) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${context || "settlement"} ${field} must be a non-negative integer number of cents`);
  }
  return value;
}

function daysBetween(start, end) {
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    throw new Error(`Invalid date range ${start} -> ${end}`);
  }
  return Math.max(0, Math.round((endMs - startMs) / 86400000));
}

function roundCents(value) {
  return Math.round(value);
}

function roundBps(value) {
  return Math.round(value);
}

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

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

function money(cents) {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  return `${sign}$${(absolute / 100).toFixed(2)}`;
}

module.exports = {
  DEFAULT_POLICY,
  evaluateFxSettlements,
  money,
};
