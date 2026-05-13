export function buildAdminDashboard(institution) {
  const seatUtilization = Math.round((institution.seats.active / institution.seats.purchased) * 100);
  const totalMembers = institution.projects.reduce((sum, project) => sum + project.members, 0);
  const totalReviewsOpen = institution.projects.reduce((sum, project) => sum + project.reviewsOpen, 0);
  return {
    institutionId: institution.id,
    name: institution.name,
    plan: institution.plan,
    seatUtilization,
    activeSeats: institution.seats.active,
    suspendedSeats: institution.seats.suspended,
    projectCount: institution.projects.length,
    totalMembers,
    totalReviewsOpen,
    accessPosture: institution.compliance.overdueAccessReviews === 0 ? "healthy" : "needs-review",
    alerts: [
      ...(seatUtilization > 85 ? ["Seat utilization above 85 percent"] : []),
      ...(institution.compliance.overdueAccessReviews ? [`${institution.compliance.overdueAccessReviews} overdue access review(s)`] : []),
      ...(totalReviewsOpen > 15 ? ["High open-review queue"] : [])
    ]
  };
}

export function buildUsageAnalytics(institution) {
  const repositoryCount = institution.projects.reduce((sum, project) => sum + project.repositories, 0);
  const reviewLoad = institution.projects.map((project) => ({
    projectId: project.id,
    title: project.title,
    reviewsOpen: project.reviewsOpen,
    reviewsPerMember: Number((project.reviewsOpen / project.members).toFixed(2))
  }));
  return {
    institutionId: institution.id,
    activeUsers30d: institution.usage.activeUsers30d,
    apiCalls30d: institution.usage.apiCalls30d,
    storageGb: institution.usage.storageGb,
    computeCredits: institution.usage.computeCredits,
    exports30d: institution.usage.exports30d,
    repositoryCount,
    reviewLoad,
    trendDeltas: {
      activeUsers: "+8%",
      storage: "+12%",
      computeCredits: "-5%",
      exports: "+18%"
    }
  };
}

export function buildComplianceExport(institution) {
  const generatedAt = "2026-05-14T03:00:00.000Z";
  return {
    institutionId: institution.id,
    generatedAt,
    manifestId: `${institution.id}-compliance-${generatedAt.slice(0, 10)}`,
    controls: [
      { id: "retention", status: "configured", evidence: `${institution.compliance.retentionDays} day retention policy` },
      { id: "data-residency", status: "configured", evidence: institution.compliance.dataResidency },
      { id: "consent-records", status: "available", evidence: `${institution.compliance.consentRecords} consent records` },
      {
        id: "access-review",
        status: institution.compliance.overdueAccessReviews ? "attention-needed" : "complete",
        evidence: `${institution.compliance.overdueAccessReviews} overdue reviews`
      },
      { id: "audit-log", status: "available", evidence: `${institution.compliance.auditEvents30d} events in last 30 days` }
    ],
    files: [
      "audit-events.ndjson",
      "access-review-summary.csv",
      "retention-policy.json",
      "data-residency-attestation.pdf",
      "consent-record-index.csv"
    ]
  };
}

export function buildApiCatalog(apiSurface) {
  return apiSurface.map((endpoint) => ({
    ...endpoint,
    auth: "scoped-api-key",
    rotationPolicyDays: endpoint.scopes.includes("compliance:export") ? 30 : 90,
    exampleAuditEvent: `${endpoint.owner}.api.requested`,
    riskTier: endpoint.scopes.some((scope) => scope.includes("write") || scope.includes("export")) ? "elevated" : "standard"
  }));
}

export function planWebhookDelivery(subscribers) {
  return {
    signing: {
      algorithm: "HMAC-SHA256",
      header: "x-scibase-signature",
      timestampToleranceSeconds: 300
    },
    retryPolicy: {
      attempts: 5,
      backoff: "exponential",
      deadLetterAfter: "5 failed attempts"
    },
    subscribers: subscribers.map((subscriber) => ({
      ...subscriber,
      status: subscriber.healthy ? "ready" : "needs-attention",
      pendingRisk: subscriber.healthy ? "low" : "delivery-paused-until-healthcheck"
    })),
    eventCatalog: [...new Set(subscribers.flatMap((subscriber) => subscriber.events))].sort()
  };
}

export function buildFormattingPlugins() {
  return [
    {
      id: "citation-exporter",
      label: "Citation Exporter",
      formats: ["bibtex", "ris", "csl-json"],
      inputs: ["project.references", "repository.doi"]
    },
    {
      id: "manuscript-packager",
      label: "Manuscript Packager",
      formats: ["docx", "latex", "markdown"],
      inputs: ["document.blocks", "figures", "tables"]
    },
    {
      id: "grant-report-builder",
      label: "Grant Report Builder",
      formats: ["pdf", "xlsx"],
      inputs: ["milestones", "usage", "outputs"]
    },
    {
      id: "compliance-binder",
      label: "Compliance Binder",
      formats: ["zip", "json"],
      inputs: ["audit.events", "access.reviews", "policy.documents"]
    }
  ];
}

export function buildEnterpriseDashboard(institution, apiSurface, subscribers) {
  const admin = buildAdminDashboard(institution);
  const analytics = buildUsageAnalytics(institution);
  const compliance = buildComplianceExport(institution);
  const catalog = buildApiCatalog(apiSurface);
  const webhooks = planWebhookDelivery(subscribers);
  const plugins = buildFormattingPlugins();
  return {
    institutionId: institution.id,
    admin,
    analytics,
    compliance,
    catalog,
    webhooks,
    plugins,
    readyForEnterpriseReview:
      admin.alerts.length <= 2 &&
      catalog.every((endpoint) => endpoint.rotationPolicyDays <= 90) &&
      webhooks.subscribers.filter((subscriber) => subscriber.status === "needs-attention").length <= 1
  };
}
