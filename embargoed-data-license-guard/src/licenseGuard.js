const EXPORT_TIER_ORDER = {
  dashboard: 1,
  periodic_snapshot: 2,
  api: 3,
  white_label: 4,
};

const DECISION_PRIORITY = {
  RELEASE: 0,
  REVIEW: 1,
  HOLD: 2,
};

export function evaluateLicenseRelease(packet, today = "2026-06-27") {
  const findings = [
    checkEmbargo(packet, today),
    checkExclusivity(packet),
    checkCohortSize(packet),
    checkConsentCoverage(packet),
    checkTier(packet),
    checkTerms(packet),
    checkSnapshotFreshness(packet, today),
  ].filter(Boolean);

  const decision = findings.reduce(
    (current, finding) =>
      DECISION_PRIORITY[finding.severity] > DECISION_PRIORITY[current]
        ? finding.severity
        : current,
    "RELEASE",
  );

  return {
    licenseId: packet.licenseId,
    customer: packet.customer.name,
    exportType: packet.export.type,
    decision,
    findings,
    financeAction: financeActionFor(decision),
  };
}

export function summarizeResults(results) {
  return {
    total: results.length,
    release: results.filter((result) => result.decision === "RELEASE").length,
    review: results.filter((result) => result.decision === "REVIEW").length,
    hold: results.filter((result) => result.decision === "HOLD").length,
  };
}

function checkEmbargo(packet, today) {
  if (packet.export.embargoEndsAt <= today) {
    return null;
  }
  if (packet.license.allowEarlyAccess && packet.license.earlyAccessApprovalId) {
    return {
      code: "EARLY_ACCESS_REVIEW",
      severity: "REVIEW",
      message: "Export is still under embargo but has an early-access approval.",
    };
  }
  return {
    code: "EMBARGO_ACTIVE",
    severity: "HOLD",
    message: `Export is embargoed until ${packet.export.embargoEndsAt}.`,
  };
}

function checkExclusivity(packet) {
  const exclusive = packet.license.exclusiveCustomerId;
  if (!exclusive || exclusive === packet.customer.id) {
    return null;
  }
  return {
    code: "EXCLUSIVITY_CONFLICT",
    severity: "HOLD",
    message: "License conflicts with an active exclusive customer grant.",
  };
}

function checkCohortSize(packet) {
  if (packet.export.cohortSize >= packet.policy.minimumCohortSize) {
    return null;
  }
  return {
    code: "COHORT_TOO_SMALL",
    severity: "HOLD",
    message: `Cohort size ${packet.export.cohortSize} is below minimum ${packet.policy.minimumCohortSize}.`,
  };
}

function checkConsentCoverage(packet) {
  if (packet.export.consentCoverage >= packet.policy.minimumConsentCoverage) {
    return null;
  }
  return {
    code: "CONSENT_GAP",
    severity: "REVIEW",
    message: `Consent coverage ${packet.export.consentCoverage}% is below required ${packet.policy.minimumConsentCoverage}%.`,
  };
}

function checkTier(packet) {
  const requested = EXPORT_TIER_ORDER[packet.export.type] ?? Number.POSITIVE_INFINITY;
  const allowed = EXPORT_TIER_ORDER[packet.license.maxExportType] ?? 0;
  if (requested <= allowed) {
    return null;
  }
  return {
    code: "TIER_NOT_ENTITLED",
    severity: "HOLD",
    message: `${packet.license.tier} license does not permit ${packet.export.type} exports.`,
  };
}

function checkTerms(packet) {
  const missing = [];
  if (!packet.license.hasDataProcessingAgreement) {
    missing.push("data processing agreement");
  }
  if (!packet.export.redactionProfileId) {
    missing.push("redaction profile");
  }
  if (!packet.export.attributionText) {
    missing.push("attribution text");
  }
  if (missing.length === 0) {
    return null;
  }
  return {
    code: "MISSING_RELEASE_TERMS",
    severity: "REVIEW",
    message: `Missing ${missing.join(", ")}.`,
  };
}

function checkSnapshotFreshness(packet, today) {
  const snapshotAgeDays = daysBetween(packet.export.snapshotAt, today);
  if (snapshotAgeDays <= packet.policy.maximumSnapshotAgeDays) {
    return null;
  }
  return {
    code: "STALE_SNAPSHOT",
    severity: "REVIEW",
    message: `Snapshot is ${snapshotAgeDays} days old; maximum is ${packet.policy.maximumSnapshotAgeDays}.`,
  };
}

function daysBetween(from, to) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.floor((end - start) / 86_400_000);
}

function financeActionFor(decision) {
  if (decision === "RELEASE") {
    return "release_export_and_invoice";
  }
  if (decision === "REVIEW") {
    return "route_to_licensing_operations";
  }
  return "hold_export_and_block_invoice";
}
