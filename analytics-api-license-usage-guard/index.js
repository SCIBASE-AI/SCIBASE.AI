const crypto = require("node:crypto");

const ALLOW = "allow";
const BILL_OVERAGE = "bill_overage";
const THROTTLE = "throttle";
const BLOCK = "block";

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
      customerId: decision.customerId,
      status: decision.status,
      billableUnits: decision.billableUnits,
      reasons: decision.reasons,
    })),
  };

  return crypto.createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function licenseLookup(licenses) {
  const lookup = new Map();
  for (const license of licenses) {
    requireFields(
      license,
      [
        "customerId",
        "tier",
        "active",
        "monthlyQuota",
        "usedThisMonth",
        "burstLimitPerMinute",
        "allowedDatasets",
        "allowedTopics",
        "minimumCohortSize",
        "overageAuthorized",
      ],
      "license"
    );
    lookup.set(license.customerId, license);
  }
  return lookup;
}

function evaluateRequest(request, licenses) {
  requireFields(
    request,
    [
      "id",
      "customerId",
      "dataset",
      "topic",
      "estimatedRows",
      "cohortSize",
      "queryUnits",
      "requestsLastMinute",
      "includesPrivateContent",
      "requestedAt",
    ],
    "analytics request"
  );

  const license = licenses.get(request.customerId);
  const reasons = [];
  const actions = [];
  const base = {
    id: request.id,
    customerId: request.customerId,
    dataset: request.dataset,
    topic: request.topic,
    queryUnits: Number(request.queryUnits),
    billableUnits: 0,
    status: BLOCK,
    reasons,
    actions,
  };

  if (!license) {
    return {
      ...base,
      reasons: ["customer has no analytics API license"],
      actions: ["Block query and route account to revenue operations"],
    };
  }

  if (!license.active) {
    reasons.push("analytics API license is inactive");
  }
  if (!license.allowedDatasets.includes(request.dataset)) {
    reasons.push("dataset is not included in the licensed analytics package");
  }
  if (!license.allowedTopics.includes(request.topic)) {
    reasons.push("topic is outside licensed usage scope");
  }
  if (request.includesPrivateContent) {
    reasons.push("query attempts to access private content rather than anonymized metadata");
  }
  if (request.cohortSize < license.minimumCohortSize) {
    reasons.push("cohort size is below anonymization threshold");
  }

  if (reasons.length > 0) {
    return {
      ...base,
      status: BLOCK,
      reasons,
      actions: [
        "Block analytics response",
        "Log revenue and privacy audit event",
        "Show permitted datasets, topics, and anonymization requirements",
      ],
    };
  }

  if (request.requestsLastMinute > license.burstLimitPerMinute) {
    return {
      ...base,
      status: THROTTLE,
      reasons: ["request burst exceeds licensed per-minute API limit"],
      actions: [
        "Throttle query before execution",
        "Preserve request for API usage dashboard",
      ],
    };
  }

  const projectedUsage = Number(license.usedThisMonth) + Number(request.queryUnits);
  if (projectedUsage > Number(license.monthlyQuota)) {
    if (!license.overageAuthorized) {
      return {
        ...base,
        status: THROTTLE,
        reasons: ["monthly query quota would be exceeded and overage is not authorized"],
        actions: [
          "Throttle query until renewal or account approval",
          "Offer overage authorization workflow",
        ],
      };
    }

    return {
      ...base,
      status: BILL_OVERAGE,
      billableUnits: base.queryUnits,
      reasons: ["query exceeds quota but overage billing is authorized"],
      actions: [
        "Serve anonymized analytics response",
        "Record overage units for invoice line item",
      ],
    };
  }

  return {
    ...base,
    status: ALLOW,
    billableUnits: base.queryUnits,
    reasons: ["query is inside license, privacy, quota, and burst limits"],
    actions: [
      "Serve anonymized analytics response",
      "Record billable usage units",
    ],
  };
}

function analyzeAnalyticsApiUsage(packet, options = {}) {
  requireFields(packet, ["licenses", "requests"], "analytics API packet");
  if (!Array.isArray(packet.licenses) || !Array.isArray(packet.requests)) {
    throw new Error("licenses and requests must be arrays");
  }

  const licenses = licenseLookup(packet.licenses);
  const decisions = packet.requests.map((request) => evaluateRequest(request, licenses));
  const totals = decisions.reduce(
    (acc, decision) => {
      acc.totalRequests += 1;
      acc.billableUnits += decision.billableUnits;
      acc.byStatus[decision.status] = (acc.byStatus[decision.status] || 0) + 1;
      return acc;
    },
    {
      totalRequests: 0,
      billableUnits: 0,
      byStatus: {},
    }
  );
  const result = {
    asOf: options.asOf || packet.asOf || new Date().toISOString(),
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
    "# Analytics API License Usage Guard",
    "",
    `As of: ${result.asOf}`,
    `Audit digest: \`${result.auditDigest}\``,
    "",
    "## Totals",
    "",
    `- Requests evaluated: ${result.totals.totalRequests}`,
    `- Billable units: ${result.totals.billableUnits}`,
  ];

  for (const [status, count] of Object.entries(result.totals.byStatus).sort()) {
    lines.push(`- ${status}: ${count}`);
  }

  lines.push("", "## Query Decisions", "");
  for (const decision of result.decisions) {
    lines.push(
      `### ${decision.id}`,
      "",
      `- Customer: ${decision.customerId}`,
      `- Dataset: ${decision.dataset}`,
      `- Topic: ${decision.topic}`,
      `- Status: ${decision.status}`,
      `- Billable units: ${decision.billableUnits}`,
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
  const rows = Object.entries(result.totals.byStatus)
    .sort()
    .map(([status, count], index) => {
      const y = 154 + index * 46;
      const width = Math.max(44, count * 92);
      return `<text x="58" y="${y + 23}" class="label">${escapeXml(status)}</text>
  <rect x="256" y="${y}" width="${width}" height="28" rx="5" class="bar"/>
  <text x="${268 + width}" y="${y + 22}" class="value">${count}</text>`;
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
    .bar{fill:#10b981}
    .digest{font:400 15px monospace;fill:#334155}
  </style>
  <rect class="bg" width="960" height="540"/>
  <rect class="panel" x="28" y="28" width="904" height="484" rx="16"/>
  <text x="58" y="82" class="title">Analytics API License Usage Guard</text>
  <text x="58" y="116" class="meta">Requests ${result.totals.totalRequests} | Billable units ${result.totals.billableUnits}</text>
  ${rows}
  <text x="58" y="482" class="digest">audit ${escapeXml(result.auditDigest.slice(0, 48))}</text>
</svg>
`;
}

module.exports = {
  ALLOW,
  BILL_OVERAGE,
  THROTTLE,
  BLOCK,
  analyzeAnalyticsApiUsage,
  createAuditDigest,
  renderMarkdownReport,
  renderSvgSummary,
};
