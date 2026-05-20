"use strict";

const crypto = require("crypto");

const BLOCKING_STATUSES = new Set(["outage", "disabled", "restricted"]);
const HOLDING_STATUSES = new Set(["degraded", "manual_review"]);

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = canonicalize(value[key]);
        return result;
      }, {});
  }

  return value;
}

function auditDigest(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex")
    .slice(0, 20);
}

function indexById(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function activeIncidentForRail(incidents, railId) {
  return incidents.find(
    (incident) =>
      incident.active &&
      (incident.railId === railId || (incident.affectedRails || []).includes(railId))
  );
}

function supportsInvoice(rail, account, invoice) {
  const supportsRevenueStream = (rail.supportedRevenueStreams || []).includes(
    invoice.revenueStream
  );
  const supportsCurrency = (rail.currencies || []).includes(invoice.currency);
  const supportsRegion = (rail.regions || []).includes(account.region);
  const belowMaximum =
    !rail.maxAmountCents || invoice.amountCents <= rail.maxAmountCents;
  const aboveMinimum =
    !rail.minAmountCents || invoice.amountCents >= rail.minAmountCents;
  const purchaseOrderReady =
    !rail.requiresPurchaseOrder || Boolean(invoice.purchaseOrderId);

  return {
    ok:
      supportsRevenueStream &&
      supportsCurrency &&
      supportsRegion &&
      belowMaximum &&
      aboveMinimum &&
      purchaseOrderReady,
    reasons: [
      !supportsRevenueStream && "unsupported_revenue_stream",
      !supportsCurrency && "unsupported_currency",
      !supportsRegion && "unsupported_region",
      !belowMaximum && "amount_above_rail_limit",
      !aboveMinimum && "amount_below_rail_minimum",
      !purchaseOrderReady && "missing_purchase_order",
    ].filter(Boolean),
  };
}

function railReadiness(rail, account, invoice, incidents) {
  if (!rail) {
    return {
      ok: false,
      hold: false,
      reasons: ["rail_not_configured"],
    };
  }

  const compatibility = supportsInvoice(rail, account, invoice);
  const incident = activeIncidentForRail(incidents, rail.id);
  const blocked = BLOCKING_STATUSES.has(rail.status) || Boolean(incident);
  const hold = HOLDING_STATUSES.has(rail.status);

  return {
    ok: compatibility.ok && !blocked,
    hold: compatibility.ok && !blocked && hold,
    incident,
    reasons: [
      ...compatibility.reasons,
      BLOCKING_STATUSES.has(rail.status) && `rail_status_${rail.status}`,
      incident && `active_incident_${incident.id}`,
      hold && `rail_status_${rail.status}`,
    ].filter(Boolean),
  };
}

function finding(severity, code, message, metadata = {}) {
  return {
    severity,
    code,
    message,
    ...metadata,
  };
}

function chooseFallback(account, invoice, railsById, incidents) {
  const candidates = (account.fallbackRails || [])
    .filter((railId) => (account.allowedRails || []).includes(railId))
    .map((railId) => {
      const rail = railsById.get(railId);
      return {
        rail,
        readiness: railReadiness(rail, account, invoice, incidents),
      };
    });

  return candidates.find((candidate) => candidate.readiness.ok) || null;
}

function createDuplicateIndex(invoices) {
  const seen = new Map();
  const duplicates = new Set();

  for (const invoice of invoices) {
    if (!invoice.idempotencyKey) {
      continue;
    }

    if (seen.has(invoice.idempotencyKey)) {
      duplicates.add(invoice.idempotencyKey);
    } else {
      seen.set(invoice.idempotencyKey, invoice.id);
    }
  }

  return duplicates;
}

function evaluateInvoice(invoice, context) {
  const { accountsById, railsById, incidents, duplicateKeys } = context;
  const account = accountsById.get(invoice.accountId);

  if (!account) {
    return {
      invoiceId: invoice.id,
      accountId: invoice.accountId,
      decision: "block",
      selectedRail: null,
      findings: [
        finding(
          "critical",
          "unknown_account",
          "Invoice cannot be released because the account is not configured."
        ),
      ],
    };
  }

  const findings = [];
  const primaryRail = railsById.get(account.primaryRail);
  const primaryReadiness = railReadiness(primaryRail, account, invoice, incidents);

  if (!invoice.idempotencyKey) {
    findings.push(
      finding(
        "high",
        "missing_idempotency_key",
        "Payment release is held until duplicate charge prevention evidence is present."
      )
    );
  } else if (duplicateKeys.has(invoice.idempotencyKey)) {
    findings.push(
      finding(
        "critical",
        "duplicate_idempotency_key",
        "The same idempotency key appears on more than one invoice.",
        { idempotencyKey: invoice.idempotencyKey }
      )
    );
  }

  if (!account.reconciliationOwner) {
    findings.push(
      finding(
        "high",
        "missing_reconciliation_owner",
        "Finance reconciliation owner is required before a fallback payment rail is used."
      )
    );
  }

  if (primaryReadiness.ok && findings.length === 0) {
    const hold = primaryReadiness.hold;
    return {
      invoiceId: invoice.id,
      accountId: account.id,
      decision: hold ? "hold_for_review" : "release",
      selectedRail: primaryRail.id,
      fallbackUsed: false,
      estimatedSettlementDays: primaryRail.settlementDays,
      findings: hold
        ? [
            finding(
              "medium",
              "primary_rail_degraded",
              "Primary rail is compatible but degraded, so finance review is required."
            ),
          ]
        : [],
    };
  }

  const primaryUnavailableFinding = !primaryReadiness.ok
    ? finding(
        "info",
        "primary_rail_unavailable",
        "Primary payment rail is not ready, so a compatible fallback rail was evaluated.",
        { primaryRail: account.primaryRail, reasons: primaryReadiness.reasons }
      )
    : null;

  const fallback = chooseFallback(account, invoice, railsById, incidents);
  if (!fallback) {
    if (primaryUnavailableFinding) {
      findings.push({
        ...primaryUnavailableFinding,
        severity: "high",
        message: "Primary payment rail is not ready for this invoice.",
      });
    }

    findings.push(
      finding(
        "critical",
        "no_compatible_fallback_rail",
        "No configured fallback rail can safely process this invoice."
      )
    );

    return {
      invoiceId: invoice.id,
      accountId: account.id,
      decision: "block",
      selectedRail: null,
      fallbackUsed: false,
      findings,
    };
  }

  const fallbackRail = fallback.rail;

  if (primaryUnavailableFinding) {
    findings.push(primaryUnavailableFinding);
  }

  // 장애 상황의 대체 결제는 수익 인식보다 중복 청구와 고객 고지를 먼저 확인한다.
  if (!account.financeApprovalForFallback) {
    findings.push(
      finding(
        "medium",
        "missing_fallback_finance_approval",
        "Fallback release needs finance approval because settlement timing or fees can change."
      )
    );
  }

  if (invoice.customerNoticeRequired && !account.customerNoticeOnFile) {
    findings.push(
      finding(
        "medium",
        "missing_customer_notice",
        "Customer notice is required before moving this invoice to a fallback rail."
      )
    );
  }

  if (
    account.maxFallbackSettlementDays &&
    fallbackRail.settlementDays > account.maxFallbackSettlementDays
  ) {
    findings.push(
      finding(
        "medium",
        "fallback_settlement_window_exceeded",
        "Fallback rail settles later than the account's approved finance window.",
        {
          allowedDays: account.maxFallbackSettlementDays,
          estimatedDays: fallbackRail.settlementDays,
        }
      )
    );
  }

  const blockingFinding = findings.find((item) => item.severity === "critical");
  const reviewFinding = findings.find(
    (item) => item.severity === "high" || item.severity === "medium"
  );

  return {
    invoiceId: invoice.id,
    accountId: account.id,
    decision: blockingFinding
      ? "block"
      : reviewFinding
        ? "hold_for_review"
        : "release_with_fallback",
    selectedRail: fallbackRail.id,
    fallbackUsed: true,
    estimatedSettlementDays: fallbackRail.settlementDays,
    findings,
  };
}

function summarize(decisions) {
  return decisions.reduce(
    (summary, decision) => {
      summary.total += 1;
      summary.byDecision[decision.decision] =
        (summary.byDecision[decision.decision] || 0) + 1;
      if (decision.fallbackUsed) {
        summary.fallbackReleases += 1;
      }
      summary.findings += decision.findings.length;
      return summary;
    },
    { total: 0, fallbackReleases: 0, findings: 0, byDecision: {} }
  );
}

function evaluatePaymentRailFailoverReadiness(input) {
  const accounts = input.accounts || [];
  const rails = input.rails || [];
  const invoices = input.invoices || [];
  const incidents = input.incidents || [];

  const context = {
    accountsById: indexById(accounts),
    railsById: indexById(rails),
    incidents,
    duplicateKeys: createDuplicateIndex(invoices),
  };

  const decisions = invoices.map((invoice) => evaluateInvoice(invoice, context));
  const summary = summarize(decisions);
  const report = {
    generatedAt: input.generatedAt || "synthetic-demo",
    summary,
    decisions,
  };

  return {
    ...report,
    auditDigest: auditDigest(report),
  };
}

module.exports = {
  evaluatePaymentRailFailoverReadiness,
  auditDigest,
  supportsInvoice,
  railReadiness,
};
