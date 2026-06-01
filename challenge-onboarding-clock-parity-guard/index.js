"use strict";

const crypto = require("node:crypto");

const SEVERITY_ORDER = ["critical", "high", "warning", "info"];

function evaluateOnboardingClockPacket(packet, options = {}) {
  if (!isPlainObject(packet)) {
    throw new TypeError("evaluateOnboardingClockPacket expects a packet object");
  }

  const now = options.now ?? new Date().toISOString();
  const challenge = isPlainObject(packet.challenge) ? packet.challenge : {};
  const onboarding = isPlainObject(packet.onboarding) ? packet.onboarding : {};
  const clock = isPlainObject(packet.submissionClock) ? packet.submissionClock : {};
  const teams = asArray(packet.acceptedTeams);
  const minimumQuota = isPlainObject(onboarding.minimumQuota) ? onboarding.minimumQuota : {};
  const requiredTools = new Set(asArray(onboarding.requiredTools).map(String));
  const requiredSupportChannels = new Set(asArray(onboarding.requiredSupportChannels).map(String));
  const findings = [];

  if (!challenge.id || !challenge.title) {
    findings.push(
      finding(
        "PACKET_SCHEMA_MISSING_CHALLENGE",
        "high",
        "Onboarding packet is missing a challenge id or title.",
        "Clock-start decisions need a stable challenge record.",
        "challenge",
        "Attach challenge metadata before evaluating onboarding parity.",
        "challenge admin"
      )
    );
  }

  if (!clock.startsAt) {
    findings.push(
      finding(
        "SUBMISSION_CLOCK_MISSING_START",
        "critical",
        "Submission clock has no proposed start timestamp.",
        "Teams cannot verify whether they received their full competition window.",
        "submissionClock.startsAt",
        "Set the proposed clock start after onboarding evidence is collected.",
        "challenge admin"
      )
    );
  }

  if (teams.length === 0) {
    findings.push(
      finding(
        "NO_ACCEPTED_TEAMS",
        "high",
        "No accepted teams are present in the onboarding packet.",
        "The guard cannot prove access parity without accepted-team records.",
        "acceptedTeams",
        "Attach accepted-team onboarding records.",
        "challenge admin"
      )
    );
  }

  teams.forEach((team, index) => {
    inspectTeam({
      team,
      index,
      onboarding,
      clock,
      requiredTools,
      requiredSupportChannels,
      minimumQuota,
      findings
    });
  });

  inspectParity(teams, clock, findings);

  const sortedFindings = sortFindings(findings);
  const status = determineStatus(sortedFindings);
  const summary = summarize(status, sortedFindings, teams.length);
  const remediationActions = sortedFindings.map((item) => ({
    code: item.code,
    owner: item.owner,
    action: item.remediation
  }));
  const nextClockStart = recommendClockStart(clock, teams, sortedFindings);
  const fingerprint = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        challenge,
        onboarding,
        clock,
        teams: teams.map((team) => ({
          id: team.id,
          acceptedAt: team.acceptedAt,
          workspace: team.workspace,
          support: team.support
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
    nextClockStart,
    teamReadiness: teams.map((team) => ({
      teamId: team.id,
      readyAt: team.workspace?.readyAt ?? null,
      toolsReady: containsAll(asArray(team.workspace?.tools), requiredTools),
      supportReady: containsAll(asArray(team.support?.channels), requiredSupportChannels),
      starterKitChecksum: team.workspace?.starterKitChecksum ?? null
    })),
    remediationActions,
    fingerprint
  };
}

function renderMarkdownReport(result, packet) {
  const lines = [
    "# Challenge Onboarding Clock Parity Guard",
    "",
    `Challenge: ${packet.challenge?.title ?? "Untitled challenge"}`,
    `Status: ${result.status}`,
    `Fingerprint: ${result.fingerprint}`,
    `Recommended clock start: ${result.nextClockStart ?? "not ready"}`,
    "",
    "## Summary",
    "",
    result.summary,
    "",
    "## Team Readiness",
    ""
  ];

  result.teamReadiness.forEach((team) => {
    lines.push(
      `- ${team.teamId}: readyAt=${team.readyAt ?? "missing"}, tools=${team.toolsReady ? "ready" : "missing"}, support=${team.supportReady ? "ready" : "missing"}`
    );
  });

  lines.push("", "## Findings", "");
  if (result.findings.length === 0) {
    lines.push("- No onboarding clock blockers found.");
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
  const statusColor = ready ? "#16794c" : result.status === "DELAY_CLOCK" ? "#a15c00" : "#a11b32";
  const holdWidth = Math.min(320, (critical + high) * 54);
  const warningWidth = Math.min(220, warning * 50);
  const readyWidth = ready ? 280 : Math.max(80, 280 - holdWidth);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Onboarding clock parity guard summary">`,
    `<rect width="960" height="540" fill="#111827"/>`,
    `<rect x="48" y="48" width="864" height="444" rx="18" fill="#f8fafc"/>`,
    `<text x="82" y="118" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#111827">Onboarding clock parity</text>`,
    `<text x="82" y="164" font-family="Arial, sans-serif" font-size="20" fill="#475569">Status ${escapeXml(result.status)} - fingerprint ${escapeXml(result.fingerprint)}</text>`,
    `<rect x="82" y="220" width="${readyWidth}" height="62" fill="#16794c"/>`,
    `<rect x="${82 + readyWidth}" y="220" width="${warningWidth}" height="62" fill="#a15c00"/>`,
    `<rect x="${82 + readyWidth + warningWidth}" y="220" width="${holdWidth}" height="62" fill="${statusColor}"/>`,
    `<text x="96" y="260" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#ffffff">CLOCK</text>`,
    `<text x="82" y="346" font-family="Arial, sans-serif" font-size="22" fill="#334155">Critical/high blockers: ${critical + high}</text>`,
    `<text x="82" y="386" font-family="Arial, sans-serif" font-size="22" fill="#334155">Warnings: ${warning}</text>`,
    `<text x="82" y="426" font-family="Arial, sans-serif" font-size="22" fill="#334155">Teams checked: ${result.teamReadiness.length}</text>`,
    `</svg>`
  ].join("\n");
}

function inspectTeam({ team, index, onboarding, clock, requiredTools, requiredSupportChannels, minimumQuota, findings }) {
  const teamId = team.id ?? `team-${index}`;
  const path = `acceptedTeams[${index}]`;
  const workspace = isPlainObject(team.workspace) ? team.workspace : {};
  const support = isPlainObject(team.support) ? team.support : {};
  const clockStart = parseTime(clock.startsAt);
  const readyAt = parseTime(workspace.readyAt);

  if (!team.id) {
    findings.push(
      finding(
        "TEAM_MISSING_ID",
        "high",
        `Accepted team at index ${index} has no stable id.`,
        "Onboarding parity evidence needs stable team identifiers.",
        `${path}.id`,
        "Attach a stable team id before opening the submission clock.",
        "challenge admin"
      )
    );
  }

  if (!workspace.readyAt) {
    findings.push(
      finding(
        "WORKSPACE_NOT_READY",
        "critical",
        `${teamId} has no ready workspace timestamp.`,
        "The submission clock should not begin for any accepted team until every workspace is usable.",
        `${path}.workspace.readyAt`,
        "Provision the workspace and record the ready timestamp before starting the clock.",
        "platform ops"
      )
    );
  } else if (clockStart && readyAt && readyAt > clockStart) {
    findings.push(
      finding(
        "WORKSPACE_READY_AFTER_CLOCK_START",
        "critical",
        `${teamId} became workspace-ready after the proposed submission clock start.`,
        "Late workspace readiness silently reduces that team's competition window.",
        `${path}.workspace.readyAt`,
        "Delay the submission clock until this workspace and all peers are ready.",
        "challenge admin"
      )
    );
  }

  if (workspace.templateVersion !== onboarding.templateVersion) {
    findings.push(
      finding(
        "WORKSPACE_TEMPLATE_MISMATCH",
        "high",
        `${teamId} received template ${workspace.templateVersion ?? "missing"} instead of ${onboarding.templateVersion ?? "the canonical template"}.`,
        "Different starter templates can change solver workload and reproducibility.",
        `${path}.workspace.templateVersion`,
        "Rebuild the workspace from the canonical challenge template.",
        "platform ops"
      )
    );
  }

  if (workspace.starterKitChecksum !== onboarding.starterKitChecksum) {
    findings.push(
      finding(
        "STARTER_KIT_CHECKSUM_MISMATCH",
        "high",
        `${teamId} received a starter kit checksum that does not match the canonical kit.`,
        "Teams must start from equivalent starter notebooks, fixtures, and instructions.",
        `${path}.workspace.starterKitChecksum`,
        "Re-issue the canonical starter kit and refresh the checksum evidence.",
        "platform ops"
      )
    );
  }

  if (!containsAll(asArray(workspace.tools), requiredTools)) {
    findings.push(
      finding(
        "REQUIRED_TOOL_ACCESS_MISSING",
        "high",
        `${teamId} is missing one or more required tools before clock start.`,
        "Unequal tool access creates avoidable solver disadvantage.",
        `${path}.workspace.tools`,
        "Grant all required tools before starting or resuming the submission clock.",
        "platform ops"
      )
    );
  }

  const extraTools = asArray(workspace.tools).filter((tool) => !requiredTools.has(String(tool)));
  if (extraTools.length > 0 && workspace.extraToolsApproved !== true) {
    findings.push(
      finding(
        "UNAPPROVED_EXTRA_TOOL_ACCESS",
        "warning",
        `${teamId} has extra tool access not listed in the canonical onboarding plan.`,
        "Extra tools may be fine, but they should be explicitly approved or granted to all teams.",
        `${path}.workspace.tools`,
        "Approve the extra tools as non-material or normalize tool access across teams.",
        "challenge admin"
      )
    );
  }

  if (!quotaAtLeast(workspace.computeQuota, minimumQuota)) {
    findings.push(
      finding(
        "COMPUTE_QUOTA_BELOW_BASELINE",
        "high",
        `${teamId} has less compute quota than the published onboarding baseline.`,
        "Solver teams need equivalent budget to run starter notebooks and benchmarks.",
        `${path}.workspace.computeQuota`,
        "Top up compute quota before opening the submission clock.",
        "platform ops"
      )
    );
  }

  if (!containsAll(asArray(support.channels), requiredSupportChannels)) {
    findings.push(
      finding(
        "SUPPORT_CHANNEL_VISIBILITY_MISSING",
        "high",
        `${teamId} cannot see every required support channel.`,
        "Support-channel asymmetry changes how quickly teams can resolve setup blockers.",
        `${path}.support.channels`,
        "Add the team to all required support channels before clock start.",
        "community ops"
      )
    );
  }

  if (support.firstResponseAt && clockStart && parseTime(support.firstResponseAt) > clockStart && team.setupBlockerOpen === true) {
    findings.push(
      finding(
        "SETUP_BLOCKER_RESPONSE_AFTER_CLOCK_START",
        "warning",
        `${teamId} still had a setup blocker when the proposed clock started.`,
        "Clock fairness is weaker if setup support starts after the challenge window begins.",
        `${path}.support.firstResponseAt`,
        "Pause or delay the clock until setup blockers receive an actionable response.",
        "community ops"
      )
    );
  }
}

function inspectParity(teams, clock, findings) {
  const clockStart = parseTime(clock.startsAt);
  if (!clockStart || teams.length <= 1) {
    return;
  }

  const readyTimes = teams.map((team) => parseTime(team.workspace?.readyAt)).filter(Boolean).sort((left, right) => left - right);
  if (readyTimes.length !== teams.length) {
    findings.push(
      finding(
        "CLOCK_START_BEFORE_ALL_TEAMS_READY",
        "critical",
        "The proposed submission clock starts before every accepted team is workspace-ready.",
        "The system should start or resume the challenge window only after equivalent access is verified.",
        "submissionClock.startsAt",
        "Move the clock start to the latest ready timestamp plus any published buffer.",
        "challenge admin"
      )
    );
    return;
  }

  const earliest = readyTimes[0];
  const latest = readyTimes[readyTimes.length - 1];
  const skewMinutes = Math.round((latest - earliest) / 60000);
  const maxSkewMinutes = Number(clock.maxReadySkewMinutes ?? 30);
  if (skewMinutes > maxSkewMinutes) {
    findings.push(
      finding(
        "WORKSPACE_READY_SKEW_EXCEEDS_POLICY",
        "warning",
        `Accepted-team workspaces became ready ${skewMinutes} minutes apart.`,
        "Large readiness skew can be fair only if the submission clock starts after the last team is ready.",
        "acceptedTeams.workspace.readyAt",
        "Start the clock after the last ready timestamp or document an equal-window adjustment.",
        "challenge admin"
      )
    );
  }

  if (latest > clockStart) {
    findings.push(
      finding(
        "CLOCK_START_BEFORE_ALL_TEAMS_READY",
        "critical",
        "The proposed submission clock starts before every accepted team is workspace-ready.",
        "The system should start or resume the challenge window only after equivalent access is verified.",
        "submissionClock.startsAt",
        "Move the clock start to the latest ready timestamp plus any published buffer.",
        "challenge admin"
      )
    );
  }
}

function recommendClockStart(clock, teams, findings) {
  const hasCriticalSchema = findings.some((item) => item.code === "SUBMISSION_CLOCK_MISSING_START" || item.code === "NO_ACCEPTED_TEAMS");
  if (hasCriticalSchema) {
    return null;
  }
  const readyTimes = teams.map((team) => parseTime(team.workspace?.readyAt)).filter(Boolean);
  if (readyTimes.length !== teams.length) {
    return null;
  }
  const bufferMinutes = Number(clock.postReadyBufferMinutes ?? 15);
  const latestReady = Math.max(...readyTimes.map((time) => time.getTime()));
  return new Date(latestReady + bufferMinutes * 60000).toISOString();
}

function determineStatus(findings) {
  if (findings.some((item) => item.severity === "critical")) {
    return "HOLD";
  }
  if (findings.some((item) => item.severity === "high")) {
    return "DELAY_CLOCK";
  }
  if (findings.some((item) => item.severity === "warning")) {
    return "REVISE";
  }
  return "READY";
}

function summarize(status, findings, teamCount) {
  if (status === "READY") {
    return `All ${teamCount} accepted team(s) have equivalent starter workspace, tool, quota, and support access before clock start.`;
  }
  const counts = countBySeverity(findings);
  return `Onboarding clock is ${status.toLowerCase()} with ${counts.critical ?? 0} critical, ${counts.high ?? 0} high, and ${counts.warning ?? 0} warning finding(s).`;
}

function finding(code, severity, message, impact, path, remediation, owner = "challenge admin") {
  return { code, severity, message, impact, path, remediation, owner };
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

function quotaAtLeast(actual, minimum) {
  if (!isPlainObject(actual)) {
    return false;
  }
  return Object.entries(minimum).every(([key, value]) => Number(actual[key] ?? 0) >= Number(value));
}

function containsAll(values, required) {
  const set = new Set(asArray(values).map(String));
  for (const item of required) {
    if (!set.has(item)) {
      return false;
    }
  }
  return true;
}

function parseTime(value) {
  if (!value) {
    return null;
  }
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? null : time;
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
  evaluateOnboardingClockPacket,
  renderMarkdownReport,
  renderSvgSummary
};
