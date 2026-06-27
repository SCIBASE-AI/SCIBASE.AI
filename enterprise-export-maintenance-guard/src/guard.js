import crypto from "node:crypto";

const HOUR_MS = 60 * 60 * 1000;

function addFinding(findings, severity, code, message, remediation) {
  findings.push({ severity, code, message, remediation });
}

function parseTime(value) {
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    throw new Error(`Invalid timestamp: ${value}`);
  }
  return time;
}

function isInsideWindow(timestamp, window) {
  return timestamp >= parseTime(window.startsAt) && timestamp <= parseTime(window.endsAt);
}

function minutesUntilEnd(timestamp, window) {
  return Math.ceil((parseTime(window.endsAt) - timestamp) / 60000);
}

function evaluateWindows(job, findings) {
  const requestedAt = parseTime(job.requestedAt);
  const activeMaintenance = job.maintenanceWindows.find((window) => isInsideWindow(requestedAt, window));
  if (activeMaintenance) {
    addFinding(
      findings,
      "high",
      "ACTIVE_DESTINATION_MAINTENANCE",
      `${job.exportTarget} is in maintenance: ${activeMaintenance.reason}.`,
      `Defer export for at least ${minutesUntilEnd(requestedAt, activeMaintenance)} minutes or route to a safe queue.`,
    );
  }

  const activeBlackout = job.blackoutCalendar.find((window) => isInsideWindow(requestedAt, window));
  if (activeBlackout) {
    addFinding(
      findings,
      "medium",
      "INSTITUTIONAL_BLACKOUT_WINDOW",
      `Institutional blackout is active: ${activeBlackout.reason}.`,
      "Wait for the institutional export freeze to end or obtain explicit admin override evidence.",
    );
  }
}

function evaluateStatusEvidence(job, findings) {
  const requestedAt = parseTime(job.requestedAt);
  const checkedAt = parseTime(job.statusEvidence.checkedAt);
  const ageHours = (requestedAt - checkedAt) / HOUR_MS;

  if (ageHours > 12) {
    addFinding(
      findings,
      "medium",
      "STALE_DESTINATION_STATUS_EVIDENCE",
      `Status evidence is ${ageHours.toFixed(1)} hours old.`,
      "Refresh destination health evidence before exporting to institutional systems.",
    );
  }

  if (job.statusEvidence.health !== "operational") {
    addFinding(
      findings,
      "high",
      "DEGRADED_DESTINATION_HEALTH",
      `${job.exportTarget} health is ${job.statusEvidence.health}.`,
      "Hold embargo-sensitive exports or queue non-sensitive exports until destination health recovers.",
    );
  }
}

function evaluateRetryAndOwnership(job, findings) {
  if (!job.ownerAcknowledgedAt) {
    addFinding(
      findings,
      "medium",
      "MISSING_OWNER_ACKNOWLEDGEMENT",
      "Export owner has not acknowledged destination timing risk.",
      "Collect owner acknowledgement before pushing to the external destination.",
    );
  }

  if (job.retryPolicy.retryAfterMinutes > job.retryPolicy.maxDelayMinutes) {
    addFinding(
      findings,
      "medium",
      "RETRY_WINDOW_EXCEEDS_POLICY",
      `Retry-after ${job.retryPolicy.retryAfterMinutes}m exceeds allowed delay ${job.retryPolicy.maxDelayMinutes}m.`,
      "Reschedule the job rather than relying on automatic retries beyond policy.",
    );
  }
}

export function evaluateExportMaintenanceJob(job) {
  const findings = [];
  evaluateWindows(job, findings);
  evaluateStatusEvidence(job, findings);
  evaluateRetryAndOwnership(job, findings);

  const highCount = findings.filter((finding) => finding.severity === "high").length;
  const mediumCount = findings.filter((finding) => finding.severity === "medium").length;
  const decision = highCount > 0 && job.embargoSensitive ? "HOLD" : highCount > 0 || mediumCount > 0 ? "DEFER" : "SEND";
  const auditDigest = crypto
    .createHash("sha256")
    .update(JSON.stringify({ id: job.id, decision, findings }))
    .digest("hex")
    .slice(0, 16);

  return {
    jobId: job.id,
    exportTarget: job.exportTarget,
    decision,
    findingCount: findings.length,
    highCount,
    mediumCount,
    retryAfterMinutes: decision === "SEND" ? 0 : job.retryPolicy.retryAfterMinutes,
    findings,
    auditDigest,
  };
}

export function renderMarkdownReport(job, result) {
  const lines = [
    "# Enterprise Export Maintenance Guard Report",
    "",
    `- Job: ${job.id}`,
    `- Destination: ${job.exportTarget}`,
    `- Destination type: ${job.destinationType}`,
    `- Decision: ${result.decision}`,
    `- Audit digest: ${result.auditDigest}`,
    "",
    "## Findings",
    "",
  ];

  if (result.findings.length === 0) {
    lines.push("- No blockers found. Export can be sent now.");
  } else {
    for (const finding of result.findings) {
      lines.push(`- ${finding.severity.toUpperCase()} ${finding.code}: ${finding.message}`);
      lines.push(`  Remediation: ${finding.remediation}`);
    }
  }

  return `${lines.join("\n")}\n`;
}
