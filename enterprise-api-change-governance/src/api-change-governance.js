import { createHash, createHmac } from "node:crypto";

const DEFAULT_POLICY = Object.freeze({
  minimumBreakingDeprecationDays: 90,
  criticalConsumerNoticeDays: 60,
  minimumRollbackDays: 14,
  requireOpenApiDiff: true,
  requireWebhookSchemaVersion: true,
  requireSandboxEvidence: true,
  requireDpaForRestrictedExports: true
});

const STATE_ORDER = ["ready", "watch", "hold", "blocked"];

const SECRET_KEYS = new Set([
  "apiKey",
  "clientSecret",
  "privateToken",
  "signingKey",
  "taxId"
]);

export function buildApiChangeGovernance(input, options = {}) {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const policy = { ...DEFAULT_POLICY, ...(input?.policy ?? {}) };
  const asOf = new Date(input?.asOf ?? generatedAt);
  const integrations = Array.isArray(input?.integrations) ? input.integrations : [];
  const changes = Array.isArray(input?.changes) ? input.changes : [];

  const reviews = changes.map((change) => evaluateChange(change, integrations, policy, asOf));
  const dashboard = buildDashboard(reviews);
  const exportManifest = buildExportManifest(input?.portfolioId, reviews);
  const webhookEvents = reviews.map((review) => buildWebhookEvent(review, input?.signingKeyId));
  const sanitizedInputEcho = redactSensitiveFields(input);
  const digestPayload = {
    portfolioId: input?.portfolioId ?? null,
    asOf: input?.asOf ?? null,
    dashboard,
    exportManifest,
    reviews: reviews.map(toDigestableReview),
    webhookEvents: webhookEvents.map(({ signature, ...event }) => event),
    sanitizedInputEcho
  };

  return {
    generatedAt,
    portfolioId: input?.portfolioId ?? "unknown-portfolio",
    dashboard,
    reviews,
    exportManifest,
    webhookEvents,
    sanitizedInputEcho,
    auditDigest: sha256(stableStringify(digestPayload))
  };
}

export function evaluateChange(change, integrations, policy = DEFAULT_POLICY, asOf = new Date()) {
  const affectedConsumers = buildAffectedConsumers(change, integrations, policy, asOf);
  const findings = [
    ...evaluateContractEvidence(change, policy),
    ...evaluateDeprecation(change, policy, asOf),
    ...evaluateWebhookEnvelope(change, policy),
    ...evaluateConsumerReadiness(change, affectedConsumers, policy),
    ...evaluateRestrictedData(change, affectedConsumers, policy)
  ];
  const state = stateFromFindings(findings);
  const adminActions = buildAdminActions(change, findings, affectedConsumers);

  return {
    changeId: change.changeId,
    title: change.title,
    ownerTeam: change.ownerTeam ?? "unassigned",
    surface: change.surface ?? "unknown",
    state,
    riskScore: riskScore(findings, affectedConsumers),
    effectiveDate: change.effectiveDate ?? null,
    breaking: Boolean(change.breaking),
    compatibilityWindowDays: numberOrZero(change.parallelRunDays),
    affectedRoutes: Array.isArray(change.affectedRoutes) ? change.affectedRoutes : [],
    affectedWebhookTypes: Array.isArray(change.affectedWebhookTypes) ? change.affectedWebhookTypes : [],
    affectedConsumers,
    findings,
    adminActions,
    migrationPlan: buildMigrationPlan(change, affectedConsumers, findings),
    evidenceDigest: sha256(stableStringify({
      changeId: change.changeId,
      state,
      findings,
      affectedConsumers: affectedConsumers.map(toDigestableConsumer)
    }))
  };
}

export function redactSensitiveFields(value) {
  if (Array.isArray(value)) {
    return value.map(redactSensitiveFields);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SECRET_KEYS.has(key) ? "[redacted]" : redactSensitiveFields(entry)
    ])
  );
}

export function stableStringify(value) {
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

function buildAffectedConsumers(change, integrations, policy, asOf) {
  return integrations
    .filter((integration) => isIntegrationAffected(change, integration))
    .map((integration) => {
      const sandboxAgeDays = ageInDays(integration.lastSuccessfulSandboxRun, asOf);
      const lacksFreshSandbox = sandboxAgeDays == null || sandboxAgeDays > 30;
      const needsCriticalNotice = integration.criticality === "critical"
        && daysUntil(change.effectiveDate, asOf) < policy.criticalConsumerNoticeDays;
      const notificationMissing = integration.notificationStatus !== "acknowledged";
      const hasVersionRisk = Boolean(change.breaking)
        && !integration.supportsVersionNegotiation
        && !integration.pinnedApiVersions?.includes(change.proposedVersion);
      const hasDpaGap = Boolean(change.restrictedResearchData) && !integration.hasDataProcessingAgreement;
      const blockers = [
        hasVersionRisk ? "breaking change without version negotiation" : null,
        hasDpaGap ? "restricted-data integration missing DPA" : null,
        needsCriticalNotice && notificationMissing ? "critical consumer lacks acknowledged notice" : null
      ].filter(Boolean);
      const warnings = [
        lacksFreshSandbox ? "sandbox evidence is stale or absent" : null,
        notificationMissing ? "notification not acknowledged" : null,
        !integration.migrationTicket ? "no migration ticket linked" : null
      ].filter(Boolean);

      return {
        integrationId: integration.integrationId,
        institution: integration.institution,
        systemType: integration.systemType,
        criticality: integration.criticality ?? "standard",
        contactGroup: integration.contactGroup ?? "unknown",
        readiness: blockers.length > 0 ? "blocked" : warnings.length > 0 ? "needs-review" : "ready",
        blockers,
        warnings,
        migrationTicket: integration.migrationTicket ?? null,
        lastSuccessfulSandboxRun: integration.lastSuccessfulSandboxRun ?? null
      };
    });
}

function isIntegrationAffected(change, integration) {
  const versions = integration.pinnedApiVersions ?? [];
  const webhooks = integration.subscribedWebhookTypes ?? [];
  const routeAffected = change.currentVersion && versions.includes(change.currentVersion);
  const proposedVersionAffected = change.proposedVersion && versions.includes(change.proposedVersion);
  const webhookAffected = (change.affectedWebhookTypes ?? []).some((type) => webhooks.includes(type));
  const newWebhookForSameFamily = (change.affectedWebhookTypes ?? []).some((type) => {
    const family = type.split(".").slice(0, -1).join(".");
    return webhooks.some((subscribed) => subscribed.startsWith(`${family}.`));
  });

  return Boolean(routeAffected || proposedVersionAffected || webhookAffected || newWebhookForSameFamily);
}

function evaluateContractEvidence(change, policy) {
  const findings = [];
  if (policy.requireOpenApiDiff && change.surface !== "webhook" && !change.openApiDiffAttached) {
    findings.push(finding("blocker", "contract-diff", "OpenAPI or route contract diff is required before enterprise review."));
  }

  if (change.breaking && !change.openApiDiffAttached) {
    findings.push(finding("blocker", "breaking-diff", "Breaking changes must include a machine-readable diff for admins and integrators."));
  }

  const diff = change.schemaDiff ?? {};
  if ((diff.removedFields ?? []).length > 0) {
    findings.push(finding("blocker", "removed-fields", `Removed fields detected: ${diff.removedFields.join(", ")}.`));
  }
  if ((diff.typeChanges ?? []).length > 0) {
    findings.push(finding("warning", "type-changes", `Type changes require fixture-backed migration notes: ${diff.typeChanges.join(", ")}.`));
  }
  if ((diff.newRequiredFields ?? []).length > 0 && change.changeKind !== "additive_version") {
    findings.push(finding("warning", "new-required-fields", "New required fields should ship behind a new version or default compatibility mode."));
  }

  return findings;
}

function evaluateDeprecation(change, policy, asOf) {
  const findings = [];
  const deprecationDays = daysUntil(change.effectiveDate, asOf);
  const parallelRunDays = numberOrZero(change.parallelRunDays);
  const rollbackPlanDays = numberOrZero(change.rollbackPlanDays);

  if (change.breaking && deprecationDays < policy.minimumBreakingDeprecationDays) {
    findings.push(finding("blocker", "short-deprecation-window", `Breaking change has ${deprecationDays} days of notice; policy requires ${policy.minimumBreakingDeprecationDays}.`));
  }
  if (change.breaking && parallelRunDays < policy.minimumBreakingDeprecationDays) {
    findings.push(finding("blocker", "short-parallel-run", "Breaking changes need a parallel run window long enough for pinned institutional clients."));
  }
  if (rollbackPlanDays < policy.minimumRollbackDays) {
    findings.push(finding("warning", "rollback-window", `Rollback plan covers ${rollbackPlanDays} days; policy requires at least ${policy.minimumRollbackDays}.`));
  }

  return findings;
}

function evaluateWebhookEnvelope(change, policy) {
  const findings = [];
  const envelope = change.webhookEnvelope ?? {};
  const touchesWebhooks = (change.affectedWebhookTypes ?? []).length > 0 || change.surface === "webhook";

  if (!touchesWebhooks) {
    return findings;
  }

  if (!envelope.usesCloudEvents) {
    findings.push(finding("warning", "event-envelope", "Webhook changes should keep a standard event envelope for routing and replay."));
  }
  if (policy.requireWebhookSchemaVersion && !envelope.schemaVersionField) {
    findings.push(finding("blocker", "schema-version", "Webhook payloads need an explicit schema version field."));
  }
  if (!envelope.idempotencyKeyField) {
    findings.push(finding("blocker", "idempotency-key", "Webhook payloads need a stable idempotency key for enterprise replay safety."));
  }
  if (!envelope.signatureVersion) {
    findings.push(finding("warning", "signature-version", "Webhook signing version should be explicit so consumers can rotate verifiers safely."));
  }

  return findings;
}

function evaluateConsumerReadiness(change, affectedConsumers, policy) {
  const findings = [];
  const blockedConsumers = affectedConsumers.filter((consumer) => consumer.readiness === "blocked");
  const staleSandboxConsumers = affectedConsumers.filter((consumer) =>
    consumer.warnings.includes("sandbox evidence is stale or absent"));
  const missingNoticeConsumers = affectedConsumers.filter((consumer) =>
    consumer.warnings.includes("notification not acknowledged"));

  if (blockedConsumers.length > 0) {
    findings.push(finding("blocker", "consumer-blockers", `${blockedConsumers.length} affected integrations are blocked.`));
  }
  if (policy.requireSandboxEvidence && staleSandboxConsumers.length > 0) {
    findings.push(finding("warning", "sandbox-evidence", `${staleSandboxConsumers.length} affected integrations need fresh sandbox evidence.`));
  }
  if (missingNoticeConsumers.length > 0) {
    findings.push(finding("warning", "notice-ack", `${missingNoticeConsumers.length} affected integrations have not acknowledged migration notice.`));
  }

  return findings;
}

function evaluateRestrictedData(change, affectedConsumers, policy) {
  if (!policy.requireDpaForRestrictedExports || !change.restrictedResearchData) {
    return [];
  }

  const missingDpa = affectedConsumers.filter((consumer) =>
    consumer.blockers.includes("restricted-data integration missing DPA"));
  if (missingDpa.length === 0) {
    return [];
  }

  return [finding("blocker", "restricted-data-dpa", "Restricted research data cannot flow to integrations without DPA evidence.")];
}

function buildDashboard(reviews) {
  const byState = Object.fromEntries(STATE_ORDER.map((state) => [state, 0]));
  for (const review of reviews) {
    byState[review.state] += 1;
  }

  const affectedConsumers = reviews.flatMap((review) => review.affectedConsumers);
  return {
    totalChanges: reviews.length,
    byState,
    blockedChanges: reviews.filter((review) => review.state === "blocked").length,
    holdOrBlockedChanges: reviews.filter((review) => ["hold", "blocked"].includes(review.state)).length,
    criticalIntegrationsImpacted: affectedConsumers.filter((consumer) => consumer.criticality === "critical").length,
    consumerBlocks: affectedConsumers.filter((consumer) => consumer.readiness === "blocked").length,
    uniqueInstitutionsImpacted: new Set(affectedConsumers.map((consumer) => consumer.institution)).size,
    highestRiskScore: reviews.reduce((highest, review) => Math.max(highest, review.riskScore), 0)
  };
}

function buildExportManifest(portfolioId, reviews) {
  return {
    manifestId: `api-change-governance:${portfolioId ?? "unknown"}`,
    generatedFor: [
      "institutional-admin-dashboard",
      "api-consumer-notice-pack",
      "webhook-delivery-review",
      "compliance-export-evidence"
    ],
    readyChangeIds: reviews.filter((review) => review.state === "ready").map((review) => review.changeId),
    reviewChangeIds: reviews.filter((review) => review.state !== "ready").map((review) => review.changeId),
    evidenceDigests: Object.fromEntries(reviews.map((review) => [review.changeId, review.evidenceDigest]))
  };
}

function buildWebhookEvent(review, signingKeyId) {
  const event = {
    specversion: "1.0",
    type: `scibase.enterprise.api_change.${review.state}`,
    source: "/enterprise/api-change-governance",
    id: sha256(`${review.changeId}:${review.state}:${review.evidenceDigest}`).slice(0, 32),
    subject: review.changeId,
    time: review.effectiveDate,
    datacontenttype: "application/json",
    data: {
      changeId: review.changeId,
      state: review.state,
      riskScore: review.riskScore,
      affectedConsumers: review.affectedConsumers.length,
      blockers: review.findings.filter((item) => item.severity === "blocker").map((item) => item.code),
      evidenceDigest: review.evidenceDigest
    }
  };
  const signaturePayload = stableStringify(event);
  return {
    ...event,
    signatureKeyId: signingKeyId ?? "synthetic-signing-key",
    signature: createHmac("sha256", signingKeyId ?? "synthetic-signing-key")
      .update(signaturePayload)
      .digest("hex")
  };
}

function buildAdminActions(change, findings, affectedConsumers) {
  const actions = findings.map((item) => {
    if (item.severity === "blocker") return `Block ${change.changeId}: ${item.message}`;
    return `Review ${change.changeId}: ${item.message}`;
  });

  for (const consumer of affectedConsumers) {
    if (consumer.readiness === "blocked") {
      actions.push(`Open migration review for ${consumer.institution} (${consumer.integrationId}).`);
    } else if (consumer.readiness === "needs-review") {
      actions.push(`Request sandbox acknowledgement from ${consumer.contactGroup} for ${consumer.integrationId}.`);
    }
  }

  if (actions.length === 0) {
    actions.push(`Approve ${change.changeId} for enterprise rollout with monitored release notes.`);
  }

  return [...new Set(actions)];
}

function buildMigrationPlan(change, affectedConsumers, findings) {
  const blockers = findings.filter((item) => item.severity === "blocker").map((item) => item.code);
  return {
    changeId: change.changeId,
    noticeAudience: affectedConsumers.map((consumer) => consumer.contactGroup),
    sandboxFixturePack: change.sandboxEvidence?.fixturePack ?? null,
    rollbackPlanDays: numberOrZero(change.rollbackPlanDays),
    parallelRunDays: numberOrZero(change.parallelRunDays),
    requiredBeforeRelease: blockers.length > 0 ? blockers : ["publish release note", "monitor webhook deliveries"],
    suggestedOrder: [
      "publish contract diff and migration notes",
      "run sandbox fixtures against affected integrations",
      "collect critical-consumer acknowledgement",
      "ship parallel version",
      "monitor signed webhook evidence"
    ]
  };
}

function stateFromFindings(findings) {
  const blockers = findings.filter((item) => item.severity === "blocker").length;
  const warnings = findings.filter((item) => item.severity === "warning").length;
  if (blockers >= 3) return "blocked";
  if (blockers > 0) return "hold";
  if (warnings > 0) return "watch";
  return "ready";
}

function riskScore(findings, affectedConsumers) {
  const blockerScore = findings.filter((item) => item.severity === "blocker").length * 22;
  const warningScore = findings.filter((item) => item.severity === "warning").length * 8;
  const criticalScore = affectedConsumers.filter((consumer) => consumer.criticality === "critical").length * 6;
  const blockedConsumerScore = affectedConsumers.filter((consumer) => consumer.readiness === "blocked").length * 12;
  return Math.min(100, blockerScore + warningScore + criticalScore + blockedConsumerScore);
}

function finding(severity, code, message) {
  return { severity, code, message };
}

function daysUntil(dateString, asOf) {
  if (!dateString) return 0;
  const date = new Date(`${dateString}T00:00:00.000Z`);
  return Math.max(0, Math.ceil((date.getTime() - asOf.getTime()) / 86_400_000));
}

function ageInDays(dateString, asOf) {
  if (!dateString) return null;
  const date = new Date(`${dateString}T00:00:00.000Z`);
  return Math.max(0, Math.floor((asOf.getTime() - date.getTime()) / 86_400_000));
}

function numberOrZero(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function toDigestableReview(review) {
  return {
    changeId: review.changeId,
    state: review.state,
    riskScore: review.riskScore,
    findings: review.findings,
    affectedConsumers: review.affectedConsumers.map(toDigestableConsumer),
    evidenceDigest: review.evidenceDigest
  };
}

function toDigestableConsumer(consumer) {
  return {
    integrationId: consumer.integrationId,
    readiness: consumer.readiness,
    blockers: consumer.blockers,
    warnings: consumer.warnings
  };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
