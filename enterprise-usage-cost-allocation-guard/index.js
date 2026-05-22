const crypto = require("node:crypto");

const APPROVED = "approved";
const HOLD = "hold";
const REALLOCATE = "reallocate";
const PRIVATE_REVIEW = "private_review";

function parseDate(value, label) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`invalid date for ${label}`);
  }
  return date;
}

function requireFields(value, fields, label) {
  for (const field of fields) {
    if (value[field] === undefined || value[field] === null || value[field] === "") {
      throw new Error(`missing required ${label} field: ${field}`);
    }
  }
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
    decisions: result.decisions.map((decision) => ({
      id: decision.id,
      status: decision.status,
      labId: decision.labId,
      grantId: decision.grantId,
      amountUsd: decision.amountUsd,
      reasons: decision.reasons,
    })),
  };

  return crypto.createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function buildLookup(items, key) {
  const lookup = new Map();
  for (const item of items || []) {
    requireFields(item, [key], key);
    lookup.set(item[key], item);
  }
  return lookup;
}

function withinWindow(date, start, end) {
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

function evaluateUsage(record, context) {
  requireFields(
    record,
    [
      "id",
      "labId",
      "projectId",
      "projectVisibility",
      "usageType",
      "amountUsd",
      "costCenterId",
      "grantId",
      "ownerId",
      "occurredAt",
    ],
    "usage"
  );

  const lab = context.labs.get(record.labId);
  const grant = context.grants.get(record.grantId);
  const occurredAt = parseDate(record.occurredAt, `occurredAt for ${record.id}`);
  const reasons = [];
  const actions = [];
  const base = {
    id: record.id,
    labId: record.labId,
    projectId: record.projectId,
    projectVisibility: record.projectVisibility,
    usageType: record.usageType,
    amountUsd: Number(record.amountUsd),
    costCenterId: record.costCenterId,
    grantId: record.grantId,
    ownerId: record.ownerId,
    approvedAmountUsd: 0,
    heldAmountUsd: 0,
    reallocatedAmountUsd: 0,
    reasons,
    actions,
  };

  if (!lab) reasons.push("lab is not registered for enterprise allocation");
  if (!grant) reasons.push("grant is not registered for chargeback");
  if (!Array.isArray(record.evidenceIds) || record.evidenceIds.length === 0) {
    reasons.push("usage record has no immutable job/export evidence");
  }

  if (!Number.isFinite(base.amountUsd) || base.amountUsd <= 0) {
    reasons.push("amount must be a positive number");
  }

  if (reasons.length > 0) {
    return {
      ...base,
      status: HOLD,
      heldAmountUsd: base.amountUsd,
      actions: [
        "Hold chargeback from dashboard totals",
        "Request missing lab, grant, amount, or evidence mapping",
      ],
    };
  }

  const grantStart = parseDate(grant.startsAt, `grant ${grant.grantId} startsAt`);
  const grantEnd = parseDate(grant.endsAt, `grant ${grant.grantId} endsAt`);
  const labAllowsCostCenter = lab.activeCostCenters.includes(record.costCenterId);
  const grantAllowsCostCenter = grant.allowedCostCenters.includes(record.costCenterId);
  const grantAllowsUsage = grant.allowedUsageTypes.includes(record.usageType);
  const ownerAllowed = lab.ownerIds.includes(record.ownerId);

  if (!withinWindow(occurredAt, grantStart, grantEnd)) {
    return {
      ...base,
      status: HOLD,
      heldAmountUsd: base.amountUsd,
      reasons: ["usage occurred outside the grant funding window"],
      actions: [
        "Exclude from automated grant chargeback",
        "Route to enterprise finance review",
      ],
    };
  }

  if (!ownerAllowed) {
    return {
      ...base,
      status: HOLD,
      heldAmountUsd: base.amountUsd,
      reasons: ["usage owner is not authorized for the lab cost center"],
      actions: [
        "Hold chargeback",
        "Ask lab admin to confirm owner sponsorship",
      ],
    };
  }

  if (!labAllowsCostCenter || !grantAllowsCostCenter || !grantAllowsUsage) {
    return {
      ...base,
      status: REALLOCATE,
      reallocatedAmountUsd: base.amountUsd,
      reasons: [
        !labAllowsCostCenter
          ? "cost center is not active for this lab"
          : "grant does not permit this cost center or usage type",
      ],
      actions: [
        "Remove from grant spend until reallocated",
        "Suggest a permitted lab cost center before dashboard publication",
      ],
    };
  }

  if (record.projectVisibility === "private" || record.privateDataClass) {
    return {
      ...base,
      status: PRIVATE_REVIEW,
      heldAmountUsd: base.amountUsd,
      reasons: [
        "private or restricted project usage needs admin visibility review before chargeback",
      ],
      actions: [
        "Show aggregate spend only",
        "Suppress project title from department dashboard",
        "Require admin approval before grant closeout export",
      ],
    };
  }

  return {
    ...base,
    status: APPROVED,
    approvedAmountUsd: base.amountUsd,
    reasons: [
      "usage evidence, grant window, cost center, usage type, and owner all match",
    ],
    actions: [
      "Publish in admin dashboard allocation",
      "Include in grant chargeback export packet",
    ],
  };
}

function analyzeEnterpriseUsage(packet, options = {}) {
  requireFields(packet, ["labs", "grants", "usageRecords"], "enterprise packet");

  const context = {
    labs: buildLookup(packet.labs, "labId"),
    grants: buildLookup(packet.grants, "grantId"),
  };
  const asOf = parseDate(options.asOf || packet.asOf || new Date().toISOString(), "asOf");
  const decisions = packet.usageRecords.map((record) => evaluateUsage(record, context));
  const totals = decisions.reduce(
    (acc, decision) => {
      acc.totalRecords += 1;
      acc.totalAmountUsd += decision.amountUsd;
      acc.approvedAmountUsd += decision.approvedAmountUsd;
      acc.heldAmountUsd += decision.heldAmountUsd;
      acc.reallocatedAmountUsd += decision.reallocatedAmountUsd;
      acc.byStatus[decision.status] = (acc.byStatus[decision.status] || 0) + 1;
      return acc;
    },
    {
      totalRecords: 0,
      totalAmountUsd: 0,
      approvedAmountUsd: 0,
      heldAmountUsd: 0,
      reallocatedAmountUsd: 0,
      byStatus: {},
    }
  );

  const result = {
    asOf: asOf.toISOString(),
    totals,
    decisions,
  };

  return {
    ...result,
    auditDigest: createAuditDigest(result),
  };
}

function renderMarkdownReport(result) {
  const lines = [
    "# Enterprise Usage Cost Allocation Guard",
    "",
    `As of: ${result.asOf}`,
    `Audit digest: \`${result.auditDigest}\``,
    "",
    "## Totals",
    "",
    `- Usage records: ${result.totals.totalRecords}`,
    `- Total usage amount: $${result.totals.totalAmountUsd.toFixed(2)}`,
    `- Approved amount: $${result.totals.approvedAmountUsd.toFixed(2)}`,
    `- Held amount: $${result.totals.heldAmountUsd.toFixed(2)}`,
    `- Reallocated amount: $${result.totals.reallocatedAmountUsd.toFixed(2)}`,
  ];

  for (const [status, count] of Object.entries(result.totals.byStatus).sort()) {
    lines.push(`- ${status}: ${count}`);
  }

  lines.push("", "## Allocation Decisions", "");
  for (const decision of result.decisions) {
    lines.push(
      `### ${decision.id}`,
      "",
      `- Project: ${decision.projectId}`,
      `- Lab: ${decision.labId}`,
      `- Grant: ${decision.grantId}`,
      `- Amount: $${decision.amountUsd.toFixed(2)}`,
      `- Status: ${decision.status}`,
      `- Reasons: ${decision.reasons.join("; ")}`,
      `- Actions: ${decision.actions.join("; ")}`,
      ""
    );
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSvgSummary(result) {
  const statuses = Object.entries(result.totals.byStatus).sort();
  const rows = statuses
    .map(([status, count], index) => {
      const y = 160 + index * 46;
      const width = Math.max(44, count * 92);
      return `<text x="58" y="${y + 23}" class="label">${escapeXml(status)}</text>
  <rect x="285" y="${y}" width="${width}" height="28" rx="5" class="bar"/>
  <text x="${297 + width}" y="${y + 22}" class="value">${count}</text>`;
    })
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <style>
    .bg{fill:#111827}
    .panel{fill:#f8fafc}
    .title{font:700 34px Arial,sans-serif;fill:#0f172a}
    .meta{font:400 18px Arial,sans-serif;fill:#475569}
    .label{font:600 20px Arial,sans-serif;fill:#1e293b}
    .value{font:700 20px Arial,sans-serif;fill:#0f172a}
    .bar{fill:#38bdf8}
    .digest{font:400 15px monospace;fill:#334155}
  </style>
  <rect class="bg" width="960" height="540"/>
  <rect class="panel" x="28" y="28" width="904" height="484" rx="16"/>
  <text x="58" y="82" class="title">Enterprise Usage Cost Allocation Guard</text>
  <text x="58" y="116" class="meta">Approved $${result.totals.approvedAmountUsd.toFixed(2)} / Held $${result.totals.heldAmountUsd.toFixed(2)} / Reallocate $${result.totals.reallocatedAmountUsd.toFixed(2)}</text>
  ${rows}
  <text x="58" y="482" class="digest">audit ${escapeXml(result.auditDigest.slice(0, 48))}</text>
</svg>
`;
}

module.exports = {
  APPROVED,
  HOLD,
  REALLOCATE,
  PRIVATE_REVIEW,
  analyzeEnterpriseUsage,
  createAuditDigest,
  renderMarkdownReport,
  renderSvgSummary,
};
