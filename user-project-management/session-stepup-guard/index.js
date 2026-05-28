const crypto = require("crypto");

const SEVERITY_WEIGHT = {
  blocker: 30,
  high: 18,
  medium: 9,
  low: 4,
};

const SENSITIVE_ACTIONS = new Set([
  "restricted-data-export",
  "role-grant",
  "project-visibility-public",
  "archive-project",
  "delete-project",
  "anonymous-review-deanonymize",
]);

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

function minutesBetween(older, newer) {
  return Math.max(0, (new Date(newer).getTime() - new Date(older).getTime()) / 60000);
}

function hoursBetween(older, newer) {
  return minutesBetween(older, newer) / 60;
}

function addFinding(findings, severity, code, title, evidence, action) {
  findings.push({ severity, code, title, evidence, action });
}

function checkImpossibleTravel(session, previousSessions) {
  const recent = previousSessions
    .filter((previous) => previous.userId === session.userId && previous.endedAt)
    .sort((a, b) => new Date(b.endedAt) - new Date(a.endedAt))[0];
  if (!recent || !recent.geo || !session.geo) {
    return null;
  }
  const elapsedHours = hoursBetween(recent.endedAt, session.startedAt);
  const distanceKm = Number(session.geo.distanceFromPreviousKm || 0);
  if (elapsedHours > 0 && distanceKm / elapsedHours > 900) {
    return {
      elapsedHours,
      distanceKm,
      previousLocation: recent.geo.label,
      currentLocation: session.geo.label,
    };
  }
  return null;
}

function evaluateSessionStepUp(packet) {
  const { user, project, session, action, previousSessions = [] } = packet;
  const findings = [];
  const now = packet.now || new Date().toISOString();
  const sensitive = SENSITIVE_ACTIONS.has(action.type) || action.objectSensitivity === "restricted";
  const mfaAgeMinutes = session.mfaVerifiedAt ? minutesBetween(session.mfaVerifiedAt, now) : Infinity;
  const passkeyAgeMinutes = session.passkeyVerifiedAt ? minutesBetween(session.passkeyVerifiedAt, now) : Infinity;
  const sessionAgeHours = hoursBetween(session.startedAt, now);
  const idleMinutes = minutesBetween(session.lastActiveAt, now);
  const deviceAgeDays = session.device && session.device.firstSeenAt ? hoursBetween(session.device.firstSeenAt, now) / 24 : 0;

  if (sensitive && mfaAgeMinutes > 15 && passkeyAgeMinutes > 15) {
    addFinding(
      findings,
      "blocker",
      "STEP_UP_REQUIRED",
      "Sensitive project action lacks fresh MFA or passkey evidence",
      `${action.type} on ${action.objectId} has MFA age ${Math.round(mfaAgeMinutes)} minutes and passkey age ${Math.round(passkeyAgeMinutes)} minutes.`,
      "Require fresh MFA/passkey verification before allowing the action."
    );
  }

  if (session.device && !session.device.trusted && sensitive) {
    addFinding(
      findings,
      "high",
      "UNTRUSTED_DEVICE",
      "Sensitive action originates from an untrusted device",
      `Device ${session.device.id} is not remembered/trusted for ${user.id}.`,
      "Hold the action until the user completes device verification or uses a known managed device."
    );
  }

  if (session.device && deviceAgeDays < 1 && sensitive) {
    addFinding(
      findings,
      "medium",
      "NEW_DEVICE_FOR_SENSITIVE_ACTION",
      "New device is attempting a sensitive project action",
      `Device first seen ${Math.round(deviceAgeDays * 10) / 10} days ago.`,
      "Require owner notification and step-up before granting project changes from a new device."
    );
  }

  const travel = checkImpossibleTravel(session, previousSessions);
  if (travel) {
    addFinding(
      findings,
      "high",
      "IMPOSSIBLE_TRAVEL",
      "Session geography is inconsistent with recent access",
      `${travel.previousLocation} to ${travel.currentLocation}: ${Math.round(travel.distanceKm)} km in ${Math.round(travel.elapsedHours * 10) / 10} hours.`,
      "Require step-up verification, revoke remembered-device trust, and notify project owners."
    );
  }

  if (sessionAgeHours > 12 || idleMinutes > 60) {
    addFinding(
      findings,
      sensitive ? "high" : "medium",
      "STALE_SESSION",
      "Session is too old or idle for the requested action",
      `Session age ${Math.round(sessionAgeHours * 10) / 10} hours; idle ${Math.round(idleMinutes)} minutes.`,
      "Refresh the session and rerun permission evaluation before project state changes."
    );
  }

  if (action.type === "anonymous-review-deanonymize" && !user.roles.includes("identity-steward")) {
    addFinding(
      findings,
      "blocker",
      "ANONYMOUS_ESCROW_AUTHORITY_MISSING",
      "User lacks identity-steward authority for anonymous-review de-anonymization",
      `${user.id} has roles ${user.roles.join(", ")}.`,
      "Route the request to an identity steward and preserve the anonymous-review escrow audit trail."
    );
  }

  if (project.requiresManagedDevice && (!session.device || !session.device.managed)) {
    addFinding(
      findings,
      sensitive ? "high" : "medium",
      "MANAGED_DEVICE_REQUIRED",
      "Project policy requires a managed device",
      `${project.id} requires managed-device posture for restricted project actions.`,
      "Use a managed device or request an explicit data-steward exception."
    );
  }

  if (sensitive && !session.hardwareKeyEnrolled && project.dataClass === "restricted-human-subjects") {
    addFinding(
      findings,
      "medium",
      "HARDWARE_KEY_GAP",
      "Restricted project action lacks hardware-key enrollment",
      `${user.id} has no hardware-key enrollment for ${project.dataClass}.`,
      "Enroll a hardware key before persistent elevated project administration."
    );
  }

  const riskScore = Math.min(100, findings.reduce((sum, finding) => sum + SEVERITY_WEIGHT[finding.severity], 0));
  const blockers = findings.filter((finding) => finding.severity === "blocker").length;
  const high = findings.filter((finding) => finding.severity === "high").length;
  const decision = blockers ? "deny-until-step-up" : high ? "hold-for-owner-review" : findings.length ? "allow-with-step-up-note" : "allow";
  const reviewPacket = {
    userId: user.id,
    projectId: project.id,
    actionType: action.type,
    decision,
    riskScore,
    sensitive,
    findings,
    actions: findings.map((finding) => ({ code: finding.code, action: finding.action })),
    sessionDigest: digest({
      sessionId: session.id,
      deviceId: session.device && session.device.id,
      startedAt: session.startedAt,
      lastActiveAt: session.lastActiveAt,
      action: action.type,
    }),
    generatedFrom: "synthetic-data-only",
  };

  return {
    ...reviewPacket,
    auditDigest: digest(reviewPacket),
  };
}

function renderMarkdownReport(result) {
  const lines = [
    "# Project Session Step-Up Review",
    "",
    `Decision: ${result.decision}`,
    `Risk score: ${result.riskScore}`,
    `Action: ${result.actionType}`,
    `Session digest: ${result.sessionDigest}`,
    `Audit digest: ${result.auditDigest}`,
    "",
    "## Findings",
  ];
  if (!result.findings.length) {
    lines.push("- No session/device step-up blockers.");
  } else {
    result.findings.forEach((finding) => {
      lines.push(`- [${finding.severity}] ${finding.title}: ${finding.evidence}`);
      lines.push(`  Action: ${finding.action}`);
    });
  }
  lines.push("", "## Safety", "- Synthetic user/session/project packet only; no live identity-provider calls.");
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
  const color = result.decision === "deny-until-step-up" ? "#b42318" : result.decision === "allow" ? "#067647" : "#b54708";
  const rows = result.findings
    .slice(0, 5)
    .map((finding, index) => {
      const y = 215 + index * 54;
      return `<text x="56" y="${y}" fill="#111827" font-family="Arial" font-size="20">${escapeXml(finding.severity.toUpperCase())}: ${escapeXml(finding.title).slice(0, 72)}</text>
<text x="56" y="${y + 25}" fill="#667085" font-family="Arial" font-size="15">${escapeXml(finding.code)}</text>`;
    })
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
<rect width="1280" height="720" fill="#f7f8fa"/>
<rect x="36" y="36" width="1208" height="648" rx="18" fill="#ffffff" stroke="#d0d5dd"/>
<text x="56" y="88" fill="#101828" font-family="Arial" font-size="32" font-weight="700">Project Session Step-Up Guard</text>
<text x="56" y="126" fill="#475467" font-family="Arial" font-size="20">Session and device posture before sensitive project actions</text>
<rect x="56" y="150" width="330" height="44" rx="8" fill="${color}"/>
<text x="74" y="179" fill="#ffffff" font-family="Arial" font-size="20" font-weight="700">${escapeXml(result.decision.toUpperCase())}</text>
<text x="416" y="179" fill="#101828" font-family="Arial" font-size="22">Risk score: ${result.riskScore}</text>
${rows}
<text x="56" y="640" fill="#667085" font-family="Arial" font-size="18">Audit digest: ${escapeXml(result.auditDigest)} | Synthetic data only | No external services</text>
</svg>`;
}

module.exports = {
  evaluateSessionStepUp,
  renderMarkdownReport,
  renderSvgSummary,
  stableStringify,
  digest,
};
