"use strict";

const crypto = require("crypto");

const DEFAULT_POLICY = Object.freeze({
  asOf: "2026-05-20",
  platformFeeRate: 0.18,
  reserveRate: 0.05,
  minimumPayoutCents: 5000,
  minimumAggregationSubjects: 25,
  maximumResellerFeeRate: 0.3,
});

function evaluateSettlement(input, policyOverrides = {}) {
  const policy = { ...DEFAULT_POLICY, ...policyOverrides };
  const agreements = new Map((input.agreements || []).map((agreement) => [agreement.id, agreement]));
  const seenInvoices = new Set();
  const settlements = [];

  for (const event of input.licenseEvents || []) {
    const agreement = agreements.get(event.agreementId);
    const findings = [];

    if (!agreement) {
      findings.push(blocker("missing_agreement", `No agreement found for ${event.agreementId}`));
      settlements.push(buildBlockedSettlement(event, findings));
      continue;
    }

    const grossCents = assertCents(event.grossCents, event.id, "grossCents");
    const platformFeeRate = rateOrDefault(agreement.platformFeeRate, policy.platformFeeRate);
    const resellerFeeRate = rateOrDefault(event.resellerFeeRate, agreement.resellerFeeRate || 0);
    const contributorSplits = agreement.contributorRoyaltySplits || [];

    if (seenInvoices.has(event.invoiceId)) {
      findings.push(blocker("duplicate_invoice", `Invoice ${event.invoiceId} already appeared in this settlement batch`));
    }
    seenInvoices.add(event.invoiceId);

    if (agreement.status !== "active") {
      findings.push(blocker("inactive_agreement", `Agreement ${agreement.id} has status ${agreement.status || "unknown"}`));
    }

    if (agreement.endsAt && agreement.endsAt < policy.asOf) {
      findings.push(blocker("expired_agreement", `Agreement expired on ${agreement.endsAt}`));
    }

    if (event.datasetId !== agreement.datasetId) {
      findings.push(blocker("dataset_mismatch", `Event dataset ${event.datasetId} does not match agreement dataset ${agreement.datasetId}`));
    }

    if (!event.consentAttestation) {
      findings.push(blocker("missing_consent", "Consent attestation is required before licensing revenue can be settled"));
    }

    if ((event.subjectCount || 0) < policy.minimumAggregationSubjects) {
      findings.push(
        hold(
          "aggregation_floor",
          `Only ${event.subjectCount || 0} subjects are represented; minimum is ${policy.minimumAggregationSubjects}`
        )
      );
    }

    if (agreement.allowedUseCases && !agreement.allowedUseCases.includes(event.useCase)) {
      findings.push(blocker("use_case_not_allowed", `${event.useCase} is not allowed by agreement ${agreement.id}`));
    }

    if (resellerFeeRate > policy.maximumResellerFeeRate) {
      findings.push(
        blocker(
          "reseller_fee_cap",
          `Reseller fee ${percent(resellerFeeRate)} exceeds cap ${percent(policy.maximumResellerFeeRate)}`
        )
      );
    }

    const splitTotal = roundRate(contributorSplits.reduce((sum, split) => sum + Number(split.share || 0), 0));
    if (contributorSplits.length === 0) {
      findings.push(blocker("missing_contributor_splits", "At least one contributor split is required"));
    } else if (splitTotal !== 1) {
      findings.push(blocker("split_mismatch", `Contributor splits total ${percent(splitTotal)}, expected 100%`));
    }

    const platformFeeCents = roundCents(grossCents * platformFeeRate);
    const resellerFeeCents = roundCents(grossCents * resellerFeeRate);
    const royaltyPoolCents = Math.max(0, grossCents - platformFeeCents - resellerFeeCents);
    const reserveCents = findings.some((finding) => finding.severity !== "info")
      ? roundCents(royaltyPoolCents * policy.reserveRate)
      : 0;
    const distributableCents = royaltyPoolCents - reserveCents;

    const payoutLines = contributorSplits.map((split) => {
      const payableCents = roundCents(distributableCents * Number(split.share || 0));
      const needsHold = payableCents > 0 && payableCents < policy.minimumPayoutCents;
      if (needsHold) {
        findings.push(
          hold(
            "minimum_payout",
            `${split.contributorId} has ${money(payableCents)}, below minimum payout ${money(policy.minimumPayoutCents)}`
          )
        );
      }
      return {
        contributorId: split.contributorId,
        share: roundRate(Number(split.share || 0)),
        payableCents,
        status: needsHold ? "held" : "payable",
      };
    });

    const status = settlementStatus(findings);
    settlements.push({
      eventId: event.id,
      invoiceId: event.invoiceId,
      agreementId: agreement.id,
      customerId: event.customerId,
      datasetId: event.datasetId,
      useCase: event.useCase,
      status,
      grossCents,
      platformFeeCents,
      resellerFeeCents,
      royaltyPoolCents,
      reserveCents,
      distributableCents: status === "blocked" ? 0 : distributableCents,
      payoutLines: status === "blocked" ? payoutLines.map((line) => ({ ...line, status: "blocked" })) : payoutLines,
      findings,
      recommendedActions: recommendedActions(status, findings),
    });
  }

  const totals = summarize(settlements);
  const report = {
    asOf: policy.asOf,
    policy,
    settlementCount: settlements.length,
    totals,
    settlements,
  };

  return {
    ...report,
    auditDigest: digest(report),
  };
}

function buildBlockedSettlement(event, findings) {
  return {
    eventId: event.id,
    invoiceId: event.invoiceId,
    agreementId: event.agreementId,
    customerId: event.customerId,
    datasetId: event.datasetId,
    useCase: event.useCase,
    status: "blocked",
    grossCents: assertCents(event.grossCents || 0, event.id, "grossCents"),
    platformFeeCents: 0,
    resellerFeeCents: 0,
    royaltyPoolCents: 0,
    reserveCents: 0,
    distributableCents: 0,
    payoutLines: [],
    findings,
    recommendedActions: recommendedActions("blocked", findings),
  };
}

function settlementStatus(findings) {
  if (findings.some((finding) => finding.severity === "blocker")) return "blocked";
  if (findings.some((finding) => finding.severity === "hold")) return "held";
  return "ready";
}

function summarize(settlements) {
  const totals = {
    grossCents: 0,
    platformFeeCents: 0,
    resellerFeeCents: 0,
    reserveCents: 0,
    readyPayoutCents: 0,
    heldPayoutCents: 0,
    blockedGrossCents: 0,
    readyCount: 0,
    heldCount: 0,
    blockedCount: 0,
  };

  for (const settlement of settlements) {
    totals.grossCents += settlement.grossCents;
    totals.platformFeeCents += settlement.platformFeeCents;
    totals.resellerFeeCents += settlement.resellerFeeCents;
    totals.reserveCents += settlement.reserveCents;

    if (settlement.status === "ready") {
      totals.readyCount += 1;
      totals.readyPayoutCents += settlement.payoutLines.reduce((sum, line) => sum + line.payableCents, 0);
    } else if (settlement.status === "held") {
      totals.heldCount += 1;
      totals.heldPayoutCents += settlement.payoutLines.reduce((sum, line) => sum + line.payableCents, 0);
    } else {
      totals.blockedCount += 1;
      totals.blockedGrossCents += settlement.grossCents;
    }
  }

  return totals;
}

function recommendedActions(status, findings) {
  if (status === "ready") {
    return ["Release payout lines", "Archive the audit digest with the invoice packet"];
  }

  const actions = new Set();
  for (const finding of findings) {
    if (finding.code === "missing_consent") actions.add("Collect consent attestation before settlement");
    if (finding.code === "aggregation_floor") actions.add("Hold settlement until additional anonymized usage is aggregated");
    if (finding.code === "duplicate_invoice") actions.add("Reconcile duplicate invoice before payout");
    if (finding.code === "expired_agreement") actions.add("Renew or replace the agreement before recognizing revenue");
    if (finding.code === "split_mismatch") actions.add("Correct royalty split percentages to total 100%");
    if (finding.code === "minimum_payout") actions.add("Accrue small royalty lines until the payout threshold is reached");
    if (finding.code === "use_case_not_allowed") actions.add("Obtain written approval for the requested license use case");
    if (finding.code === "reseller_fee_cap") actions.add("Cap or approve reseller fee before settlement");
  }
  return Array.from(actions);
}

function blocker(code, message) {
  return { severity: "blocker", code, message };
}

function hold(code, message) {
  return { severity: "hold", code, message };
}

function assertCents(value, eventId, field) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${eventId || "settlement"} ${field} must be a non-negative integer number of cents`);
  }
  return value;
}

function rateOrDefault(value, fallback) {
  if (value === undefined || value === null) return fallback;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error(`Invalid rate: ${value}`);
  }
  return numeric;
}

function roundCents(value) {
  return Math.round(value);
}

function roundRate(value) {
  return Math.round(value * 10000) / 10000;
}

function percent(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function money(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

function digest(value) {
  return crypto.createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

module.exports = {
  DEFAULT_POLICY,
  evaluateSettlement,
  money,
};
