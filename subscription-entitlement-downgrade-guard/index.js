"use strict";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysUntil(dateIso, nowIso) {
  const target = new Date(dateIso).getTime();
  const now = new Date(nowIso).getTime();
  if (Number.isNaN(target) || Number.isNaN(now)) {
    throw new Error(`Invalid downgrade policy date: ${dateIso} / ${nowIso}`);
  }
  return Math.ceil((target - now) / MS_PER_DAY);
}

function evaluateDowngrade(packet) {
  const holds = [];

  if (packet.usage.activeSeats > packet.requestedPlan.seatLimit) {
    holds.push("seat-limit-exceeded");
  }
  if (packet.usage.storageGb > packet.requestedPlan.storageGb) {
    holds.push("storage-limit-exceeded");
  }
  if (packet.usage.committedComputeHours > packet.requestedPlan.monthlyComputeHours) {
    holds.push("compute-commitment-exceeded");
  }
  const lockedStillInUse = packet.usage.lockedFeatures.filter((feature) => !packet.requestedPlan.features.includes(feature));
  if (lockedStillInUse.length > 0 && packet.downgradePolicy.lockedFeaturesRequireMigrationPlan) {
    holds.push("locked-feature-migration-required");
  }
  if (packet.usage.unpaidInvoices.length > 0 && packet.downgradePolicy.requireFinanceReviewForPastDue) {
    holds.push("past-due-invoice-review-required");
  }
  const commitmentDaysRemaining = daysUntil(packet.usage.annualCommitmentEndsAt, packet.requestedAt);
  if (commitmentDaysRemaining > packet.downgradePolicy.allowGraceDays) {
    holds.push("annual-commitment-active");
  }

  return {
    accountId: packet.accountId,
    fromPlan: packet.currentPlan.name,
    toPlan: packet.requestedPlan.name,
    status: holds.length === 0 ? "downgrade-ready" : "held-for-finance-review",
    holds,
    metrics: {
      activeSeats: packet.usage.activeSeats,
      requestedSeatLimit: packet.requestedPlan.seatLimit,
      storageGb: packet.usage.storageGb,
      requestedStorageGb: packet.requestedPlan.storageGb,
      committedComputeHours: packet.usage.committedComputeHours,
      requestedComputeHours: packet.requestedPlan.monthlyComputeHours,
      lockedStillInUse,
      unpaidInvoiceCount: packet.usage.unpaidInvoices.length,
      commitmentDaysRemaining,
    },
    remediation: holds.map(remediationForHold),
  };
}

function remediationForHold(hold) {
  const remediations = {
    "seat-limit-exceeded": "Remove or reassign active seats before downgrade activation.",
    "storage-limit-exceeded": "Archive or purchase storage add-on before switching plans.",
    "compute-commitment-exceeded": "Wait for committed jobs to finish or buy temporary compute capacity.",
    "locked-feature-migration-required": "Attach migration plan for features not included in the requested plan.",
    "past-due-invoice-review-required": "Resolve unpaid invoices or route to finance approval.",
    "annual-commitment-active": "Schedule downgrade for commitment end date or approve an exception.",
  };
  return remediations[hold] || "Review manually.";
}

function createDowngradeReviewPacket(packet) {
  const evaluation = evaluateDowngrade(packet);
  return {
    ...evaluation,
    policyReceipt: {
      requestedAt: packet.requestedAt,
      graceDays: packet.downgradePolicy.allowGraceDays,
      financeReviewForPastDue: packet.downgradePolicy.requireFinanceReviewForPastDue,
      lockedFeaturesRequireMigrationPlan: packet.downgradePolicy.lockedFeaturesRequireMigrationPlan,
    },
  };
}

module.exports = {
  createDowngradeReviewPacket,
  evaluateDowngrade,
  daysUntil,
};
