"use strict";

const ROLE_RANK = Object.freeze({
  viewer: 1,
  reviewer: 2,
  contributor: 3,
  admin: 4,
  owner: 5
});

const EVENT_WEIGHTS = Object.freeze({
  restricted_download: 34,
  bulk_download: 28,
  role_change: 24,
  external_invite: 18,
  permission_override: 26,
  project_visibility_change: 22,
  api_token_created: 20,
  data_export: 30,
  failed_mfa: 16,
  object_permission_drift: 27
});

function assertArray(value, name) {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function parseTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid timestamp: ${value}`);
  return date;
}

function hoursBetween(left, right) {
  return Math.abs(parseTime(right).getTime() - parseTime(left).getTime()) / 36e5;
}

function normalizeRole(role) {
  return String(role || "viewer").trim().toLowerCase();
}

function roleRank(role) {
  return ROLE_RANK[normalizeRole(role)] || 0;
}

function userById(users) {
  return new Map(users.map((user) => [user.id, user]));
}

function objectById(objects) {
  return new Map(objects.map((object) => [object.id, object]));
}

function projectById(projects) {
  return new Map(projects.map((project) => [project.id, project]));
}

function isExternal(user, project) {
  if (!user || !project) return true;
  return user.institutionId !== project.institutionId || user.type === "external";
}

function postureRisk(user, event) {
  let risk = 0;
  const reasons = [];
  if (!user?.mfaEnabled) {
    risk += 16;
    reasons.push("MFA not enabled");
  }
  if (user?.requiresSaml && !user?.samlLinked) {
    risk += 18;
    reasons.push("SAML link missing");
  }
  if (event.requiresOrcid && !user?.orcidLinked) {
    risk += 10;
    reasons.push("ORCID not linked for attribution-sensitive event");
  }
  if (user?.status === "inactive") {
    risk += 35;
    reasons.push("inactive user generated access event");
  }
  return { risk, reasons };
}

function staleExternalRisk(user, project, event) {
  if (!isExternal(user, project)) return { risk: 0, reasons: [] };
  const expiresAt = user?.externalAccessExpiresAt;
  if (!expiresAt) {
    return { risk: 18, reasons: ["external collaborator has no access expiry"] };
  }
  if (parseTime(expiresAt).getTime() < parseTime(event.timestamp).getTime()) {
    return { risk: 36, reasons: ["external collaborator access is expired"] };
  }
  const hoursToExpiry = hoursBetween(event.timestamp, expiresAt);
  if (hoursToExpiry <= 48) {
    return { risk: 10, reasons: ["external collaborator access expires within 48 hours"] };
  }
  return { risk: 0, reasons: [] };
}

function restrictedObjectRisk(object, event, role) {
  if (!object) return { risk: 8, reasons: ["unknown object referenced by audit event"] };
  let risk = 0;
  const reasons = [];
  if (object.sensitivity === "restricted" || object.sensitivity === "embargoed") {
    risk += 18;
    reasons.push(`${object.sensitivity} object touched`);
  }
  if (object.downloadRequiresRole && roleRank(role) < roleRank(object.downloadRequiresRole)) {
    risk += 24;
    reasons.push(`role ${role} is below required ${object.downloadRequiresRole}`);
  }
  if (event.type === "data_export" && object.license === "restricted") {
    risk += 20;
    reasons.push("restricted-license object exported");
  }
  if (event.type === "bulk_download" && Number(event.count || 0) > Number(object.bulkThreshold || 25)) {
    risk += 16;
    reasons.push(`bulk download count ${event.count} exceeds threshold ${object.bulkThreshold || 25}`);
  }
  return { risk, reasons };
}

function burstRisk(event, allEvents) {
  const related = allEvents.filter(
    (candidate) =>
      candidate.projectId === event.projectId &&
      candidate.actorId === event.actorId &&
      candidate.id !== event.id &&
      hoursBetween(candidate.timestamp, event.timestamp) <= 1
  );
  let risk = 0;
  const reasons = [];
  const roleChanges = related.filter((candidate) => candidate.type === "role_change").length;
  const downloads = related.filter((candidate) =>
    ["restricted_download", "bulk_download", "data_export"].includes(candidate.type)
  ).length;
  if (roleChanges >= 2) {
    risk += 22;
    reasons.push(`${roleChanges + 1} role changes by the same actor within one hour`);
  }
  if (downloads >= 3) {
    risk += 18;
    reasons.push(`${downloads + 1} sensitive/download events by the same actor within one hour`);
  }
  return { risk, reasons };
}

function roleChangeRisk(event, users) {
  if (event.type !== "role_change") return { risk: 0, reasons: [] };
  const beforeRank = roleRank(event.beforeRole);
  const afterRank = roleRank(event.afterRole);
  const target = users.get(event.targetUserId);
  let risk = 0;
  const reasons = [];
  if (afterRank - beforeRank >= 2) {
    risk += 20;
    reasons.push(`role increased from ${event.beforeRole} to ${event.afterRole}`);
  }
  if (target?.type === "external" && afterRank >= ROLE_RANK.contributor) {
    risk += 18;
    reasons.push("external collaborator gained contributor-or-higher role");
  }
  if (!event.approvalTicket) {
    risk += 14;
    reasons.push("role change lacks approval ticket");
  }
  return { risk, reasons };
}

function driftRisk(event, object) {
  if (event.type !== "object_permission_drift") return { risk: 0, reasons: [] };
  const baseline = new Set(object?.expectedRoles || []);
  const observed = new Set(event.observedRoles || []);
  const extraRoles = [...observed].filter((role) => !baseline.has(role));
  if (extraRoles.length === 0) return { risk: 0, reasons: [] };
  return {
    risk: 24 + extraRoles.length * 6,
    reasons: [`object permission drift exposes extra roles: ${extraRoles.join(", ")}`]
  };
}

function scoreEvent(event, context) {
  const users = context.users;
  const projects = context.projects;
  const objects = context.objects;
  const user = users.get(event.actorId);
  const project = projects.get(event.projectId);
  const object = objects.get(event.objectId);
  const role = event.actorRole || user?.projectRoles?.[event.projectId] || "viewer";

  const reasons = [];
  let score = EVENT_WEIGHTS[event.type] || 8;
  const parts = [
    postureRisk(user, event),
    staleExternalRisk(user, project, event),
    restrictedObjectRisk(object, event, role),
    burstRisk(event, context.events),
    roleChangeRisk(event, users),
    driftRisk(event, object)
  ];

  for (const part of parts) {
    score += part.risk;
    reasons.push(...part.reasons);
  }

  if (event.ipReputation === "new_country") {
    score += 12;
    reasons.push("new-country access compared with user history");
  }
  if (event.afterHours) {
    score += 6;
    reasons.push("after-hours access");
  }

  const severity = score >= 85 ? "critical" : score >= 65 ? "high" : score >= 40 ? "medium" : "low";
  const recommendedAction =
    severity === "critical"
      ? "freeze_access_and_open_security_review"
      : severity === "high"
        ? "require_owner_approval_before_next_download"
        : severity === "medium"
          ? "queue_admin_review"
          : "retain_for_audit";

  return {
    eventId: event.id,
    projectId: event.projectId,
    actorId: event.actorId,
    targetUserId: event.targetUserId || null,
    objectId: event.objectId || null,
    type: event.type,
    timestamp: event.timestamp,
    score: clamp(round(score)),
    severity,
    recommendedAction,
    reasons: [...new Set(reasons)]
  };
}

function groupByProject(scoredEvents) {
  return scoredEvents.reduce((acc, event) => {
    if (!acc.has(event.projectId)) acc.set(event.projectId, []);
    acc.get(event.projectId).push(event);
    return acc;
  }, new Map());
}

function buildProjectPacket(project, events) {
  const severityCounts = events.reduce((acc, event) => {
    acc[event.severity] = (acc[event.severity] || 0) + 1;
    return acc;
  }, {});
  const maxScore = events.reduce((max, event) => Math.max(max, event.score), 0);
  const holdExport = events.some((event) => event.recommendedAction === "freeze_access_and_open_security_review");
  const ownerQueue = events
    .filter((event) => ["critical", "high"].includes(event.severity))
    .map((event) => ({
      eventId: event.eventId,
      severity: event.severity,
      action: event.recommendedAction,
      reasons: event.reasons
    }));

  return {
    projectId: project.id,
    projectTitle: project.title,
    institutionId: project.institutionId,
    maxScore,
    severityCounts,
    holdExport,
    ownerQueue,
    reviewerSummary: holdExport
      ? "Restricted access should be frozen until owner/admin review completes."
      : "No critical freeze condition detected; retain audit trail and review high/medium events."
  };
}

function buildAuditAnomalyMonitor(input) {
  const data = input || {};
  assertArray(data.projects, "projects");
  assertArray(data.users, "users");
  assertArray(data.objects, "objects");
  assertArray(data.events, "events");

  const context = {
    users: userById(data.users),
    projects: projectById(data.projects),
    objects: objectById(data.objects),
    events: data.events
  };

  const scoredEvents = data.events
    .map((event) => scoreEvent(event, context))
    .sort((a, b) => b.score - a.score || a.timestamp.localeCompare(b.timestamp));
  const byProject = groupByProject(scoredEvents);
  const projectPackets = data.projects.map((project) => buildProjectPacket(project, byProject.get(project.id) || []));
  const blockedObjects = scoredEvents
    .filter((event) => event.severity === "critical" && event.objectId)
    .map((event) => ({
      objectId: event.objectId,
      eventId: event.eventId,
      action: "temporary_export_hold"
    }));

  return {
    generatedAt: new Date().toISOString(),
    scoredEvents,
    projectPackets,
    blockedObjects,
    stats: {
      projectCount: data.projects.length,
      eventCount: data.events.length,
      criticalCount: scoredEvents.filter((event) => event.severity === "critical").length,
      highCount: scoredEvents.filter((event) => event.severity === "high").length,
      heldExportCount: projectPackets.filter((packet) => packet.holdExport).length
    }
  };
}

function buildReviewerMarkdown(report) {
  const lines = ["# Project Access Audit Anomaly Packet", ""];
  lines.push(`Generated events: ${report.stats.eventCount}`);
  lines.push(`Critical: ${report.stats.criticalCount}; High: ${report.stats.highCount}`);
  lines.push("");
  for (const packet of report.projectPackets) {
    lines.push(`## ${packet.projectTitle}`);
    lines.push(`- Project: ${packet.projectId}`);
    lines.push(`- Max score: ${packet.maxScore}`);
    lines.push(`- Export hold: ${packet.holdExport ? "yes" : "no"}`);
    lines.push(`- Summary: ${packet.reviewerSummary}`);
    if (packet.ownerQueue.length) {
      lines.push("- Owner queue:");
      for (const item of packet.ownerQueue) {
        lines.push(`  - ${item.eventId}: ${item.severity} -> ${item.action}; ${item.reasons.join("; ")}`);
      }
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

function renderAuditSvg(report) {
  const width = 920;
  const rowHeight = 82;
  const height = 120 + report.projectPackets.length * rowHeight;
  const rows = report.projectPackets
    .map((packet, index) => {
      const y = 88 + index * rowHeight;
      const color = packet.holdExport ? "#be123c" : packet.maxScore >= 65 ? "#b45309" : "#0f766e";
      const bar = Math.max(18, Math.round(packet.maxScore * 3.2));
      return [
        `<g transform="translate(36 ${y})">`,
        `<rect x="0" y="0" width="848" height="64" rx="8" fill="#ffffff" stroke="#dfe5ee"/>`,
        `<text x="18" y="25" font-family="Arial" font-size="16" font-weight="700" fill="#1d2733">${escapeXml(packet.projectTitle)}</text>`,
        `<text x="18" y="48" font-family="Arial" font-size="12" fill="#657080">max ${packet.maxScore} | export hold ${packet.holdExport ? "yes" : "no"} | critical ${packet.severityCounts.critical || 0} | high ${packet.severityCounts.high || 0}</text>`,
        `<rect x="540" y="24" width="320" height="16" rx="8" fill="#eef2f7"/>`,
        `<rect x="540" y="24" width="${bar}" height="16" rx="8" fill="${color}"/>`,
        `</g>`
      ].join("");
    })
    .join("");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="#f5f7fb"/>`,
    `<text x="36" y="42" font-family="Arial" font-size="25" font-weight="700" fill="#1d2733">Project Access Audit Anomaly Monitor</text>`,
    `<text x="36" y="66" font-family="Arial" font-size="14" fill="#657080">Flags stale external access, restricted downloads, role bursts, and object-level drift.</text>`,
    rows,
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
  ROLE_RANK,
  buildAuditAnomalyMonitor,
  buildReviewerMarkdown,
  renderAuditSvg,
  scoreEvent
};
