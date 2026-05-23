const { createHash } = require("node:crypto");

const STATUS_EVENT_TYPES = {
  approve_vendor: "enterprise.vendor_dpa.approved",
  needs_legal_review: "enterprise.vendor_dpa.review",
  hold_vendor: "enterprise.vendor_dpa.hold",
};

function evaluateVendorDpaRequest(request, policy) {
  const blockers = [];
  const warnings = [];
  const agreements = new Set((request.agreements || []).map(normalize));
  const dataClasses = request.dataClasses || [];
  const subprocessors = request.subprocessors || [];

  if (!request.owner || !request.owner.trim()) {
    blockers.push(blocker("missing_owner", "Assign an accountable enterprise owner before enablement."));
  }

  if (!request.dpa || request.dpa.status !== "active") {
    blockers.push(blocker("dpa_not_active", "Vendor DPA must be active and signed."));
  }

  if (!policy.allowedRegions.includes(request.region)) {
    blockers.push(blocker("region_not_allowed", `Vendor region ${request.region} is outside approved regions.`));
  }

  for (const dataClass of dataClasses) {
    const requiredAgreement = policy.requiredRestrictedAgreements[dataClass];
    if (requiredAgreement && !agreements.has(requiredAgreement)) {
      blockers.push(
        blocker(
          `missing_${requiredAgreement}_for_${dataClass}`,
          `${dataClass} requires ${requiredAgreement.toUpperCase()} coverage before review.`
        )
      );
    }
  }

  const unapproved = subprocessors.filter((subprocessor) => !subprocessor.approved);
  if (unapproved.length > 0) {
    blockers.push(
      blocker(
        "unapproved_subprocessor",
        `Unapproved subprocessors: ${unapproved.map((item) => item.name).join(", ")}.`
      )
    );
  }

  const crossBorder = subprocessors.filter(
    (subprocessor) => !policy.allowedRegions.includes(subprocessor.region)
  );
  if (crossBorder.length > 0 && !agreements.has("scc")) {
    warnings.push(
      warning(
        "subprocessor_region_requires_scc",
        `Cross-border subprocessors need SCC review: ${crossBorder.map((item) => item.name).join(", ")}.`
      )
    );
  }

  if (request.breachNoticeHours > policy.maxBreachNoticeHours) {
    blockers.push(
      blocker(
        "breach_notice_sla_exceeded",
        `Breach notice SLA is ${request.breachNoticeHours}h, above ${policy.maxBreachNoticeHours}h.`
      )
    );
  }

  if (securityReviewAgeDays(request) > policy.maxSecurityReviewAgeDays) {
    blockers.push(
      blocker(
        "security_review_stale",
        "Security review is stale or missing reviewer evidence."
      )
    );
  }

  const status = blockers.length > 0
    ? "hold_vendor"
    : warnings.length > 0
      ? "needs_legal_review"
      : "approve_vendor";

  const decision = {
    vendorId: request.id,
    vendorName: request.vendorName,
    status,
    riskScore: Math.min(7, blockers.length + warnings.length),
    blockers,
    warnings,
    requiredActions: buildRequiredActions(request, blockers, warnings),
  };

  decision.webhookEvent = buildWebhookEvent(request, decision);
  decision.auditDigest = digest({
    vendorId: decision.vendorId,
    status: decision.status,
    blockers: blockers.map((item) => item.code),
    warnings: warnings.map((item) => item.code),
    requiredActions: decision.requiredActions.map((item) => item.code),
  });

  return decision;
}

function summarizeVendorPortfolio(requests, policy) {
  const decisions = requests.map((request) => evaluateVendorDpaRequest(request, policy));
  const byStatus = {};
  for (const decision of decisions) {
    byStatus[decision.status] = (byStatus[decision.status] || 0) + 1;
  }

  const adminActions = decisions
    .filter((decision) => decision.status !== "approve_vendor")
    .sort((left, right) => severity(right) - severity(left))
    .map((decision) => ({
      vendorId: decision.vendorId,
      vendorName: decision.vendorName,
      status: decision.status,
      actionCodes: decision.requiredActions.map((action) => action.code),
    }));

  const summary = {
    totalVendors: decisions.length,
    byStatus,
    decisions,
    adminActions,
  };

  summary.auditDigest = digest({
    byStatus,
    adminActions,
    vendorDigests: decisions.map((decision) => decision.auditDigest),
  });

  return summary;
}

function buildRequiredActions(request, blockers, warnings) {
  const items = [];
  for (const item of [...blockers, ...warnings]) {
    items.push({
      code: `resolve_${item.code}`,
      owner: request.owner && request.owner.trim() ? request.owner : "Enterprise Governance",
      description: item.message,
    });
  }
  return items;
}

function buildWebhookEvent(request, decision) {
  return {
    type: STATUS_EVENT_TYPES[decision.status],
    vendorId: request.id,
    vendorName: request.vendorName,
    status: decision.status,
    riskScore: decision.riskScore,
    owner: request.owner || "Enterprise Governance",
    blockerCodes: decision.blockers.map((item) => item.code),
    warningCodes: decision.warnings.map((item) => item.code),
  };
}

function securityReviewAgeDays(request) {
  if (!request.securityReview || !request.securityReview.completedAt || !request.securityReview.reviewer) {
    return Number.POSITIVE_INFINITY;
  }

  const requestedAt = new Date(`${request.requestedAt || new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  const completedAt = new Date(`${request.securityReview.completedAt}T00:00:00Z`);
  return Math.floor((requestedAt - completedAt) / 86_400_000);
}

function blocker(code, message) {
  return { severity: "blocker", code, message };
}

function warning(code, message) {
  return { severity: "warning", code, message };
}

function severity(decision) {
  if (decision.status === "hold_vendor") return 2;
  if (decision.status === "needs_legal_review") return 1;
  return 0;
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function digest(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

module.exports = {
  evaluateVendorDpaRequest,
  summarizeVendorPortfolio,
  stableStringify,
};
