"use strict";

const crypto = require("crypto");

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SAFE_ALGORITHMS = new Set(["RSA-SHA256", "RSA-SHA384", "RSA-SHA512", "ECDSA-SHA256", "ECDSA-SHA384"]);

function parseDate(value, fieldName) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date for ${fieldName}: ${value}`);
  }
  return date;
}

function daysBetween(start, end) {
  return Math.floor((parseDate(end, "end") - parseDate(start, "start")) / MS_PER_DAY);
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

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function fingerprintLooksSafe(fingerprint) {
  return typeof fingerprint === "string" && /^sha256:[a-f0-9]{64}$/i.test(fingerprint);
}

function addFinding(findings, tenant, severity, code, message, evidence, remediation) {
  findings.push({
    tenantId: tenant.id,
    tenantName: tenant.name,
    severity,
    code,
    message,
    evidence,
    remediation
  });
}

function findPrimarySigningCertificate(tenant) {
  return (tenant.certificates || []).find((cert) => cert.role === "signing" && cert.primary);
}

function findStagedSigningCertificate(tenant) {
  const rollover = tenant.rollover || {};
  return (tenant.certificates || []).find((cert) => cert.role === "signing" && cert.id === rollover.stagedCertId);
}

function validateCertificateMaterial(tenant, cert, findings, now, context = {}) {
  const requireCurrentlyActive = context.requireCurrentlyActive !== false;
  if (!cert) {
    addFinding(
      findings,
      tenant,
      "critical",
      "missing_primary_signing_certificate",
      "No primary SAML signing certificate is recorded for this tenant.",
      { certificateCount: (tenant.certificates || []).length },
      "Attach the active signing certificate fingerprint and validity window before releasing SSO metadata."
    );
    return;
  }

  const expiresInDays = daysBetween(now, cert.notAfter);
  const startsInDays = daysBetween(now, cert.notBefore);

  if (requireCurrentlyActive && startsInDays > 0) {
    addFinding(
      findings,
      tenant,
      "critical",
      "primary_certificate_not_active",
      "The primary signing certificate is not active yet.",
      { certId: cert.id, notBefore: cert.notBefore, startsInDays },
      "Promote only an already-active certificate or delay metadata release until the certificate is valid."
    );
  }

  if (expiresInDays < 0) {
    addFinding(
      findings,
      tenant,
      "critical",
      "primary_certificate_expired",
      "The primary signing certificate is already expired.",
      { certId: cert.id, notAfter: cert.notAfter, expiredDaysAgo: Math.abs(expiresInDays) },
      "Block metadata release and rotate to a valid signing certificate before allowing enterprise SSO."
    );
  } else if (expiresInDays <= 14) {
    addFinding(
      findings,
      tenant,
      "critical",
      "primary_certificate_expires_during_freeze",
      "The primary signing certificate expires inside the hard rollover freeze window.",
      { certId: cert.id, notAfter: cert.notAfter, expiresInDays },
      "Stage and test replacement metadata immediately, then hold release until overlap and fallback checks pass."
    );
  } else if (expiresInDays <= 45) {
    addFinding(
      findings,
      tenant,
      "warning",
      "primary_certificate_rotation_due",
      "The primary signing certificate is inside the recommended rotation notice window.",
      { certId: cert.id, notAfter: cert.notAfter, expiresInDays },
      "Notify admins and complete the staged rollover before the hard freeze window begins."
    );
  }

  if (!SAFE_ALGORITHMS.has(cert.algorithm)) {
    addFinding(
      findings,
      tenant,
      "critical",
      "unsafe_signing_algorithm",
      "The signing certificate metadata uses an unsupported or weak algorithm.",
      { certId: cert.id, algorithm: cert.algorithm },
      "Use RSA-SHA256 or stronger, or ECDSA-SHA256 or stronger, before release."
    );
  }

  if (cert.algorithm && cert.algorithm.startsWith("RSA") && Number(cert.keySize) < 2048) {
    addFinding(
      findings,
      tenant,
      "critical",
      "weak_rsa_key_size",
      "The signing certificate has an RSA key below the minimum enterprise size.",
      { certId: cert.id, keySize: cert.keySize },
      "Regenerate signing material with a 2048-bit or stronger RSA key."
    );
  }

  if (!fingerprintLooksSafe(cert.fingerprint)) {
    addFinding(
      findings,
      tenant,
      "warning",
      "unverifiable_certificate_fingerprint",
      "The certificate fingerprint is not recorded as a SHA-256 digest.",
      { certId: cert.id, fingerprint: cert.fingerprint || null },
      "Store a SHA-256 fingerprint so reviewers can compare metadata without handling raw certificates."
    );
  }
}

function validateRolloverPlan(tenant, primary, staged, findings, now, options) {
  const rollover = tenant.rollover || {};
  const notifyBeforeDays = rollover.notifyBeforeDays || options.defaultNotifyBeforeDays;
  const overlapRequiredDays = rollover.overlapRequiredDays || options.defaultOverlapRequiredDays;

  if (!rollover.owner || !rollover.ticketId) {
    addFinding(
      findings,
      tenant,
      "warning",
      "missing_rollover_owner_or_ticket",
      "The rollover plan is missing an owner or release ticket.",
      { owner: rollover.owner || null, ticketId: rollover.ticketId || null },
      "Assign an accountable enterprise admin and reference the release ticket before metadata changes."
    );
  }

  if (!tenant.adminContact || !tenant.adminContact.includes("@")) {
    addFinding(
      findings,
      tenant,
      "warning",
      "missing_admin_contact",
      "No usable institutional admin contact is recorded for SSO rollover notifications.",
      { adminContact: tenant.adminContact || null },
      "Record a monitored admin contact before the rotation notice window opens."
    );
  }

  if (primary) {
    const expiresInDays = daysBetween(now, primary.notAfter);
    if (expiresInDays <= notifyBeforeDays && !rollover.stagedCertId) {
      addFinding(
        findings,
        tenant,
        "critical",
        "missing_staged_rollover_certificate",
        "The tenant is in the rotation window but has no staged replacement certificate.",
        { primaryCertId: primary.id, expiresInDays, notifyBeforeDays },
        "Stage a replacement signing certificate and publish dual-cert metadata for the overlap period."
      );
    }
  }

  if (staged && primary) {
    const stagedActiveBeforeExpiryDays = daysBetween(staged.notBefore, primary.notAfter);
    const stagedExpiresAfterPrimaryDays = daysBetween(primary.notAfter, staged.notAfter);

    if (stagedActiveBeforeExpiryDays < overlapRequiredDays) {
      addFinding(
        findings,
        tenant,
        "critical",
        "insufficient_certificate_overlap",
        "The staged certificate does not overlap the primary certificate long enough.",
        {
          primaryCertId: primary.id,
          stagedCertId: staged.id,
          overlapRequiredDays,
          stagedActiveBeforeExpiryDays
        },
        "Publish staged metadata early enough to provide the required overlap before the primary certificate expires."
      );
    }

    if (stagedExpiresAfterPrimaryDays < 365) {
      addFinding(
        findings,
        tenant,
        "warning",
        "short_lived_staged_certificate",
        "The staged certificate expires too soon after the current primary certificate.",
        {
          primaryCertId: primary.id,
          stagedCertId: staged.id,
          stagedExpiresAfterPrimaryDays
        },
        "Use replacement signing material with enough future validity to avoid a second near-term rollover."
      );
    }

    validateCertificateMaterial(tenant, staged, findings, now, { requireCurrentlyActive: false });
  }

  if (rollover.fallbackLoginTestedAt) {
    const fallbackAgeDays = daysBetween(rollover.fallbackLoginTestedAt, now);
    if (fallbackAgeDays > options.fallbackTestFreshnessDays) {
      addFinding(
        findings,
        tenant,
        "warning",
        "stale_fallback_login_test",
        "Emergency fallback-login evidence is stale for this SSO rollover.",
        { fallbackLoginTestedAt: rollover.fallbackLoginTestedAt, fallbackAgeDays },
        "Retest emergency admin access before changing identity-provider metadata."
      );
    }
  } else {
    addFinding(
      findings,
      tenant,
      "warning",
      "missing_fallback_login_test",
      "No emergency fallback-login test is attached to the rollover plan.",
      { rolloverTicket: rollover.ticketId || null },
      "Attach a recent break-glass login test before release."
    );
  }
}

function validateMetadata(tenant, findings, now, options) {
  const metadata = tenant.metadata || {};
  const endpoint = tenant.endpoint || {};

  if (!metadata.lastFetchedAt) {
    addFinding(
      findings,
      tenant,
      "warning",
      "missing_metadata_fetch_evidence",
      "No recent IdP metadata fetch evidence is recorded.",
      { metadataUrl: metadata.url || null },
      "Fetch and archive IdP metadata before making a release decision."
    );
  } else {
    const metadataAgeDays = daysBetween(metadata.lastFetchedAt, now);
    if (metadataAgeDays > options.metadataFreshnessDays) {
      addFinding(
        findings,
        tenant,
        "warning",
        "stale_metadata_fetch_evidence",
        "IdP metadata fetch evidence is older than the freshness policy.",
        { lastFetchedAt: metadata.lastFetchedAt, metadataAgeDays },
        "Refresh IdP metadata and rerun the guard before release."
      );
    }
  }

  if (metadata.entityId && endpoint.expectedEntityId && metadata.entityId !== endpoint.expectedEntityId) {
    addFinding(
      findings,
      tenant,
      "critical",
      "entity_id_drift",
      "The IdP entity ID differs from the expected enterprise SSO entity ID.",
      { metadataEntityId: metadata.entityId, expectedEntityId: endpoint.expectedEntityId },
      "Pause release and reconcile the IdP metadata source with the enterprise SSO configuration."
    );
  }

  if (metadata.acsUrl && endpoint.expectedAcsUrl && metadata.acsUrl !== endpoint.expectedAcsUrl) {
    addFinding(
      findings,
      tenant,
      "critical",
      "acs_url_drift",
      "The IdP ACS URL differs from the expected enterprise SSO ACS URL.",
      { metadataAcsUrl: metadata.acsUrl, expectedAcsUrl: endpoint.expectedAcsUrl },
      "Pause release until ACS URL drift is resolved and tested with a non-production login."
    );
  }

  for (const system of tenant.connectedSystems || []) {
    if (!system.lastMetadataRefreshAt) {
      addFinding(
        findings,
        tenant,
        "warning",
        "connected_system_missing_refresh",
        "A connected enterprise system has no metadata refresh evidence.",
        { system: system.name, owner: system.owner || null },
        "Confirm the downstream system has imported the staged metadata or explicitly mark it out of scope."
      );
      continue;
    }

    const refreshAgeDays = daysBetween(system.lastMetadataRefreshAt, now);
    if (refreshAgeDays > options.connectedSystemRefreshDays) {
      addFinding(
        findings,
        tenant,
        "warning",
        "connected_system_stale_refresh",
        "A connected enterprise system has stale metadata refresh evidence.",
        { system: system.name, lastMetadataRefreshAt: system.lastMetadataRefreshAt, refreshAgeDays },
        "Refresh metadata for the connected system before the rollover release window."
      );
    }
  }
}

function decideTenantStatus(findingsForTenant) {
  if (findingsForTenant.some((finding) => finding.code === "primary_certificate_expired" || finding.code === "unsafe_signing_algorithm" || finding.code === "weak_rsa_key_size")) {
    return "block_metadata_release";
  }
  if (findingsForTenant.some((finding) => finding.severity === "critical")) {
    return "hold_rollover";
  }
  if (findingsForTenant.some((finding) => finding.severity === "warning")) {
    return "rotate_before_expiry";
  }
  return "clear";
}

function evaluateTenant(tenant, options) {
  const now = options.now;
  const findings = [];
  const primary = findPrimarySigningCertificate(tenant);
  const staged = findStagedSigningCertificate(tenant);

  validateCertificateMaterial(tenant, primary, findings, now);
  validateRolloverPlan(tenant, primary, staged, findings, now, options);
  validateMetadata(tenant, findings, now, options);

  const status = decideTenantStatus(findings);
  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    status,
    primaryCertificateId: primary ? primary.id : null,
    stagedCertificateId: staged ? staged.id : null,
    findingCount: findings.length,
    criticalCount: findings.filter((finding) => finding.severity === "critical").length,
    warningCount: findings.filter((finding) => finding.severity === "warning").length,
    findings
  };
}

function evaluateRolloverReadiness(input, overrides = {}) {
  const options = {
    now: overrides.now || input.generatedAt || new Date().toISOString(),
    defaultNotifyBeforeDays: overrides.defaultNotifyBeforeDays || 45,
    defaultOverlapRequiredDays: overrides.defaultOverlapRequiredDays || 14,
    fallbackTestFreshnessDays: overrides.fallbackTestFreshnessDays || 14,
    metadataFreshnessDays: overrides.metadataFreshnessDays || 7,
    connectedSystemRefreshDays: overrides.connectedSystemRefreshDays || 10
  };

  const tenantResults = (input.tenants || []).map((tenant) => evaluateTenant(tenant, options));
  const findings = tenantResults.flatMap((result) => result.findings);
  const summary = {
    generatedAt: options.now,
    tenantCount: tenantResults.length,
    findingCount: findings.length,
    criticalCount: findings.filter((finding) => finding.severity === "critical").length,
    warningCount: findings.filter((finding) => finding.severity === "warning").length,
    clearCount: tenantResults.filter((tenant) => tenant.status === "clear").length,
    rotateCount: tenantResults.filter((tenant) => tenant.status === "rotate_before_expiry").length,
    holdCount: tenantResults.filter((tenant) => tenant.status === "hold_rollover").length,
    blockCount: tenantResults.filter((tenant) => tenant.status === "block_metadata_release").length
  };

  const releaseDecision = summary.blockCount > 0
    ? "block_metadata_release"
    : summary.holdCount > 0
      ? "hold_rollover"
      : summary.rotateCount > 0
        ? "rotate_before_expiry"
        : "clear";

  const packet = {
    summary,
    releaseDecision,
    tenants: tenantResults.map(({ findings: _findings, ...tenant }) => tenant),
    findings
  };
  return {
    ...packet,
    auditDigest: digest(packet)
  };
}

function renderMarkdownReport(result) {
  const lines = [
    "# Enterprise SSO Certificate Rollover Review",
    "",
    `Generated: ${result.summary.generatedAt}`,
    `Decision: ${result.releaseDecision}`,
    `Audit digest: ${result.auditDigest}`,
    "",
    "## Summary",
    "",
    `- Tenants reviewed: ${result.summary.tenantCount}`,
    `- Critical findings: ${result.summary.criticalCount}`,
    `- Warning findings: ${result.summary.warningCount}`,
    `- Clear: ${result.summary.clearCount}`,
    `- Rotate before expiry: ${result.summary.rotateCount}`,
    `- Hold rollover: ${result.summary.holdCount}`,
    `- Block metadata release: ${result.summary.blockCount}`,
    "",
    "## Tenant Decisions",
    "",
    "| Tenant | Status | Critical | Warnings |",
    "| --- | --- | ---: | ---: |",
    ...result.tenants.map((tenant) => `| ${tenant.tenantName} | ${tenant.status} | ${tenant.criticalCount} | ${tenant.warningCount} |`),
    "",
    "## Findings",
    ""
  ];

  for (const finding of result.findings) {
    lines.push(
      `### ${finding.severity.toUpperCase()}: ${finding.code}`,
      "",
      `Tenant: ${finding.tenantName}`,
      "",
      finding.message,
      "",
      `Remediation: ${finding.remediation}`,
      "",
      `Evidence: \`${stableStringify(finding.evidence)}\``,
      ""
    );
  }

  if (result.findings.length === 0) {
    lines.push("No findings.");
  }

  return `${lines.join("\n")}\n`;
}

function renderSvgSummary(result) {
  const width = 1280;
  const height = 720;
  const statuses = [
    ["Clear", result.summary.clearCount, "#176b3a"],
    ["Rotate", result.summary.rotateCount, "#8a5a00"],
    ["Hold", result.summary.holdCount, "#a34700"],
    ["Block", result.summary.blockCount, "#9d1c2f"]
  ];
  const max = Math.max(1, ...statuses.map(([, count]) => count));
  const bars = statuses.map(([label, count, color], index) => {
    const barWidth = Math.round((count / max) * 620);
    const y = 265 + index * 78;
    return [
      `<text x="96" y="${y + 26}" font-size="30" fill="#1b1f24">${label}</text>`,
      `<rect x="260" y="${y}" width="${barWidth}" height="42" rx="6" fill="${color}" />`,
      `<text x="${280 + barWidth}" y="${y + 31}" font-size="26" fill="#1b1f24">${count}</text>`
    ].join("\n");
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">Enterprise SSO certificate rollover guard summary</title>
  <desc id="desc">Decision ${result.releaseDecision} with ${result.summary.criticalCount} critical findings and ${result.summary.warningCount} warnings.</desc>
  <rect width="1280" height="720" fill="#f8fafc"/>
  <rect x="64" y="64" width="1152" height="592" rx="18" fill="#ffffff" stroke="#d8dee7" stroke-width="2"/>
  <text x="96" y="130" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#1b1f24">Enterprise SSO Certificate Rollover Guard</text>
  <text x="96" y="180" font-family="Arial, sans-serif" font-size="28" fill="#5b6572">Decision: ${result.releaseDecision}</text>
  <text x="96" y="220" font-family="Arial, sans-serif" font-size="22" fill="#5b6572">Audit digest: ${result.auditDigest.slice(0, 20)}...</text>
  <g font-family="Arial, sans-serif">
${bars}
  </g>
  <text x="96" y="610" font-family="Arial, sans-serif" font-size="24" fill="#5b6572">${result.summary.tenantCount} tenants, ${result.summary.criticalCount} critical findings, ${result.summary.warningCount} warnings</text>
</svg>
`;
}

module.exports = {
  evaluateRolloverReadiness,
  renderMarkdownReport,
  renderSvgSummary,
  stableStringify,
  digest,
  daysBetween
};
