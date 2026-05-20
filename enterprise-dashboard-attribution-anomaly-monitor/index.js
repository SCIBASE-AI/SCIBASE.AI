"use strict";

const EVENT_WEIGHTS = Object.freeze({
  manuscript_edit: 8,
  dataset_upload: 14,
  code_commit: 12,
  ai_review_generated: 10,
  peer_review_completed: 16,
  repository_export: 18,
  login: 4,
  service_sync: 2
});

function assertArray(value, name) {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function hoursBetween(left, right) {
  return Math.abs(new Date(right).getTime() - new Date(left).getTime()) / 36e5;
}

function indexById(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function visibleToAdmin(project, admin) {
  if (project.visibility === "public") return true;
  if (project.institutionId !== admin.institutionId) return false;
  if (project.visibility === "institutional-only") return true;
  return (admin.allowedPrivateProjectIds || []).includes(project.id);
}

function canonicalResearcherId(actor, identityLinks) {
  if (!actor) return null;
  const link = identityLinks.find((item) => item.userIds.includes(actor.id));
  return link?.canonicalId || actor.id;
}

function eventCredit(event, context) {
  const actor = context.users.get(event.actorId);
  const project = context.projects.get(event.projectId);
  const canonicalId = canonicalResearcherId(actor, context.identityLinks);
  const base = EVENT_WEIGHTS[event.type] || 5;
  const serviceAccount = actor?.type === "service";
  const privateBoundary = !visibleToAdmin(project, context.admin);
  const duplicateAlias = actor?.id !== canonicalId;
  const score = serviceAccount ? 0 : base * Number(event.creditMultiplier ?? 1);

  return {
    eventId: event.id,
    projectId: event.projectId,
    actorId: event.actorId,
    canonicalResearcherId: canonicalId,
    type: event.type,
    timestamp: event.timestamp,
    rawCredit: round(base * Number(event.creditMultiplier ?? 1)),
    dashboardCredit: round(score),
    serviceAccount,
    duplicateAlias,
    privateBoundary,
    labId: project?.labId,
    collaborationPair: event.collaborationPair || null
  };
}

function detectUsageSpike(credits) {
  const byActorDay = new Map();
  for (const credit of credits) {
    const day = credit.timestamp.slice(0, 10);
    const key = `${credit.canonicalResearcherId}:${day}`;
    byActorDay.set(key, (byActorDay.get(key) || 0) + credit.dashboardCredit);
  }
  return [...byActorDay.entries()]
    .filter(([, value]) => value >= 70)
    .map(([key, value]) => ({
      kind: "usage_spike",
      key,
      severity: value >= 100 ? "high" : "medium",
      score: round(value),
      reason: `dashboard credit ${round(value)} in one day exceeds institutional review threshold`
    }));
}

function detectDuplicateInflation(credits) {
  const aliasEvents = credits.filter((credit) => credit.duplicateAlias && credit.dashboardCredit > 0);
  const byCanonical = new Map();
  for (const credit of aliasEvents) {
    if (!byCanonical.has(credit.canonicalResearcherId)) byCanonical.set(credit.canonicalResearcherId, []);
    byCanonical.get(credit.canonicalResearcherId).push(credit);
  }
  return [...byCanonical.entries()]
    .filter(([, items]) => new Set(items.map((item) => item.actorId)).size > 1)
    .map(([canonicalResearcherId, items]) => ({
      kind: "duplicate_identity_credit",
      canonicalResearcherId,
      severity: "medium",
      score: round(items.reduce((sum, item) => sum + item.dashboardCredit, 0)),
      reason: "multiple linked identities generated dashboard credit under one researcher",
      eventIds: items.map((item) => item.eventId)
    }));
}

function detectServiceAccountCredit(credits) {
  const serviceCredits = credits.filter((credit) => credit.serviceAccount && credit.rawCredit > 0);
  return serviceCredits.map((credit) => ({
    kind: "service_account_credit",
    severity: "high",
    score: credit.rawCredit,
    reason: "service account activity must not count as researcher productivity",
    eventIds: [credit.eventId],
    actorId: credit.actorId
  }));
}

function detectPrivateBoundaryLeak(credits) {
  return credits
    .filter((credit) => credit.privateBoundary)
    .map((credit) => ({
      kind: "private_project_boundary",
      severity: "high",
      score: credit.rawCredit,
      reason: "admin dashboard row references a project outside visibility boundary",
      eventIds: [credit.eventId],
      projectId: credit.projectId
    }));
}

function detectCollaborationInflation(credits) {
  const pairs = new Map();
  for (const credit of credits) {
    if (!credit.collaborationPair || credit.serviceAccount) continue;
    const key = credit.collaborationPair.slice().sort().join("::");
    if (!pairs.has(key)) pairs.set(key, []);
    pairs.get(key).push(credit);
  }
  return [...pairs.entries()]
    .filter(([, items]) => items.length >= 4 && items.some((item, index) => index > 0 && hoursBetween(items[0].timestamp, item.timestamp) <= 3))
    .map(([key, items]) => ({
      kind: "collaboration_inflation",
      severity: "medium",
      score: items.length * 12,
      reason: "same cross-lab collaboration pair appears repeatedly in a short window",
      pair: key.split("::"),
      eventIds: items.map((item) => item.eventId)
    }));
}

function buildMetrics(credits) {
  const byResearcher = new Map();
  const byLab = new Map();
  for (const credit of credits) {
    if (credit.privateBoundary) continue;
    byResearcher.set(
      credit.canonicalResearcherId,
      round((byResearcher.get(credit.canonicalResearcherId) || 0) + credit.dashboardCredit)
    );
    if (credit.labId) byLab.set(credit.labId, round((byLab.get(credit.labId) || 0) + credit.dashboardCredit));
  }
  return {
    researcherCredits: [...byResearcher.entries()]
      .map(([researcherId, credit]) => ({ researcherId, credit }))
      .sort((a, b) => b.credit - a.credit),
    labCredits: [...byLab.entries()]
      .map(([labId, credit]) => ({ labId, credit }))
      .sort((a, b) => b.credit - a.credit)
  };
}

function buildDashboardAttributionMonitor(input) {
  const data = input || {};
  assertArray(data.users, "users");
  assertArray(data.projects, "projects");
  assertArray(data.events, "events");
  const context = {
    users: indexById(data.users),
    projects: indexById(data.projects),
    identityLinks: data.identityLinks || [],
    admin: data.admin || {}
  };
  const credits = data.events.map((event) => eventCredit(event, context));
  const anomalies = [
    ...detectUsageSpike(credits),
    ...detectDuplicateInflation(credits),
    ...detectServiceAccountCredit(credits),
    ...detectPrivateBoundaryLeak(credits),
    ...detectCollaborationInflation(credits)
  ].sort((a, b) => {
    const rank = { high: 3, medium: 2, low: 1 };
    return (rank[b.severity] || 0) - (rank[a.severity] || 0) || b.score - a.score;
  });
  const metrics = buildMetrics(credits);
  const reviewPacket = {
    holdExecutiveDashboard: anomalies.some((item) => item.severity === "high"),
    ownerActions: anomalies.map((item) => ({
      kind: item.kind,
      severity: item.severity,
      action:
        item.severity === "high"
          ? "remove_from_executive_dashboard_until_resolved"
          : "annotate_dashboard_metric_and_request_owner_confirmation",
      reason: item.reason
    }))
  };

  return {
    generatedAt: new Date().toISOString(),
    credits,
    metrics,
    anomalies,
    reviewPacket,
    stats: {
      eventCount: data.events.length,
      creditedResearcherCount: metrics.researcherCredits.filter((item) => item.credit > 0).length,
      anomalyCount: anomalies.length,
      highSeverityCount: anomalies.filter((item) => item.severity === "high").length,
      serviceAccountEvents: credits.filter((item) => item.serviceAccount).length,
      hiddenBoundaryEvents: credits.filter((item) => item.privateBoundary).length
    }
  };
}

function buildReviewerMarkdown(report) {
  const lines = ["# Enterprise Dashboard Attribution Review", ""];
  lines.push(`Events reviewed: ${report.stats.eventCount}`);
  lines.push(`Anomalies: ${report.stats.anomalyCount}; high severity: ${report.stats.highSeverityCount}`);
  lines.push(`Executive dashboard hold: ${report.reviewPacket.holdExecutiveDashboard ? "yes" : "no"}`);
  lines.push("");
  lines.push("## Top Researcher Credits");
  for (const item of report.metrics.researcherCredits.slice(0, 6)) {
    lines.push(`- ${item.researcherId}: ${item.credit}`);
  }
  lines.push("");
  lines.push("## Anomalies");
  for (const item of report.anomalies) {
    lines.push(`- ${item.severity.toUpperCase()} ${item.kind}: ${item.reason}`);
  }
  return `${lines.join("\n")}\n`;
}

function renderDashboardSvg(report) {
  const width = 940;
  const rowHeight = 78;
  const rows = report.anomalies.slice(0, 6);
  const height = 128 + rows.length * rowHeight;
  const body = rows
    .map((item, index) => {
      const y = 88 + index * rowHeight;
      const color = item.severity === "high" ? "#be123c" : "#b45309";
      return [
        `<g transform="translate(38 ${y})">`,
        `<rect x="0" y="0" width="864" height="60" rx="8" fill="#ffffff" stroke="#dfe5ee"/>`,
        `<text x="18" y="24" font-family="Arial" font-size="15" font-weight="700" fill="#1d2733">${escapeXml(item.kind)}</text>`,
        `<text x="18" y="46" font-family="Arial" font-size="12" fill="#657080">${escapeXml(item.reason)}</text>`,
        `<rect x="742" y="20" width="92" height="22" rx="11" fill="${color}"/>`,
        `<text x="764" y="35" font-family="Arial" font-size="11" font-weight="700" fill="#ffffff">${escapeXml(item.severity)}</text>`,
        `</g>`
      ].join("");
    })
    .join("");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="#f5f7fb"/>`,
    `<text x="38" y="42" font-family="Arial" font-size="25" font-weight="700" fill="#1d2733">Enterprise Dashboard Attribution Monitor</text>`,
    `<text x="38" y="66" font-family="Arial" font-size="14" fill="#657080">Protects executive metrics from duplicate identity, service-account, collaboration, and visibility-boundary inflation.</text>`,
    body,
    `</svg>`
  ].join("");
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  EVENT_WEIGHTS,
  buildDashboardAttributionMonitor,
  buildReviewerMarkdown,
  eventCredit,
  renderDashboardSvg,
  visibleToAdmin
};
