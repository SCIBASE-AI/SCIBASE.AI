"use strict";

const crypto = require("crypto");

const WEIGHTS = {
  critical: 26,
  high: 18,
  medium: 10,
  low: 5,
};

function minutesBetween(leftIso, rightIso) {
  return Math.round((new Date(rightIso).getTime() - new Date(leftIso).getTime()) / 60000);
}

function addFinding(findings, finding) {
  findings.push({
    severity: finding.severity || "medium",
    recommendation: recommendationFor(finding.code),
    ...finding,
  });
}

function recommendationFor(code) {
  const recommendations = {
    LOCKED_SECTION_EDIT: "Reject the edit or require an explicit unlock approval before applying it.",
    LOCK_LEASE_EXPIRED: "Expire stale locks and notify the lock owner before accepting new edits.",
    UNAUTHORIZED_UNLOCK: "Require lock-owner, section-owner, or maintainer approval for unlock events.",
    AUTOSAVE_GAP: "Force a local snapshot before accepting more collaborative changes.",
    VERSION_PARENT_MISSING: "Block restore/compare actions until the version chain is repaired.",
    RESTORE_OVERWRITES_UNSAVED: "Require an explicit conflict-resolution step before restoring the version.",
    CURSOR_ON_LOCKED_REGION: "Show a read-only presence state when a user cursor enters a locked section.",
    OFFLINE_EDIT_CONFLICT: "Queue offline edits behind server-side section-lock reconciliation.",
    NAMED_VERSION_WITH_DIRTY_STATE: "Create the named version only after all edits are autosaved.",
  };
  return recommendations[code] || "Route this item to collaborative editor review.";
}

function buildIndex(values, key = "id") {
  return new Map((values || []).map((value) => [value[key], value]));
}

function isAuthorizedUnlock(event, lock) {
  const authorized = new Set([lock.ownerUserId, ...(lock.maintainerUserIds || []), ...(lock.sectionOwnerUserIds || [])]);
  return authorized.has(event.userId);
}

function auditCollaborationSession(session, options = {}) {
  const now = options.now || session.auditTime || new Date().toISOString();
  const sections = buildIndex(session.sections);
  const locks = buildIndex(session.locks || [], "sectionId");
  const versions = buildIndex(session.versions);
  const findings = [];

  for (const lock of session.locks || []) {
    if (lock.expiresAt && new Date(lock.expiresAt).getTime() < new Date(now).getTime()) {
      addFinding(findings, {
        code: "LOCK_LEASE_EXPIRED",
        severity: lock.mode === "hard" ? "high" : "medium",
        sectionId: lock.sectionId,
        eventId: null,
        message: `Lock for section ${lock.sectionId} expired at ${lock.expiresAt}.`,
        evidence: lock,
      });
    }
  }

  for (const event of session.events || []) {
    const section = sections.get(event.sectionId);
    const lock = locks.get(event.sectionId);
    if (!section) continue;

    if (lock && event.type === "edit" && lock.mode === "hard" && event.userId !== lock.ownerUserId) {
      addFinding(findings, {
        code: "LOCKED_SECTION_EDIT",
        severity: "critical",
        sectionId: event.sectionId,
        eventId: event.id,
        message: `${event.userId} edited locked section ${event.sectionId} owned by ${lock.ownerUserId}.`,
        evidence: { event, lock },
      });
    }

    if (lock && event.type === "unlock" && !isAuthorizedUnlock(event, lock)) {
      addFinding(findings, {
        code: "UNAUTHORIZED_UNLOCK",
        severity: "critical",
        sectionId: event.sectionId,
        eventId: event.id,
        message: `${event.userId} tried to unlock ${event.sectionId} without authority.`,
        evidence: { event, lock },
      });
    }

    if (lock && event.type === "presence" && event.cursorRange && rangesOverlap(event.cursorRange, section.range)) {
      addFinding(findings, {
        code: "CURSOR_ON_LOCKED_REGION",
        severity: "low",
        sectionId: event.sectionId,
        eventId: event.id,
        message: `${event.userId} presence entered locked section ${event.sectionId}.`,
        evidence: event.cursorRange,
      });
    }

    if (event.type === "edit" && event.offline && lock) {
      addFinding(findings, {
        code: "OFFLINE_EDIT_CONFLICT",
        severity: "high",
        sectionId: event.sectionId,
        eventId: event.id,
        message: `Offline edit ${event.id} arrived for locked section ${event.sectionId}.`,
        evidence: event,
      });
    }

    if (event.type === "named-version" && session.documentDirty) {
      addFinding(findings, {
        code: "NAMED_VERSION_WITH_DIRTY_STATE",
        severity: "medium",
        sectionId: event.sectionId,
        eventId: event.id,
        message: `Named version ${event.versionId} was requested while the document had unsaved edits.`,
        evidence: event,
      });
    }
  }

  for (const autosave of session.autosaves || []) {
    const lagMinutes = minutesBetween(autosave.lastLocalEditAt, autosave.savedAt);
    if (lagMinutes > (session.autosavePolicy?.maxLagMinutes || 2)) {
      addFinding(findings, {
        code: "AUTOSAVE_GAP",
        severity: lagMinutes > 10 ? "high" : "medium",
        sectionId: autosave.sectionId,
        eventId: autosave.eventId || null,
        message: `Autosave lagged ${lagMinutes} minutes for ${autosave.sectionId}.`,
        evidence: autosave,
      });
    }
  }

  for (const version of session.versions || []) {
    if (version.parentId && !versions.has(version.parentId)) {
      addFinding(findings, {
        code: "VERSION_PARENT_MISSING",
        severity: "critical",
        versionId: version.id,
        sectionId: null,
        eventId: null,
        message: `Version ${version.id} points to missing parent ${version.parentId}.`,
        evidence: version,
      });
    }
  }

  for (const restore of session.restoreRequests || []) {
    const targetVersion = versions.get(restore.targetVersionId);
    if (restore.unsavedEditIds?.length) {
      addFinding(findings, {
        code: "RESTORE_OVERWRITES_UNSAVED",
        severity: "high",
        versionId: restore.targetVersionId,
        sectionId: restore.sectionId || null,
        eventId: restore.id,
        message: `Restore ${restore.id} would overwrite ${restore.unsavedEditIds.length} unsaved edits.`,
        evidence: { restore, targetVersion },
      });
    }
  }

  const riskScore = Math.min(100, findings.reduce((score, finding) => score + WEIGHTS[finding.severity], 0));
  const decision = riskScore >= 70 ? "hold-collaboration-sync" : riskScore >= 35 ? "repair-before-restore" : "safe-to-sync";
  const auditDigest = crypto
    .createHash("sha256")
    .update(JSON.stringify(findings.map((finding) => [finding.code, finding.eventId, finding.sectionId, finding.versionId]).sort()))
    .digest("hex")
    .slice(0, 16);

  return {
    document: {
      id: session.documentId,
      title: session.title,
      activeUsers: session.activeUsers || [],
    },
    summary: {
      decision,
      riskScore,
      auditDigest,
      sectionsReviewed: (session.sections || []).length,
      eventsReviewed: (session.events || []).length,
      autosavesReviewed: (session.autosaves || []).length,
      versionsReviewed: (session.versions || []).length,
      findings: findings.length,
      criticalFindings: findings.filter((finding) => finding.severity === "critical").length,
      highFindings: findings.filter((finding) => finding.severity === "high").length,
    },
    findings,
    releaseGates: [
      { gate: "No edits accepted inside hard-locked sections by non-owners.", passed: !findings.some((finding) => finding.code === "LOCKED_SECTION_EDIT") },
      { gate: "Autosave lag stays within the project policy.", passed: !findings.some((finding) => finding.code === "AUTOSAVE_GAP") },
      { gate: "Version history has no missing parents.", passed: !findings.some((finding) => finding.code === "VERSION_PARENT_MISSING") },
      { gate: "Restore requests cannot overwrite unsaved work.", passed: !findings.some((finding) => finding.code === "RESTORE_OVERWRITES_UNSAVED") },
      { gate: "Unlock events are owner or maintainer approved.", passed: !findings.some((finding) => finding.code === "UNAUTHORIZED_UNLOCK") },
    ],
  };
}

function rangesOverlap(left, right) {
  if (!left || !right) return false;
  return Math.max(left.start, right.start) < Math.min(left.end, right.end);
}

function renderMarkdownReport(report) {
  const lines = [
    `# Section Lock Autosave Audit: ${report.document.title}`,
    "",
    `- Decision: ${report.summary.decision}`,
    `- Risk score: ${report.summary.riskScore}`,
    `- Sections reviewed: ${report.summary.sectionsReviewed}`,
    `- Events reviewed: ${report.summary.eventsReviewed}`,
    `- Autosaves reviewed: ${report.summary.autosavesReviewed}`,
    `- Versions reviewed: ${report.summary.versionsReviewed}`,
    `- Audit digest: ${report.summary.auditDigest}`,
    "",
    "## Findings",
    "",
  ];

  for (const finding of report.findings) {
    lines.push(`- [${finding.severity}] ${finding.code}${finding.sectionId ? ` (${finding.sectionId})` : ""}`);
    lines.push(`  - ${finding.message}`);
    lines.push(`  - Recommendation: ${finding.recommendation}`);
  }

  lines.push("", "## Release Gates", "");
  for (const gate of report.releaseGates) {
    lines.push(`- [${gate.passed ? "x" : "!"}] ${gate.gate}`);
  }

  return `${lines.join("\n")}\n`;
}

module.exports = {
  auditCollaborationSession,
  renderMarkdownReport,
  rangesOverlap,
  minutesBetween,
};
