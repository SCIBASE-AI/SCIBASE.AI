"use strict";

const crypto = require("node:crypto");

const SEVERITY_ORDER = ["critical", "high", "warning", "info"];

function evaluateProbationReinstatementPacket(packet, options = {}) {
  if (!isPlainObject(packet)) {
    throw new TypeError("evaluateProbationReinstatementPacket expects a packet object");
  }

  const now = options.now ?? new Date().toISOString();
  const policy = isPlainObject(packet.policy) ? packet.policy : {};
  const users = asArray(packet.users);
  const findings = [];

  if (users.length === 0) {
    findings.push(
      finding(
        "PACKET_SCHEMA_MISSING_USERS",
        "high",
        "Probation packet has no users to inspect.",
        "Reputation reinstatement decisions need user moderation records.",
        "users",
        "Attach user probation and reinstatement records.",
        "moderation lead"
      )
    );
  }

  users.forEach((user, index) => inspectUser(user, index, policy, now, findings));

  const sortedFindings = sortFindings(findings);
  const status = determineStatus(sortedFindings);
  const summary = summarize(status, sortedFindings, users.length);
  const reinstatementDecisions = users.map((user) => {
    const userFindings = sortedFindings.filter((item) => item.userId === user.id);
    return {
      userId: user.id,
      decision: userFindings.some((item) => ["critical", "high"].includes(item.severity)) ? "HOLD" : "ALLOW",
      reasonCodes: userFindings.map((item) => item.code),
      reputationAccrual: userFindings.some((item) => item.code === "PROBATION_WINDOW_ACTIVE") ? "paused" : "eligible"
    };
  });
  const remediationActions = sortedFindings.map((item) => ({
    code: item.code,
    userId: item.userId ?? null,
    owner: item.owner,
    action: item.remediation
  }));
  const fingerprint = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        policy,
        users: users.map((user) => ({
          id: user.id,
          probation: user.probation,
          reinstatement: user.reinstatement,
          reputationEvents: user.reputationEvents
        })),
        codes: sortedFindings.map((item) => item.code)
      })
    )
    .digest("hex")
    .slice(0, 16);

  return {
    generatedAt: now,
    status,
    summary,
    findingCounts: countBySeverity(sortedFindings),
    findings: sortedFindings,
    reinstatementDecisions,
    remediationActions,
    fingerprint
  };
}

function renderMarkdownReport(result, packet) {
  const lines = [
    "# Reputation Probation Reinstatement Guard",
    "",
    `Policy: ${packet.policy?.id ?? "unknown"}`,
    `Status: ${result.status}`,
    `Fingerprint: ${result.fingerprint}`,
    "",
    "## Summary",
    "",
    result.summary,
    "",
    "## Decisions",
    ""
  ];

  result.reinstatementDecisions.forEach((decision) => {
    lines.push(`- ${decision.userId}: ${decision.decision}, reputation accrual ${decision.reputationAccrual}`);
  });

  lines.push("", "## Findings", "");
  if (result.findings.length === 0) {
    lines.push("- No probation or reinstatement blockers found.");
  } else {
    result.findings.forEach((item) => {
      lines.push(`- ${item.severity.toUpperCase()} ${item.code}: ${item.message}`);
      lines.push(`  - Remediation: ${item.remediation}`);
    });
  }

  return `${lines.join("\n")}\n`;
}

function renderSvgSummary(result) {
  const counts = result.findingCounts;
  const critical = counts.critical ?? 0;
  const high = counts.high ?? 0;
  const warning = counts.warning ?? 0;
  const ready = result.status === "READY";
  const statusColor = ready ? "#16794c" : result.status === "REVIEW" ? "#a15c00" : "#a11b32";
  const holdWidth = Math.min(320, (critical + high) * 60);
  const warningWidth = Math.min(220, warning * 55);
  const readyWidth = ready ? 280 : Math.max(80, 280 - holdWidth);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Reputation probation reinstatement guard summary">`,
    `<rect width="960" height="540" fill="#111827"/>`,
    `<rect x="48" y="48" width="864" height="444" rx="18" fill="#f8fafc"/>`,
    `<text x="82" y="118" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#111827">Probation reinstatement guard</text>`,
    `<text x="82" y="164" font-family="Arial, sans-serif" font-size="20" fill="#475569">Status ${escapeXml(result.status)} - fingerprint ${escapeXml(result.fingerprint)}</text>`,
    `<rect x="82" y="220" width="${readyWidth}" height="62" fill="#16794c"/>`,
    `<rect x="${82 + readyWidth}" y="220" width="${warningWidth}" height="62" fill="#a15c00"/>`,
    `<rect x="${82 + readyWidth + warningWidth}" y="220" width="${holdWidth}" height="62" fill="${statusColor}"/>`,
    `<text x="96" y="260" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#ffffff">TRUST</text>`,
    `<text x="82" y="346" font-family="Arial, sans-serif" font-size="22" fill="#334155">Held reinstatements: ${result.reinstatementDecisions.filter((item) => item.decision === "HOLD").length}</text>`,
    `<text x="82" y="386" font-family="Arial, sans-serif" font-size="22" fill="#334155">Critical/high blockers: ${critical + high}</text>`,
    `<text x="82" y="426" font-family="Arial, sans-serif" font-size="22" fill="#334155">Users checked: ${result.reinstatementDecisions.length}</text>`,
    `</svg>`
  ].join("\n");
}

function inspectUser(user, index, policy, now, findings) {
  const userId = user.id ?? `user-${index}`;
  const path = `users[${index}]`;
  const probation = isPlainObject(user.probation) ? user.probation : {};
  const reinstatement = isPlainObject(user.reinstatement) ? user.reinstatement : {};
  const reputationEvents = asArray(user.reputationEvents);
  const nowTime = timeValue(now);

  if (!user.id) {
    findings.push(
      finding(
        "USER_MISSING_ID",
        "high",
        `User at index ${index} has no stable id.`,
        "Reputation moderation decisions need stable profile identifiers.",
        `${path}.id`,
        "Attach a stable user id before evaluating reinstatement.",
        "moderation lead",
        userId
      )
    );
  }

  if (!probation.reasonCode || !probation.startedAt) {
    findings.push(
      finding(
        "PROBATION_RECORD_INCOMPLETE",
        "high",
        `${userId} has an incomplete probation record.`,
        "Probation holds should explain the moderation basis and start time.",
        `${path}.probation`,
        "Attach reason code, start timestamp, and moderation receipt.",
        "moderation lead",
        userId
      )
    );
  }

  const minimumDays = Number(policy.minimumProbationDays ?? 30);
  const probationEnd = probation.startedAt ? timeValue(probation.startedAt) + minimumDays * 86400000 : null;
  if (probationEnd && nowTime < probationEnd) {
    findings.push(
      finding(
        "PROBATION_WINDOW_ACTIVE",
        "critical",
        `${userId} is still inside the minimum probation window.`,
        "Reputation accrual and badge/leaderboard re-entry should remain paused until the cooling-off period ends.",
        `${path}.probation.startedAt`,
        `Wait until ${new Date(probationEnd).toISOString()} before reinstatement review.`,
        "moderation lead",
        userId
      )
    );
  }

  if (probation.appealStatus === "open" || probation.appealStatus === "pending") {
    findings.push(
      finding(
        "OPEN_APPEAL_BLOCKS_REINSTATEMENT",
        "high",
        `${userId} has an unresolved appeal tied to the probation record.`,
        "Profiles should not receive reputation deltas while the moderation outcome is still contested.",
        `${path}.probation.appealStatus`,
        "Resolve the appeal or keep reputation accrual paused.",
        "appeals moderator",
        userId
      )
    );
  }

  if (!reinstatement.requestedAt) {
    findings.push(
      finding(
        "REINSTATEMENT_REQUEST_MISSING",
        "high",
        `${userId} has no reinstatement request timestamp.`,
        "The system cannot prove that a contributor asked to re-enter reputation accrual.",
        `${path}.reinstatement.requestedAt`,
        "Record a reinstatement request and reviewer packet.",
        "community manager",
        userId
      )
    );
  }

  const requiredActions = new Set(asArray(policy.requiredRemediationActions).map(String));
  const completedActions = new Set(asArray(reinstatement.completedActions).map(String));
  const missingActions = [...requiredActions].filter((action) => !completedActions.has(action));
  if (missingActions.length > 0) {
    findings.push(
      finding(
        "REMEDIATION_ACTIONS_INCOMPLETE",
        "high",
        `${userId} has not completed required remediation action(s): ${missingActions.join(", ")}.`,
        "Reinstatement should require verifiable remediation before reputation signals resume.",
        `${path}.reinstatement.completedActions`,
        "Complete and attach evidence for all required remediation actions.",
        "community manager",
        userId
      )
    );
  }

  if (asArray(reinstatement.reviewers).length < Number(policy.requiredReviewerQuorum ?? 2)) {
    findings.push(
      finding(
        "REINSTATEMENT_REVIEW_QUORUM_MISSING",
        "high",
        `${userId} lacks the required reinstatement reviewer quorum.`,
        "Single-reviewer reinstatement can undermine moderation consistency.",
        `${path}.reinstatement.reviewers`,
        "Add independent moderator approvals before re-entry.",
        "moderation lead",
        userId
      )
    );
  }

  if (reinstatement.summaryVisibility !== "public-redacted") {
    findings.push(
      finding(
        "REINSTATEMENT_SUMMARY_VISIBILITY_UNSAFE",
        "warning",
        `${userId} reinstatement summary is not configured for public-redacted visibility.`,
        "Community timelines need transparency without exposing private moderation notes.",
        `${path}.reinstatement.summaryVisibility`,
        "Publish a redacted reinstatement receipt and keep private evidence internal.",
        "community manager",
        userId
      )
    );
  }

  const blockedEvents = reputationEvents.filter((event) => {
    const eventTime = timeValue(event.at);
    return eventTime >= timeValue(probation.startedAt) && eventTime <= nowTime && event.applied === true;
  });
  if (blockedEvents.length > 0) {
    findings.push(
      finding(
        "REPUTATION_DELTA_DURING_PROBATION",
        "critical",
        `${userId} received ${blockedEvents.length} reputation delta(s) during probation.`,
        "Probation should pause reputation accrual, badges, and leaderboard effects.",
        `${path}.reputationEvents`,
        "Reverse or quarantine probation-window reputation deltas before reinstatement.",
        "reputation admin",
        userId
      )
    );
  }

  if (Number(reinstatement.scoreCapPercent ?? 100) > Number(policy.maxReentryScoreCapPercent ?? 50)) {
    findings.push(
      finding(
        "REENTRY_SCORE_CAP_TOO_HIGH",
        "warning",
        `${userId} re-entry score cap is above policy.`,
        "Gradual re-entry protects leaderboards and badges from immediate trust jumps.",
        `${path}.reinstatement.scoreCapPercent`,
        "Apply the policy score cap until the post-reinstatement review window closes.",
        "reputation admin",
        userId
      )
    );
  }
}

function determineStatus(findings) {
  if (findings.some((item) => item.severity === "critical" || item.severity === "high")) {
    return "HOLD";
  }
  if (findings.some((item) => item.severity === "warning")) {
    return "REVIEW";
  }
  return "READY";
}

function summarize(status, findings, userCount) {
  if (status === "READY") {
    return `All ${userCount} user probation record(s) are eligible for transparent, capped reputation re-entry.`;
  }
  const counts = countBySeverity(findings);
  return `Reputation reinstatement is ${status.toLowerCase()} with ${counts.critical ?? 0} critical, ${counts.high ?? 0} high, and ${counts.warning ?? 0} warning finding(s).`;
}

function finding(code, severity, message, impact, path, remediation, owner = "moderation lead", userId = null) {
  return { code, severity, message, impact, path, remediation, owner, userId };
}

function sortFindings(findings) {
  return findings.sort((left, right) => {
    const severityDelta = SEVERITY_ORDER.indexOf(left.severity) - SEVERITY_ORDER.indexOf(right.severity);
    if (severityDelta !== 0) {
      return severityDelta;
    }
    return left.code.localeCompare(right.code);
  });
}

function countBySeverity(findings) {
  return findings.reduce((counts, item) => {
    counts[item.severity] = (counts[item.severity] ?? 0) + 1;
    return counts;
  }, {});
}

function timeValue(value) {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

module.exports = {
  evaluateProbationReinstatementPacket,
  renderMarkdownReport,
  renderSvgSummary
};
