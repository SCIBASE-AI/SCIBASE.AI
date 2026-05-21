const fs = require("fs");
const path = require("path");

const DEFAULT_POLICY = {
  allowedProviders: ["stripe", "paypal", "institutional_invoice"],
  maxSignatureAgeMinutes: 10,
  requireLiveModeForActivation: true,
  paidEventTypes: ["invoice.paid", "checkout.session.completed", "payment.capture.completed", "invoice.approved_paid"],
  reversalEventTypes: ["charge.refunded", "refund.succeeded", "charge.dispute.created", "payment.reversed"],
  lifecyclePrerequisites: {
    "invoice.paid": ["invoice.finalized"],
    "checkout.session.completed": ["checkout.session.created"],
    "payment.capture.completed": ["payment.authorization.created"],
    "invoice.approved_paid": ["invoice.approved"]
  }
};

function normalize(value) {
  return String(value || "").trim();
}

function lower(value) {
  return normalize(value).toLowerCase();
}

function cents(value) {
  return Math.round(Number(value || 0));
}

function issue(kind, severity, itemId, message, evidence = {}) {
  return { kind, severity, itemId, message, evidence };
}

function byId(items, key = "id") {
  const map = new Map();
  for (const item of items || []) {
    map.set(item[key], item);
  }
  return map;
}

function eventTimestamp(event) {
  const value = Date.parse(event.createdAt || "");
  return Number.isFinite(value) ? value : 0;
}

function eventSort(a, b) {
  return eventTimestamp(a) - eventTimestamp(b) || normalize(a.id).localeCompare(normalize(b.id));
}

function evaluatePaymentWebhookActivation(packet, policyOverrides = {}) {
  const policy = { ...DEFAULT_POLICY, ...(packet.policy || {}), ...policyOverrides };
  const orders = Array.isArray(packet.orders) ? packet.orders : [];
  const events = Array.isArray(packet.events) ? packet.events : [];
  const grants = Array.isArray(packet.existingGrants) ? packet.existingGrants : [];
  const orderMap = byId(orders);
  const eventCounts = new Map();
  const seenEventTypesByInvoice = new Map();
  const paidOrders = new Map();
  const blockers = [];
  const warnings = [];
  const activationPlan = [];
  const reversals = [];

  for (const event of events) {
    eventCounts.set(event.id, (eventCounts.get(event.id) || 0) + 1);
  }

  const sortedEvents = [...events].sort(eventSort);
  for (const event of sortedEvents) {
    const id = event.id || "event";
    const provider = lower(event.provider);
    const type = normalize(event.type);
    const order = orderMap.get(event.orderId);
    const invoiceKey = event.invoiceId || event.orderId || id;
    const previousTypes = seenEventTypesByInvoice.get(invoiceKey) || new Set();

    if (eventCounts.get(event.id) > 1) {
      blockers.push(issue("duplicate_webhook_event_id", "blocker", id, "Duplicate webhook event IDs must not grant paid entitlements twice.", {
        duplicateCount: eventCounts.get(event.id)
      }));
    }

    if (!policy.allowedProviders.includes(provider)) {
      blockers.push(issue("unknown_payment_provider", "blocker", id, "Webhook provider is not enabled for revenue activation.", { provider }));
    }

    if (!event.signatureValid) {
      blockers.push(issue("invalid_webhook_signature", "blocker", id, "Webhook signature failed verification.", {}));
    }

    if (Number(event.signatureAgeMinutes) > policy.maxSignatureAgeMinutes) {
      blockers.push(
        issue("stale_webhook_signature", "blocker", id, "Webhook signature is outside the accepted replay window.", {
          signatureAgeMinutes: Number(event.signatureAgeMinutes),
          maxSignatureAgeMinutes: policy.maxSignatureAgeMinutes
        })
      );
    }

    if (policy.requireLiveModeForActivation && policy.paidEventTypes.includes(type) && event.livemode !== true) {
      blockers.push(issue("test_mode_payment_activation", "blocker", id, "Test-mode payment event cannot activate paid features.", {}));
    }

    if (!order) {
      blockers.push(issue("missing_order_reference", "blocker", id, "Webhook does not map to a known order or invoice.", {
        orderId: event.orderId
      }));
    }

    if (order && policy.paidEventTypes.includes(type)) {
      const amountMatches = cents(event.amount) === cents(order.amountDue);
      const currencyMatches = lower(event.currency) === lower(order.currency);
      if (!amountMatches || !currencyMatches) {
        blockers.push(
          issue("amount_or_currency_mismatch", "blocker", id, "Paid webhook amount/currency does not match the order.", {
            eventAmount: cents(event.amount),
            orderAmount: cents(order.amountDue),
            eventCurrency: event.currency,
            orderCurrency: order.currency
          })
        );
      }

      const prerequisites = policy.lifecyclePrerequisites[type] || [];
      const missingPrerequisites = prerequisites.filter((requiredType) => !previousTypes.has(requiredType));
      if (missingPrerequisites.length) {
        blockers.push(
          issue("out_of_order_webhook_lifecycle", "blocker", id, "Paid webhook arrived before required lifecycle events.", {
            missingPrerequisites
          })
        );
      }

      const existingOrderGrants = grants.filter((grant) => grant.orderId === order.id);
      if (existingOrderGrants.length || paidOrders.has(order.id)) {
        blockers.push(
          issue("double_credit_entitlement_grant", "blocker", id, "Order already has an entitlement grant or paid event.", {
            priorGrantIds: existingOrderGrants.map((grant) => grant.grantId),
            priorEventId: paidOrders.get(order.id)
          })
        );
      }

      if (order.status === "cancelled" || order.status === "void") {
        blockers.push(issue("cancelled_order_payment", "blocker", id, "Cancelled or void order cannot activate entitlements.", {
          orderStatus: order.status
        }));
      }

      paidOrders.set(order.id, id);
      activationPlan.push({
        eventId: id,
        orderId: order.id,
        accountId: order.accountId,
        grant: order.entitlementGrant,
        ready: true
      });
    }

    if (policy.reversalEventTypes.includes(type)) {
      reversals.push({
        eventId: id,
        orderId: event.orderId,
        accountId: order ? order.accountId : event.accountId,
        action: "hold_or_reverse_entitlements",
        reason: type
      });
      blockers.push(
        issue("payment_reversal_requires_entitlement_hold", "blocker", id, "Refund, dispute, or reversal event requires entitlement hold/reconciliation.", {
          type
        })
      );
    }

    if (!previousTypes.has(type)) {
      previousTypes.add(type);
    } else if (!policy.paidEventTypes.includes(type)) {
      warnings.push(issue("repeated_non_paid_lifecycle_event", "warning", id, "Repeated lifecycle event should be idempotently ignored.", { type }));
    }
    seenEventTypesByInvoice.set(invoiceKey, previousTypes);
  }

  const activationSafe = blockers.length === 0;
  return {
    accountId: packet.accountId || "multi-account",
    generatedAt: packet.generatedAt || new Date().toISOString(),
    status: activationSafe ? "activate_paid_entitlements" : "hold_entitlement_activation",
    summary: {
      ordersChecked: orders.length,
      eventsChecked: events.length,
      existingGrantsChecked: grants.length,
      blockers: blockers.length,
      warnings: warnings.length,
      activationCandidates: activationPlan.length,
      reversals: reversals.length
    },
    revenuePacket: {
      blockers,
      warnings,
      activationPlan: activationSafe ? activationPlan : [],
      blockedActivationPlan: activationSafe ? [] : activationPlan,
      reversals,
      recommendation: activationSafe
        ? "Activate paid entitlements and record webhook event IDs as consumed."
        : "Hold activation, reconcile webhooks, and do not grant paid features or AI compute credits."
    }
  };
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildMarkdownReport(result) {
  const lines = [
    "# Payment Webhook Entitlement Guard Report",
    "",
    `Account scope: ${result.accountId}`,
    `Status: ${result.status}`,
    `Generated: ${result.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Orders checked: ${result.summary.ordersChecked}`,
    `- Events checked: ${result.summary.eventsChecked}`,
    `- Existing grants checked: ${result.summary.existingGrantsChecked}`,
    `- Blockers: ${result.summary.blockers}`,
    `- Warnings: ${result.summary.warnings}`,
    `- Activation candidates: ${result.summary.activationCandidates}`,
    `- Reversals: ${result.summary.reversals}`,
    "",
    "## Recommendation",
    "",
    result.revenuePacket.recommendation,
    "",
    "## Blockers",
    ""
  ];

  if (!result.revenuePacket.blockers.length) {
    lines.push("- None");
  } else {
    for (const blocker of result.revenuePacket.blockers) {
      lines.push(`- ${blocker.itemId}: ${blocker.kind} - ${blocker.message}`);
    }
  }

  lines.push("", "## Activation Plan", "");
  const plan = result.revenuePacket.activationPlan.length ? result.revenuePacket.activationPlan : result.revenuePacket.blockedActivationPlan;
  if (!plan.length) {
    lines.push("- None");
  } else {
    for (const grant of plan) {
      lines.push(`- order ${grant.orderId}: event ${grant.eventId}, account ${grant.accountId}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function buildSvgSummary(result) {
  const statusColor = result.status === "activate_paid_entitlements" ? "#1f8f5f" : "#b42318";
  const bars = [
    ["Orders", result.summary.ordersChecked, "#2563eb"],
    ["Events", result.summary.eventsChecked, "#0f766e"],
    ["Blockers", result.summary.blockers, "#b42318"],
    ["Warnings", result.summary.warnings, "#b26b00"],
    ["Candidates", result.summary.activationCandidates, "#7c3aed"],
    ["Reversals", result.summary.reversals, "#475467"]
  ];
  const maxValue = Math.max(1, ...bars.map((bar) => bar[1]));
  const rows = bars
    .map(([label, value, color], index) => {
      const y = 165 + index * 48;
      const width = Math.max(8, Math.round((value / maxValue) * 520));
      return `
        <text x="72" y="${y + 23}" font-size="21" fill="#18202f">${escapeXml(label)}</text>
        <rect x="220" y="${y}" width="560" height="28" rx="6" fill="#edf2f7"/>
        <rect x="220" y="${y}" width="${width}" height="28" rx="6" fill="${color}"/>
        <text x="802" y="${y + 22}" font-size="21" fill="#18202f">${value}</text>
      `;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#f7fafc"/>
  <rect x="48" y="44" width="1184" height="632" rx="16" fill="#ffffff" stroke="#d8dee8"/>
  <text x="72" y="104" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#101828">Payment Webhook Entitlement Guard</text>
  <text x="72" y="143" font-family="Arial, sans-serif" font-size="22" fill="#475467">Revenue activation packet for ${escapeXml(result.accountId)}</text>
  <rect x="855" y="82" width="330" height="48" rx="10" fill="${statusColor}"/>
  <text x="875" y="114" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#ffffff">${escapeXml(result.status)}</text>
  <g font-family="Arial, sans-serif">${rows}</g>
  <text x="72" y="510" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#101828">Finance decision</text>
  <text x="72" y="550" font-family="Arial, sans-serif" font-size="22" fill="#344054">${escapeXml(result.revenuePacket.recommendation)}</text>
  <text x="72" y="620" font-family="Arial, sans-serif" font-size="18" fill="#667085">Synthetic data only. No live payment credentials. Deterministic local demo.</text>
</svg>
`;
}

function writeReportBundle(result, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, "webhook-entitlement-packet.json");
  const markdownPath = path.join(outputDir, "webhook-entitlement-report.md");
  const svgPath = path.join(outputDir, "summary.svg");
  fs.writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`);
  fs.writeFileSync(markdownPath, buildMarkdownReport(result));
  fs.writeFileSync(svgPath, buildSvgSummary(result));
  return { jsonPath, markdownPath, svgPath };
}

module.exports = {
  DEFAULT_POLICY,
  evaluatePaymentWebhookActivation,
  buildMarkdownReport,
  buildSvgSummary,
  writeReportBundle
};
