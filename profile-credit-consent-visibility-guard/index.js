const crypto = require("node:crypto");

const CREDIT_ROLES = new Set([
  "Conceptualization",
  "Data curation",
  "Formal analysis",
  "Funding acquisition",
  "Investigation",
  "Methodology",
  "Project administration",
  "Resources",
  "Software",
  "Supervision",
  "Validation",
  "Visualization",
  "Writing - original draft",
  "Writing - review & editing",
  "Reviewing",
]);

function parseDate(value, field) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`invalid date for ${field}`);
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

function hasEvidence(credit) {
  return Array.isArray(credit.evidenceIds) && credit.evidenceIds.length > 0;
}

function evaluateCredit(profile, credit, options) {
  requireFields(profile, ["researcherId", "displayName", "profileConsent"], "profile");
  requireFields(
    credit,
    [
      "id",
      "projectId",
      "creditType",
      "creditRole",
      "targetSurface",
      "requestedVisibility",
      "artifactVisibility",
      "reputationDelta",
    ],
    "credit"
  );

  const asOf = parseDate(options.asOf, "asOf");
  const consent = profile.profileConsent || {};
  const embargoUntil = parseDate(credit.embargoUntil, `embargoUntil for ${credit.id}`);
  const anonymousUntil = parseDate(
    credit.anonymousUntil,
    `anonymousUntil for ${credit.id}`
  );
  const consentExpiresAt = parseDate(
    consent.expiresAt,
    `profileConsent.expiresAt for ${profile.researcherId}`
  );
  const reasons = [];
  const actions = [];
  const visibleFields = [];

  const base = {
    id: credit.id,
    researcherId: profile.researcherId,
    displayName: profile.displayName,
    projectId: credit.projectId,
    creditType: credit.creditType,
    creditRole: credit.creditRole,
    requestedVisibility: credit.requestedVisibility,
    targetSurface: credit.targetSurface,
    artifactVisibility: credit.artifactVisibility,
    reputationDelta: Number(credit.reputationDelta || 0),
    publishableReputationDelta: 0,
    visibleFields,
    reasons,
    actions,
  };

  if (!CREDIT_ROLES.has(credit.creditRole)) {
    reasons.push("credit role is not mapped to an accepted CRediT/review role");
  }

  if (!hasEvidence(credit)) {
    reasons.push("credit has no evidence receipt ids");
  }

  if (!credit.sourceReceiptImmutable) {
    reasons.push("source receipt is not immutable");
  }

  if (consent.status !== "granted") {
    return {
      ...base,
      status: "hold",
      visibilityDecision: "do_not_publish",
      reasons: [
        consent.status === "revoked"
          ? "profile credit consent has been revoked"
          : "profile credit consent is not granted",
      ],
      actions: [
        "Remove credit from public profile surfaces",
        "Retain private audit receipt only",
        "Ask contributor to refresh consent in account settings",
      ],
    };
  }

  if (consentExpiresAt && consentExpiresAt <= asOf) {
    return {
      ...base,
      status: "hold",
      visibilityDecision: "do_not_publish",
      reasons: ["profile credit consent has expired"],
      actions: [
        "Hold profile publication",
        "Request renewed profile credit consent",
      ],
    };
  }

  if (reasons.length > 0) {
    return {
      ...base,
      status: "hold",
      visibilityDecision: "evidence_review",
      actions: [
        "Block reputation delta from profile and leaderboard",
        "Attach missing evidence before publication",
        "Route credit receipt to steward review",
      ],
    };
  }

  if (anonymousUntil && anonymousUntil > asOf) {
    visibleFields.push("anonymous_reviewer_label", "review_type", "project_id");
    return {
      ...base,
      status: "redacted",
      visibilityDecision: "anonymous_until_release",
      publishableReputationDelta: 0,
      reasons: [
        "double-blind review remains inside anonymous visibility window",
      ],
      actions: [
        "Publish only anonymized review receipt",
        "Hold profile and leaderboard reputation delta until anonymity release",
        `Re-evaluate after ${credit.anonymousUntil}`,
      ],
    };
  }

  if (embargoUntil && embargoUntil > asOf) {
    visibleFields.push("credit_role", "project_id", "embargo_label");
    return {
      ...base,
      status: "citation_only",
      visibilityDecision: "embargoed_credit",
      publishableReputationDelta: 0,
      reasons: ["linked artifact is still under embargo"],
      actions: [
        "Show citation-page placeholder only",
        "Suppress public profile delta until embargo expires",
        `Re-evaluate after ${credit.embargoUntil}`,
      ],
    };
  }

  if (
    credit.artifactVisibility === "private" ||
    credit.sensitiveEvidence ||
    credit.requestedVisibility === "institutional_only" ||
    consent.visibility === "institutional_only"
  ) {
    visibleFields.push("credit_role", "project_id", "institutional_receipt_id");
    return {
      ...base,
      status: "institutional_only",
      visibilityDecision: "restricted_export_only",
      publishableReputationDelta: 0,
      reasons: ["credit evidence is restricted to institutional export"],
      actions: [
        "Exclude from public profile and citation page",
        "Include in institutional report with restricted evidence label",
        "Require steward approval before public conversion",
      ],
    };
  }

  if (credit.requestedVisibility === "citation_only" || consent.visibility === "citation_only") {
    visibleFields.push("credit_role", "project_id", "citation_receipt_id");
    return {
      ...base,
      status: "citation_only",
      visibilityDecision: "citation_page_only",
      publishableReputationDelta: 0,
      reasons: ["contributor consent permits citation page but not public profile"],
      actions: [
        "Show contribution on citation page only",
        "Suppress profile badge and leaderboard delta",
      ],
    };
  }

  if (!profile.orcidVerified) {
    visibleFields.push("credit_role", "project_id", "unverified_profile_notice");
    return {
      ...base,
      status: "citation_only",
      visibilityDecision: "orcid_verification_required",
      publishableReputationDelta: 0,
      reasons: ["ORCID/profile identity is not verified"],
      actions: [
        "Limit credit to citation page until profile verification",
        "Request ORCID verification before public reputation delta",
      ],
    };
  }

  visibleFields.push(
    "display_name",
    "orcid",
    "credit_role",
    "project_id",
    "evidence_receipt_ids",
    "reputation_delta"
  );

  return {
    ...base,
    status: "publishable",
    visibilityDecision: "public_profile_and_citation",
    publishableReputationDelta: base.reputationDelta,
    reasons: [
      "contributor consent is active",
      "identity is verified",
      "evidence receipts are immutable and public-safe",
    ],
    actions: [
      "Publish credit on profile and citation page",
      "Apply reputation delta to transparent profile ledger",
      "Attach audit digest to profile update packet",
    ],
  };
}

function analyzeProfileCredits(profiles, options = {}) {
  if (!Array.isArray(profiles)) {
    throw new Error("profile packets must be an array");
  }

  const normalizedOptions = {
    asOf: parseDate(options.asOf || new Date().toISOString(), "asOf").toISOString(),
  };

  const credits = [];
  for (const profile of profiles) {
    if (!Array.isArray(profile.credits)) {
      throw new Error(`profile ${profile.researcherId || "(unknown)"} must include credits`);
    }
    for (const credit of profile.credits) {
      credits.push(evaluateCredit(profile, credit, normalizedOptions));
    }
  }

  const totals = credits.reduce(
    (acc, credit) => {
      acc.totalCredits += 1;
      acc.publishableReputationDelta += credit.publishableReputationDelta;
      acc.byStatus[credit.status] = (acc.byStatus[credit.status] || 0) + 1;
      return acc;
    },
    {
      totalCredits: 0,
      publishableReputationDelta: 0,
      byStatus: {},
    }
  );

  const result = {
    asOf: normalizedOptions.asOf,
    totals,
    credits,
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
    credits: result.credits.map((credit) => ({
      id: credit.id,
      researcherId: credit.researcherId,
      status: credit.status,
      visibilityDecision: credit.visibilityDecision,
      publishableReputationDelta: credit.publishableReputationDelta,
      reasons: credit.reasons,
    })),
  };

  return crypto.createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function renderMarkdownReport(result) {
  const lines = [
    "# Profile Credit Consent Visibility Guard",
    "",
    `As of: ${result.asOf}`,
    `Audit digest: \`${result.auditDigest}\``,
    "",
    "## Totals",
    "",
    `- Credits evaluated: ${result.totals.totalCredits}`,
    `- Publishable reputation delta: ${result.totals.publishableReputationDelta}`,
  ];

  for (const [status, count] of Object.entries(result.totals.byStatus).sort()) {
    lines.push(`- ${status}: ${count}`);
  }

  lines.push("", "## Credit Decisions", "");
  for (const credit of result.credits) {
    lines.push(
      `### ${credit.id}`,
      "",
      `- Researcher: ${credit.displayName} (${credit.researcherId})`,
      `- Role: ${credit.creditRole}`,
      `- Status: ${credit.status}`,
      `- Visibility decision: ${credit.visibilityDecision}`,
      `- Publishable reputation delta: ${credit.publishableReputationDelta}`,
      `- Reasons: ${credit.reasons.join("; ")}`,
      `- Actions: ${credit.actions.join("; ")}`,
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
      const y = 132 + index * 42;
      const width = Math.max(32, count * 78);
      return `
  <text x="44" y="${y + 21}" class="label">${escapeXml(status)}</text>
  <rect x="238" y="${y}" width="${width}" height="26" rx="5" class="bar"/>
  <text x="${248 + width}" y="${y + 20}" class="value">${count}</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <style>
    .bg{fill:#111827}
    .panel{fill:#f8fafc}
    .title{font:700 34px Arial,sans-serif;fill:#0f172a}
    .meta{font:400 18px Arial,sans-serif;fill:#475569}
    .label{font:600 20px Arial,sans-serif;fill:#1e293b}
    .value{font:700 20px Arial,sans-serif;fill:#0f172a}
    .bar{fill:#2dd4bf}
    .digest{font:400 15px monospace;fill:#334155}
  </style>
  <rect class="bg" width="960" height="540"/>
  <rect class="panel" x="28" y="28" width="904" height="484" rx="16"/>
  <text x="44" y="78" class="title">Profile Credit Consent Visibility Guard</text>
  <text x="44" y="110" class="meta">Credits: ${result.totals.totalCredits} | Public reputation delta: ${result.totals.publishableReputationDelta}</text>
${rows}
  <text x="44" y="482" class="digest">audit ${escapeXml(result.auditDigest.slice(0, 48))}</text>
</svg>
`;
}

module.exports = {
  CREDIT_ROLES,
  analyzeProfileCredits,
  createAuditDigest,
  renderMarkdownReport,
  renderSvgSummary,
};
