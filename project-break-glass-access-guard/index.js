const crypto = require("node:crypto");

const APPROVED = "approved";
const APPROVE_WITH_REVIEW = "approve_with_review";
const STEWARD_REVIEW = "steward_review";
const DENIED = "denied";

const ALLOWED_ROLES = new Set(["Owner", "Admin"]);
const ALLOWED_REASON_CODES = new Set([
  "incident_response",
  "submission_deadline",
  "compliance_deadline",
  "owner_unavailable",
]);

function requireFields(value, fields, label) {
  for (const field of fields) {
    if (value[field] === undefined || value[field] === null || value[field] === "") {
      throw new Error(`missing required ${label} field: ${field}`);
    }
  }
}

function parseDate(value, label) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`invalid date for ${label}`);
  }
  return date;
}

function minutesBetween(a, b) {
  return Math.round((b.getTime() - a.getTime()) / 60000);
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
      projectId: decision.projectId,
      status: decision.status,
      expiresInMinutes: decision.expiresInMinutes,
      reasons: decision.reasons,
    })),
  };

  return crypto.createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function projectLookup(projects) {
  const lookup = new Map();
  for (const project of projects) {
    requireFields(
      project,
      ["projectId", "owners", "admins", "protectedDataClasses", "lockedSections"],
      "project"
    );
    lookup.set(project.projectId, project);
  }
  return lookup;
}

function hasProtectedDataRequest(request, project) {
  return (request.requestedDataClasses || []).some((dataClass) =>
    project.protectedDataClasses.includes(dataClass)
  );
}

function hasLeastPrivilegeScope(request) {
  const scopes = request.requestedScopes || [];
  return scopes.length > 0 && scopes.every((scope) => /:(read|write)$/.test(scope));
}

function approvedByProjectOwner(request, project) {
  const approvals = new Set(request.sponsorApprovals || []);
  return project.owners.some((owner) => approvals.has(owner));
}

function evaluateRequest(request, context) {
  requireFields(
    request,
    [
      "id",
      "projectId",
      "requesterId",
      "requesterRole",
      "reasonCode",
      "reasonDetail",
      "requestedScopes",
      "requestedDataClasses",
      "requestedAt",
      "expiresAt",
      "mfaVerifiedAt",
    ],
    "break-glass request"
  );

  const project = context.projects.get(request.projectId);
  const requestedAt = parseDate(request.requestedAt, `requestedAt for ${request.id}`);
  const expiresAt = parseDate(request.expiresAt, `expiresAt for ${request.id}`);
  const mfaVerifiedAt = parseDate(request.mfaVerifiedAt, `mfaVerifiedAt for ${request.id}`);
  const postReviewDueAt = parseDate(
    request.postReviewDueAt,
    `postReviewDueAt for ${request.id}`
  );
  const reasons = [];
  const actions = [];
  const base = {
    id: request.id,
    projectId: request.projectId,
    requesterId: request.requesterId,
    requesterRole: request.requesterRole,
    reasonCode: request.reasonCode,
    requestedScopes: request.requestedScopes,
    requestedDataClasses: request.requestedDataClasses,
    expiresInMinutes: expiresAt && requestedAt ? minutesBetween(requestedAt, expiresAt) : 0,
    status: DENIED,
    reasons,
    actions,
  };

  if (!project) {
    return {
      ...base,
      status: DENIED,
      reasons: ["project is not registered"],
      actions: ["Reject break-glass request"],
    };
  }

  if (!ALLOWED_ROLES.has(request.requesterRole)) {
    reasons.push("requester role is not allowed to initiate break-glass access");
  }

  if (!ALLOWED_REASON_CODES.has(request.reasonCode)) {
    reasons.push("reason code is not recognized for emergency access");
  }

  if (request.reasonDetail.trim().length < 24) {
    reasons.push("reason detail is too short for audit review");
  }

  if (!hasLeastPrivilegeScope(request)) {
    reasons.push("requested scopes are missing or not least-privilege read/write scopes");
  }

  const mfaAgeMinutes = minutesBetween(mfaVerifiedAt, requestedAt);
  if (mfaAgeMinutes < 0 || mfaAgeMinutes > 30) {
    reasons.push("MFA verification is stale for emergency access");
  }

  if (base.expiresInMinutes <= 0 || base.expiresInMinutes > 120) {
    reasons.push("break-glass expiry must be positive and no longer than 120 minutes");
  }

  if (!Array.isArray(request.auditReceiptIds) || request.auditReceiptIds.length === 0) {
    reasons.push("immutable audit receipt is missing");
  }

  if (!postReviewDueAt || minutesBetween(requestedAt, postReviewDueAt) > 24 * 60) {
    reasons.push("post-access review is missing or due more than 24 hours later");
  }

  const protectedData = hasProtectedDataRequest(request, project);
  const ownerApproved = approvedByProjectOwner(request, project);
  const requesterIsOwner = project.owners.includes(request.requesterId);

  if (protectedData) {
    reasons.push("request touches protected project data classes");
  }

  if (!ownerApproved && !requesterIsOwner && !request.afterHoursJustification) {
    reasons.push("missing owner sponsor approval or after-hours justification");
  }

  if (reasons.some((reason) => /not allowed|stale|missing|no longer|protected/.test(reason))) {
    return {
      ...base,
      status: protectedData ? STEWARD_REVIEW : DENIED,
      reasons,
      actions: [
        protectedData
          ? "Route to steward review before any access is granted"
          : "Deny request and preserve audit denial receipt",
        "Notify project owner and institutional admin",
        "Require corrected scope, MFA, expiry, evidence, or sponsorship",
      ],
    };
  }

  if (!ownerApproved && !requesterIsOwner && request.afterHoursJustification) {
    return {
      ...base,
      status: APPROVE_WITH_REVIEW,
      reasons: ["after-hours emergency access can proceed with mandatory owner review"],
      actions: [
        "Grant temporary scoped access",
        "Queue owner review within 24 hours",
        "Auto-expire access and attach audit receipt",
      ],
    };
  }

  return {
    ...base,
    status: APPROVED,
    reasons: ["break-glass request satisfies role, MFA, scope, expiry, evidence, and review gates"],
    actions: [
      "Grant temporary scoped access",
      "Auto-expire access at requested expiry",
      "Preserve immutable audit receipt and post-access review task",
    ],
  };
}

function analyzeBreakGlassAccess(packet, options = {}) {
  requireFields(packet, ["projects", "requests"], "break-glass packet");
  if (!Array.isArray(packet.projects) || !Array.isArray(packet.requests)) {
    throw new Error("projects and requests must be arrays");
  }

  const asOf = parseDate(options.asOf || packet.asOf || new Date().toISOString(), "asOf");
  const context = {
    projects: projectLookup(packet.projects),
  };
  const decisions = packet.requests.map((request) => evaluateRequest(request, context));
  const totals = decisions.reduce(
    (acc, decision) => {
      acc.totalRequests += 1;
      acc.byStatus[decision.status] = (acc.byStatus[decision.status] || 0) + 1;
      if (decision.status === APPROVED || decision.status === APPROVE_WITH_REVIEW) {
        acc.temporaryAccessGrants += 1;
      }
      if (decision.status === STEWARD_REVIEW || decision.status === DENIED) {
        acc.blockedOrReviewRequests += 1;
      }
      return acc;
    },
    {
      totalRequests: 0,
      temporaryAccessGrants: 0,
      blockedOrReviewRequests: 0,
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
    "# Project Break-Glass Access Guard",
    "",
    `As of: ${result.asOf}`,
    `Audit digest: \`${result.auditDigest}\``,
    "",
    "## Totals",
    "",
    `- Requests evaluated: ${result.totals.totalRequests}`,
    `- Temporary access grants: ${result.totals.temporaryAccessGrants}`,
    `- Blocked or review requests: ${result.totals.blockedOrReviewRequests}`,
  ];

  for (const [status, count] of Object.entries(result.totals.byStatus).sort()) {
    lines.push(`- ${status}: ${count}`);
  }

  lines.push("", "## Request Decisions", "");
  for (const decision of result.decisions) {
    lines.push(
      `### ${decision.id}`,
      "",
      `- Project: ${decision.projectId}`,
      `- Requester: ${decision.requesterId} (${decision.requesterRole})`,
      `- Status: ${decision.status}`,
      `- Expires in minutes: ${decision.expiresInMinutes}`,
      `- Scopes: ${decision.requestedScopes.join(", ")}`,
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
  <rect x="292" y="${y}" width="${width}" height="28" rx="5" class="bar"/>
  <text x="${304 + width}" y="${y + 22}" class="value">${count}</text>`;
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
    .bar{fill:#6366f1}
    .digest{font:400 15px monospace;fill:#334155}
  </style>
  <rect class="bg" width="960" height="540"/>
  <rect class="panel" x="28" y="28" width="904" height="484" rx="16"/>
  <text x="58" y="82" class="title">Project Break-Glass Access Guard</text>
  <text x="58" y="116" class="meta">Grants ${result.totals.temporaryAccessGrants} | Blocked/review ${result.totals.blockedOrReviewRequests}</text>
  ${rows}
  <text x="58" y="482" class="digest">audit ${escapeXml(result.auditDigest.slice(0, 48))}</text>
</svg>
`;
}

module.exports = {
  APPROVED,
  APPROVE_WITH_REVIEW,
  STEWARD_REVIEW,
  DENIED,
  analyzeBreakGlassAccess,
  createAuditDigest,
  renderMarkdownReport,
  renderSvgSummary,
};
