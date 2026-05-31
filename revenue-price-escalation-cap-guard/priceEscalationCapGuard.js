"use strict";

function normalizeText(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function parseDate(value) {
  const raw = String(value || "");
  const date = new Date(raw.includes("T") ? raw : `${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(startValue, endValue) {
  const start = parseDate(startValue);
  const end = parseDate(endValue);
  if (!start || !end) return null;
  return Math.ceil((end.getTime() - start.getTime()) / 86400000);
}

function basisPointsIncrease(currentAnnualCents, proposedAnnualCents) {
  const current = Number(currentAnnualCents || 0);
  const proposed = Number(proposedAnnualCents || 0);
  if (current <= 0) return null;
  return Math.round(((proposed - current) / current) * 10000);
}

function isBeforeOrSame(leftValue, rightValue) {
  const left = parseDate(leftValue);
  const right = parseDate(rightValue);
  if (!left || !right) return false;
  return left.getTime() <= right.getTime();
}

function evaluateRenewal(renewal, context) {
  const policy = context.policy;
  const findings = [];
  const increaseBps = basisPointsIncrease(renewal.currentAnnualCents, renewal.proposedAnnualCents);
  const contractCap = renewal.contract?.upliftCapBps ?? policy.defaultMaxIncreaseBps;
  const noticeDays = daysBetween(renewal.notice?.sentAt, renewal.renewalDate);
  const cpiAgeDays = daysBetween(renewal.cpiEvidence?.observedAt, context.checkedAt);
  const priceLocked = isBeforeOrSame(renewal.renewalDate, renewal.contract?.priceLockUntil);

  if (increaseBps === null) {
    findings.push({
      code: "MISSING_BASE_PRICE",
      severity: "hold",
      message: `${renewal.id} is missing a positive current annual price for uplift validation.`,
    });
  } else if (increaseBps < policy.maxUnsupportedIncreaseBps) {
    findings.push({
      code: "NEGATIVE_UPLIFT_REVIEW",
      severity: "review",
      message: `${renewal.id} lowers annual price by ${Math.abs(increaseBps)} bps and needs revenue approval.`,
    });
  } else if (increaseBps > contractCap) {
    findings.push({
      code: "CONTRACT_CAP_EXCEEDED",
      severity: "hold",
      message: `${renewal.id} proposes ${increaseBps} bps uplift over the ${contractCap} bps contract cap.`,
    });
  }

  if (priceLocked && increaseBps > 0) {
    findings.push({
      code: "PRICE_LOCK_ACTIVE",
      severity: "hold",
      message: `${renewal.id} proposes an uplift while the contract price lock is still active.`,
    });
  }

  if (renewal.contract?.excludedFromAutoUplift && increaseBps > 0 && !renewal.approval) {
    findings.push({
      code: "EXCLUDED_ACCOUNT_NO_APPROVAL",
      severity: "hold",
      message: `${renewal.id} is excluded from automatic uplift and has no exception approval.`,
    });
  } else if (renewal.contract?.excludedFromAutoUplift && increaseBps > 0 && renewal.approval) {
    findings.push({
      code: "EXCLUDED_ACCOUNT_APPROVAL_REVIEW",
      severity: "review",
      message: `${renewal.id} has an exception approval that finance should verify before release.`,
    });
  }

  if (!renewal.cpiEvidence?.source || renewal.cpiEvidence.valueBps === undefined) {
    findings.push({
      code: "MISSING_CPI_EVIDENCE",
      severity: "hold",
      message: `${renewal.id} lacks CPI/source evidence for the price uplift.`,
    });
  } else {
    if (cpiAgeDays !== null && cpiAgeDays > policy.maxCpiStalenessDays) {
      findings.push({
        code: "STALE_CPI_EVIDENCE",
        severity: "review",
        message: `${renewal.id} CPI evidence is ${cpiAgeDays} days old.`,
      });
    }
    if (increaseBps !== null && increaseBps > renewal.cpiEvidence.valueBps && increaseBps > contractCap) {
      findings.push({
        code: "UPLIFT_ABOVE_CPI_AND_CAP",
        severity: "hold",
        message: `${renewal.id} uplift exceeds both CPI evidence and contract cap.`,
      });
    }
  }

  const requiredNoticeDays = renewal.contract?.requiresNoticeDays ?? policy.minimumNoticeDays;
  if (noticeDays === null) {
    findings.push({
      code: "MISSING_NOTICE_DATE",
      severity: "hold",
      message: `${renewal.id} is missing customer notice evidence.`,
    });
  } else if (noticeDays < requiredNoticeDays) {
    findings.push({
      code: "NOTICE_WINDOW_SHORT",
      severity: "hold",
      message: `${renewal.id} has ${noticeDays} notice days, below required ${requiredNoticeDays}.`,
    });
  }

  const blockers = findings.filter((finding) => finding.severity === "hold");
  const reviews = findings.filter((finding) => finding.severity === "review");
  const decision = blockers.length > 0 ? "hold" : reviews.length > 0 ? "review" : "release";

  return {
    renewalId: renewal.id,
    customer: renewal.customer,
    segment: renewal.segment,
    currentAnnualCents: renewal.currentAnnualCents,
    proposedAnnualCents: renewal.proposedAnnualCents,
    increaseBps,
    contractCapBps: contractCap,
    decision,
    findings,
    remediation: remediationFor(decision, findings),
  };
}

function remediationFor(decision, findings) {
  if (decision === "release") return ["Release renewal uplift to invoice staging."];
  return findings
    .filter((finding) => finding.severity === "hold" || finding.severity === "review")
    .map((finding) => {
      if (finding.code === "CONTRACT_CAP_EXCEEDED") return "Reduce uplift to contract cap or collect signed exception approval.";
      if (finding.code === "PRICE_LOCK_ACTIVE") return "Keep current price until lock expires or attach signed amendment.";
      if (finding.code === "NOTICE_WINDOW_SHORT") return "Delay renewal invoice or restart customer notice window.";
      if (finding.code === "STALE_CPI_EVIDENCE") return "Refresh CPI/source evidence before releasing uplift.";
      if (finding.code === "EXCLUDED_ACCOUNT_APPROVAL_REVIEW") return "Verify exception approval scope before invoice release.";
      return "Resolve uplift evidence and rerun the escalation cap guard.";
    });
}

function analyzePriceEscalations(input) {
  const policy = {
    defaultMaxIncreaseBps: input.policy?.defaultMaxIncreaseBps ?? 800,
    minimumNoticeDays: input.policy?.minimumNoticeDays ?? 45,
    maxCpiStalenessDays: input.policy?.maxCpiStalenessDays ?? 120,
    maxUnsupportedIncreaseBps: input.policy?.maxUnsupportedIncreaseBps ?? 0,
  };
  const checkedAt = input.checkedAt || new Date().toISOString();
  const renewals = input.renewals || [];
  const decisions = renewals.map((renewal) => evaluateRenewal(renewal, { checkedAt, policy }));
  const summary = {
    renewals: decisions.length,
    release: decisions.filter((item) => item.decision === "release").length,
    review: decisions.filter((item) => item.decision === "review").length,
    hold: decisions.filter((item) => item.decision === "hold").length,
    currentAnnualCents: decisions.reduce((sum, item) => sum + Number(item.currentAnnualCents || 0), 0),
    proposedAnnualCents: decisions.reduce((sum, item) => sum + Number(item.proposedAnnualCents || 0), 0),
  };

  return {
    status: summary.hold > 0 ? "hold" : summary.review > 0 ? "review" : "release",
    checkedAt,
    policy,
    summary,
    decisions,
    warnings: renewals.length === 0 ? [{ code: "NO_RENEWALS", message: "No renewals were available for price escalation review." }] : [],
  };
}

function formatUsd(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

module.exports = {
  analyzePriceEscalations,
  basisPointsIncrease,
  daysBetween,
  evaluateRenewal,
  formatUsd,
  normalizeText,
};
