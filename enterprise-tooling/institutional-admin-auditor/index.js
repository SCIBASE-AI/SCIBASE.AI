const crypto = require("crypto");

const SEVERITY_WEIGHT = {
  blocker: 32,
  high: 17,
  medium: 8,
  low: 3,
};

const REQUIRED_DASHBOARD_WIDGETS = [
  "projectOverview",
  "contributorAnalytics",
  "usageStats",
  "complianceTracking",
  "exportPipelineHealth",
];

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

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, 16);
}

function finding(severity, code, title, evidence, action) {
  return { severity, code, title, evidence, action };
}

function verifyAdminControls(tenant) {
  const findings = [];
  const admins = tenant.admins || [];
  const ownerAdmins = admins.filter((admin) => admin.role === "owner");

  if (!ownerAdmins.length) {
    findings.push(finding(
      "blocker",
      "OWNER_ADMIN_MISSING",
      "Institution tenant lacks an owner admin",
      `${tenant.id} has no owner admin role.`,
      "Assign an accountable owner admin before enabling enterprise controls.",
    ));
  }

  admins.forEach((admin) => {
    if (!admin.mfaEnabled) {
      findings.push(finding(
        admin.role === "owner" ? "blocker" : "high",
        "ADMIN_MFA_DISABLED",
        "Admin account does not enforce MFA",
        `${admin.email} role=${admin.role} has MFA disabled.`,
        "Require MFA for all enterprise admins before exposing organization-wide controls.",
      ));
    }
  });

  if (!tenant.rolePolicy?.leastPrivilegeReviewAt) {
    findings.push(finding(
      "medium",
      "LEAST_PRIVILEGE_REVIEW_MISSING",
      "Least-privilege role review is missing",
      `${tenant.id} has no recorded role-policy review.`,
      "Schedule periodic role reviews for admins, lab leads, reviewers, and export operators.",
    ));
  }

  return findings;
}

function verifyDashboardCoverage(tenant) {
  const findings = [];
  const widgets = new Set(tenant.dashboard?.widgets || []);

  REQUIRED_DASHBOARD_WIDGETS.forEach((widget) => {
    if (!widgets.has(widget)) {
      findings.push(finding(
        widget === "complianceTracking" ? "high" : "medium",
        "ADMIN_DASHBOARD_WIDGET_MISSING",
        "Institution admin dashboard is missing a required widget",
        `${tenant.id} lacks ${widget}.`,
        "Enable the required admin dashboard widget before enterprise rollout.",
      ));
    }
  });

  if (!tenant.dashboard?.dataFreshnessMinutes || tenant.dashboard.dataFreshnessMinutes > 60) {
    findings.push(finding(
      "medium",
      "ADMIN_DASHBOARD_STALE",
      "Admin dashboard data freshness exceeds target",
      `${tenant.id} freshness=${tenant.dashboard?.dataFreshnessMinutes || "missing"} minutes.`,
      "Refresh usage, compliance, and project metrics at least hourly for enterprise reporting.",
    ));
  }

  return findings;
}

function verifyApiAndWebhooks(tenant) {
  const findings = [];
  const api = tenant.api || {};

  if (!api.enabled) {
    findings.push(finding(
      "high",
      "ENTERPRISE_API_DISABLED",
      "Enterprise API is not enabled",
      `${tenant.id} cannot integrate with institutional repositories or reporting systems.`,
      "Enable scoped API access before declaring the tenant integration-ready.",
    ));
  }

  if (api.enabled && !api.scopes?.includes("projects:read")) {
    findings.push(finding(
      "high",
      "API_REQUIRED_SCOPE_MISSING",
      "Enterprise API lacks required project read scope",
      `${tenant.id} scopes=${(api.scopes || []).join(",") || "none"}.`,
      "Add least-privilege project read scope for institutional reporting integrations.",
    ));
  }

  if (api.enabled && !api.keyRotationDays) {
    findings.push(finding(
      "medium",
      "API_KEY_ROTATION_MISSING",
      "Enterprise API keys lack rotation policy",
      `${tenant.id} has no API key rotation interval.`,
      "Set an API key rotation interval and notify integration owners before expiry.",
    ));
  }

  (tenant.webhooks || []).forEach((webhook) => {
    if (!webhook.signingSecretConfigured) {
      findings.push(finding(
        "blocker",
        "WEBHOOK_SIGNATURE_MISSING",
        "Webhook lacks signature verification",
        `${webhook.url} has no signing secret configured.`,
        "Configure signed webhooks before sending project, publication, or compliance events.",
      ));
    }

    if (!webhook.retryPolicy?.maxAttempts) {
      findings.push(finding(
        "medium",
        "WEBHOOK_RETRY_POLICY_MISSING",
        "Webhook lacks retry policy",
        `${webhook.url} has no retry attempts configured.`,
        "Add retry/backoff so institutional systems do not miss critical events.",
      ));
    }
  });

  return findings;
}

function verifyExportPipelines(tenant) {
  const findings = [];

  (tenant.exportPipelines || []).forEach((pipeline) => {
    if (!pipeline.destination || !pipeline.format) {
      findings.push(finding(
        "high",
        "EXPORT_PIPELINE_DESTINATION_INCOMPLETE",
        "Export pipeline destination or format is incomplete",
        `${pipeline.id} destination=${pipeline.destination || "missing"} format=${pipeline.format || "missing"}.`,
        "Configure destination and format before one-click institutional exports are enabled.",
      ));
    }

    if (pipeline.requiresPiiScrub && !pipeline.piiScrubEnabled) {
      findings.push(finding(
        "blocker",
        "EXPORT_PII_SCRUB_DISABLED",
        "Export pipeline requires PII scrub but it is disabled",
        `${pipeline.id} requires PII scrub for ${pipeline.destination}.`,
        "Enable PII scrub and add an export reviewer before routing data to external systems.",
      ));
    }

    if (!pipeline.lastDryRun || pipeline.lastDryRun.status !== "passed") {
      findings.push(finding(
        "high",
        "EXPORT_PIPELINE_DRY_RUN_NOT_PASSING",
        "Export pipeline does not have a passing dry run",
        `${pipeline.id} dryRun=${pipeline.lastDryRun?.status || "missing"}.`,
        "Run a dry export and resolve validation errors before enabling production exports.",
      ));
    }
  });

  if (!tenant.exportPipelines?.length) {
    findings.push(finding(
      "high",
      "EXPORT_PIPELINES_MISSING",
      "No enterprise export pipelines are configured",
      `${tenant.id} has no export pipeline definitions.`,
      "Add at least one export path for repositories, preprints, funder reporting, or internal dashboards.",
    ));
  }

  return findings;
}

function verifyComplianceAndSla(tenant) {
  const findings = [];
  const compliance = tenant.compliance || {};
  const sla = tenant.sla || {};

  if (!compliance.auditLogging) {
    findings.push(finding(
      "blocker",
      "ENTERPRISE_AUDIT_LOGGING_DISABLED",
      "Enterprise audit logging is disabled",
      `${tenant.id} lacks audit logging for admin and export actions.`,
      "Enable immutable audit logs before enterprise admin tooling is activated.",
    ));
  }

  if (!compliance.funderMandateTracking) {
    findings.push(finding(
      "medium",
      "FUNDER_MANDATE_TRACKING_DISABLED",
      "Funder mandate tracking is disabled",
      `${tenant.id} cannot surface open access or reproducibility mandate compliance.`,
      "Enable funder mandate tracking for compliance dashboard coverage.",
    ));
  }

  if (!sla.tier || !sla.responseHours) {
    findings.push(finding(
      "medium",
      "SLA_PROFILE_INCOMPLETE",
      "Enterprise SLA profile is incomplete",
      `${tenant.id} tier=${sla.tier || "missing"} responseHours=${sla.responseHours || "missing"}.`,
      "Attach the contracted SLA tier and response window to the tenant profile.",
    ));
  }

  if (tenant.contract?.requiresDpa && !tenant.contract.dataProcessingAgreementId) {
    findings.push(finding(
      "blocker",
      "DPA_REQUIRED_BUT_MISSING",
      "Data-processing agreement is required but missing",
      `${tenant.id} contract requires DPA with no agreement ID.`,
      "Collect the DPA before enabling cross-system data export or analytics.",
    ));
  }

  return findings;
}

function auditEnterpriseTenant(tenant, policy = {}) {
  const findings = [
    ...verifyAdminControls(tenant),
    ...verifyDashboardCoverage(tenant),
    ...verifyApiAndWebhooks(tenant),
    ...verifyExportPipelines(tenant),
    ...verifyComplianceAndSla(tenant),
  ];

  const riskScore = Math.min(100, findings.reduce((sum, item) => sum + SEVERITY_WEIGHT[item.severity], 0));
  const blockers = findings.filter((item) => item.severity === "blocker").length;
  const high = findings.filter((item) => item.severity === "high").length;
  const decision = blockers
    ? "block-enterprise-rollout"
    : high
      ? "manual-enterprise-review"
      : findings.length
        ? "rollout-with-enterprise-caveats"
        : "ready-for-enterprise-rollout";

  const packet = {
    tenantId: tenant.id,
    institutionName: tenant.institutionName,
    reviewedAt: policy.reviewDate,
    decision,
    riskScore,
    adminCount: (tenant.admins || []).length,
    webhookCount: (tenant.webhooks || []).length,
    exportPipelineCount: (tenant.exportPipelines || []).length,
    findings,
    remediationActions: findings.map((item) => ({ code: item.code, action: item.action })),
    generatedFrom: "synthetic-enterprise-tenant-only",
  };

  return {
    ...packet,
    auditDigest: digest(packet),
  };
}

function renderMarkdownReport(result) {
  const lines = [
    "# Institutional Admin Audit",
    "",
    `Tenant: ${result.institutionName} (${result.tenantId})`,
    `Decision: ${result.decision}`,
    `Risk score: ${result.riskScore}`,
    `Admins: ${result.adminCount}`,
    `Webhooks: ${result.webhookCount}`,
    `Export pipelines: ${result.exportPipelineCount}`,
    `Audit digest: ${result.auditDigest}`,
    "",
    "## Findings",
  ];

  if (!result.findings.length) {
    lines.push("- No enterprise tooling readiness issues detected.");
  } else {
    result.findings.forEach((item) => {
      lines.push(`- [${item.severity}] ${item.title}: ${item.evidence}`);
      lines.push(`  Action: ${item.action}`);
    });
  }

  lines.push("", "## Safety", "- Synthetic enterprise tenant only; no customer data, institution systems, API keys, webhook secrets, contracts, or external APIs.");
  return `${lines.join("\n")}\n`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSvgSummary(result) {
  const color = result.decision === "block-enterprise-rollout"
    ? "#b42318"
    : result.decision === "ready-for-enterprise-rollout"
      ? "#067647"
      : "#b54708";
  const counts = [
    ["admins", result.adminCount],
    ["webhooks", result.webhookCount],
    ["exports", result.exportPipelineCount],
    ["findings", result.findings.length],
  ];
  const maxCount = Math.max(...counts.map((item) => item[1]), 1);
  const bars = counts.map(([label, count], index) => {
    const y = 200 + index * 54;
    const width = Math.round(460 * count / maxCount);
    return `<text x="36" y="${y}" font-family="Arial" font-size="18" fill="#344054">${escapeXml(label)}</text>
  <rect x="190" y="${y - 22}" width="460" height="28" rx="5" fill="#eaecf0"/>
  <rect x="190" y="${y - 22}" width="${width}" height="28" rx="5" fill="${label === "findings" ? "#b42318" : "#12b76a"}"/>
  <text x="676" y="${y}" font-family="Arial" font-size="18" fill="#344054">${count}</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="450" viewBox="0 0 960 450" role="img" aria-label="Institutional admin audit summary">
  <rect width="960" height="450" fill="#f8fafc"/>
  <rect x="24" y="24" width="912" height="402" rx="12" fill="#ffffff" stroke="#d0d5dd"/>
  <text x="36" y="72" font-family="Arial" font-size="30" font-weight="700" fill="#101828">Institutional Admin Audit</text>
  <rect x="36" y="98" width="390" height="48" rx="6" fill="${color}"/>
  <text x="56" y="129" font-family="Arial" font-size="21" font-weight="700" fill="#ffffff">${escapeXml(result.decision)}</text>
  <text x="456" y="129" font-family="Arial" font-size="22" fill="#101828">Risk score: ${result.riskScore}</text>
  <text x="36" y="166" font-family="Arial" font-size="18" fill="#667085">Audit digest: ${escapeXml(result.auditDigest)}</text>
  ${bars}
  <text x="36" y="416" font-family="Arial" font-size="18" fill="#667085">Synthetic tenant only. No institution system or webhook calls.</text>
</svg>
`;
}

module.exports = {
  auditEnterpriseTenant,
  digest,
  renderMarkdownReport,
  renderSvgSummary,
};
