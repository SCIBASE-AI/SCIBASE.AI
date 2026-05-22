const crypto = require("node:crypto");

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value, field) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`invalid date for ${field}`);
  }
  return date;
}

function remainingCents(lot) {
  return Math.max(
    0,
    Number(lot.originalCents || 0) -
      Number(lot.usedCents || 0) -
      Number(lot.refundedCents || 0)
  );
}

function requireLotFields(lot) {
  const required = [
    "id",
    "customerName",
    "issuedAt",
    "expiresAt",
    "originalCents",
    "usedCents",
    "terms",
  ];

  for (const field of required) {
    if (lot[field] === undefined || lot[field] === null || lot[field] === "") {
      throw new Error(`missing required credit lot field: ${field}`);
    }
  }
}

function evaluateLot(lot, options) {
  requireLotFields(lot);

  const asOf = parseDate(options.asOf, "asOf");
  const expiresAt = parseDate(lot.expiresAt, `expiresAt for ${lot.id}`);
  const balanceCents = remainingCents(lot);
  const daysUntilExpiry = Math.ceil((expiresAt.getTime() - asOf.getTime()) / DAY_MS);
  const terms = lot.terms || {};
  const reasons = [];
  const actions = [];

  const base = {
    id: lot.id,
    customerName: lot.customerName,
    creditType: lot.creditType || "ai_compute_top_up",
    issuedAt: lot.issuedAt,
    expiresAt: lot.expiresAt,
    balanceCents,
    daysUntilExpiry,
    recognizableBreakageCents: 0,
    refundLiabilityCents: 0,
    protectedBalanceCents: 0,
    reasons,
    actions,
  };

  if (balanceCents === 0) {
    return {
      ...base,
      status: "depleted",
      reasons: ["credit lot has no remaining balance"],
      actions: ["No revenue action required"],
    };
  }

  if (terms.grantFunded || terms.noExpiration || terms.expirationProhibited) {
    reasons.push(
      terms.grantFunded
        ? "grant or contract terms prohibit expiration"
        : "credit terms do not permit expiration"
    );
    actions.push(
      "Carry balance forward",
      "Exclude from automated breakage recognition",
      "Attach grant or customer contract evidence"
    );
    return {
      ...base,
      status: "protected",
      protectedBalanceCents: balanceCents,
      actions,
    };
  }

  if (lot.refundWindowOpen || lot.activeRefundRequest) {
    reasons.push(
      lot.activeRefundRequest
        ? "customer refund request is active"
        : "refund window remains open"
    );
    actions.push(
      "Reserve as refund liability",
      "Do not recognize breakage until refund rights close",
      "Route to finance review"
    );
    return {
      ...base,
      status: "refund_liability",
      refundLiabilityCents: balanceCents,
      actions,
    };
  }

  if (daysUntilExpiry > options.expiringSoonDays) {
    reasons.push("credit lot remains active");
    actions.push(
      "Keep credits usable",
      "Monitor drawdown before the next close cycle"
    );
    return {
      ...base,
      status: "usable",
      actions,
    };
  }

  if (daysUntilExpiry >= 0) {
    reasons.push("credit lot is approaching expiration");
    actions.push(
      "Send expiration notice before recognizing any breakage",
      "Keep credits usable through the expiration deadline"
    );
    return {
      ...base,
      status: "notice_due",
      actions,
    };
  }

  if (!terms.allowsBreakageRecognition) {
    reasons.push("terms do not explicitly allow breakage recognition");
  }

  if (!lot.noticeSentAt) {
    reasons.push("customer notice evidence is missing");
  }

  if (!lot.refundWindowClosed) {
    reasons.push("refund window closure evidence is missing");
  }

  if (lot.activeDispute) {
    reasons.push("active dispute prevents revenue close");
  }

  if (reasons.length > 0) {
    actions.push(
      "Hold balance out of recognized revenue",
      "Send final notice or collect missing evidence",
      "Route to finance review before close"
    );
    return {
      ...base,
      status: "finance_hold",
      actions,
    };
  }

  return {
    ...base,
    status: "breakage_ready",
    recognizableBreakageCents: balanceCents,
    reasons: [
      "credit expired",
      "terms allow breakage recognition",
      "notice and refund closure evidence are present",
    ],
    actions: [
      "Recognize breakage after finance approval",
      "Attach customer notice and terms evidence",
      "Record audit digest in revenue close packet",
    ],
  };
}

function analyzeCreditBreakage(lots, options = {}) {
  if (!Array.isArray(lots)) {
    throw new Error("credit lots must be an array");
  }

  const normalizedOptions = {
    asOf: parseDate(options.asOf || new Date().toISOString(), "asOf").toISOString(),
    expiringSoonDays: Number(options.expiringSoonDays ?? 30),
  };

  const evaluatedLots = lots.map((lot) => evaluateLot(lot, normalizedOptions));
  const totals = evaluatedLots.reduce(
    (acc, lot) => {
      acc.openBalanceCents += lot.balanceCents;
      acc.breakageEligibleCents += lot.recognizableBreakageCents;
      acc.refundLiabilityCents += lot.refundLiabilityCents;
      acc.protectedBalanceCents += lot.protectedBalanceCents;

      if (lot.status === "notice_due") {
        acc.noticeDueCents += lot.balanceCents;
      }
      if (lot.status === "finance_hold") {
        acc.financeHoldCents += lot.balanceCents;
      }
      if (lot.status === "usable") {
        acc.usableBalanceCents += lot.balanceCents;
      }
      return acc;
    },
    {
      openBalanceCents: 0,
      breakageEligibleCents: 0,
      noticeDueCents: 0,
      refundLiabilityCents: 0,
      financeHoldCents: 0,
      protectedBalanceCents: 0,
      usableBalanceCents: 0,
    }
  );

  const result = {
    asOf: normalizedOptions.asOf,
    expiringSoonDays: normalizedOptions.expiringSoonDays,
    totals,
    lots: evaluatedLots,
  };

  return {
    ...result,
    auditDigest: createAuditDigest(result),
  };
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function createAuditDigest(result) {
  const payload = {
    asOf: result.asOf,
    totals: result.totals,
    lots: result.lots.map((lot) => ({
      id: lot.id,
      status: lot.status,
      balanceCents: lot.balanceCents,
      recognizableBreakageCents: lot.recognizableBreakageCents,
      refundLiabilityCents: lot.refundLiabilityCents,
      protectedBalanceCents: lot.protectedBalanceCents,
      reasons: lot.reasons,
    })),
  };

  return crypto.createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function formatDollars(cents) {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function renderMarkdownReport(result) {
  const rows = result.lots
    .map(
      (lot) =>
        `| ${lot.id} | ${lot.status} | ${formatDollars(lot.balanceCents)} | ${formatDollars(
          lot.recognizableBreakageCents
        )} | ${lot.actions[0]} |`
    )
    .join("\n");

  return `# Prepaid Compute Credit Breakage Review

As of: ${result.asOf}
Audit digest: ${result.auditDigest}

## Revenue Close Totals

- Open balance: ${formatDollars(result.totals.openBalanceCents)}
- Breakage eligible: ${formatDollars(result.totals.breakageEligibleCents)}
- Notice due: ${formatDollars(result.totals.noticeDueCents)}
- Refund liability: ${formatDollars(result.totals.refundLiabilityCents)}
- Finance hold: ${formatDollars(result.totals.financeHoldCents)}
- Protected balance: ${formatDollars(result.totals.protectedBalanceCents)}
- Currently usable: ${formatDollars(result.totals.usableBalanceCents)}

## Lot Decisions

| Lot | Status | Balance | Recognizable | First action |
| --- | --- | ---: | ---: | --- |
${rows}
`;
}

function renderSvgSummary(result) {
  const statusColors = {
    breakage_ready: "#15803d",
    notice_due: "#d97706",
    refund_liability: "#b91c1c",
    finance_hold: "#7c3aed",
    protected: "#0369a1",
    usable: "#4b5563",
    depleted: "#9ca3af",
  };

  const bars = result.lots
    .map((lot, index) => {
      const width = Math.max(32, Math.round((lot.balanceCents / result.totals.openBalanceCents) * 780));
      const y = 230 + index * 58;
      const color = statusColors[lot.status] || "#4b5563";
      return `<g>
  <text x="80" y="${y - 8}" font-size="18" fill="#111827">${lot.id}</text>
  <rect x="80" y="${y}" width="${width}" height="24" rx="4" fill="${color}" />
  <text x="${Math.min(880, 96 + width)}" y="${y + 18}" font-size="16" fill="#111827">${lot.status} ${formatDollars(lot.balanceCents)}</text>
</g>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="900" viewBox="0 0 1280 900">
  <rect width="1280" height="900" fill="#f8fafc"/>
  <text x="80" y="90" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#111827">Prepaid Compute Credit Breakage Guard</text>
  <text x="80" y="136" font-family="Arial, sans-serif" font-size="22" fill="#374151">Revenue close review for AI compute top-up credits</text>
  <g font-family="Arial, sans-serif">
    <rect x="80" y="165" width="1120" height="42" rx="6" fill="#e5e7eb"/>
    <text x="105" y="193" font-size="20" fill="#111827">Open ${formatDollars(result.totals.openBalanceCents)} | Breakage ${formatDollars(result.totals.breakageEligibleCents)} | Holds ${formatDollars(result.totals.financeHoldCents)} | Refunds ${formatDollars(result.totals.refundLiabilityCents)}</text>
    ${bars}
    <text x="80" y="830" font-size="16" fill="#374151">Audit digest: ${result.auditDigest}</text>
  </g>
</svg>
`;
}

module.exports = {
  analyzeCreditBreakage,
  createAuditDigest,
  renderMarkdownReport,
  renderSvgSummary,
};
