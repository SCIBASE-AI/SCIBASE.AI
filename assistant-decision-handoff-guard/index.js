const crypto = require("crypto");

const GENERATED_AT = "2026-05-31T00:00:00Z";

function requiredEvidenceFor(packet) {
  const byType = {
    peer_review_comment: ["manuscript-section", "evidence-snippet"],
    reproducibility_release: ["run-log", "environment-lock", "result-digest"],
    research_gap_opportunity: ["corpus-snapshot", "limitation-signal", "novelty-check"],
  };

  return byType[packet.outputType] || ["source-artifact", "evidence-snippet"];
}

function maxAgeDaysFor(packet) {
  const byType = {
    peer_review_comment: 14,
    reproducibility_release: 7,
    research_gap_opportunity: 30,
  };

  return byType[packet.outputType] || 14;
}

function daysOld(packet, now = GENERATED_AT) {
  const captured = Date.parse(packet.snapshotCapturedAt);
  const current = Date.parse(now);
  if (!Number.isFinite(captured) || !Number.isFinite(current)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(0, Math.floor((current - captured) / (24 * 60 * 60 * 1000)));
}

function missingEvidence(packet) {
  const present = new Set(packet.evidenceAnchors || []);
  return requiredEvidenceFor(packet).filter((item) => !present.has(item));
}

function conflictSignals(packet) {
  return (packet.upstreamSignals || []).filter((signal) =>
    ["block", "contradiction"].includes(signal.status)
  );
}

function needsHumanApproval(packet) {
  return packet.autoExecute || packet.impact === "high" || packet.outputType === "reproducibility_release";
}

function evaluateHandoff(packet, now = GENERATED_AT) {
  const blockers = [];
  const warnings = [];
  const actions = [];
  const missing = missingEvidence(packet);
  const conflicts = conflictSignals(packet);
  const age = daysOld(packet, now);
  const maxAge = maxAgeDaysFor(packet);

  if (packet.snapshotRevision !== packet.targetRevision) {
    blockers.push(
      `artifact revision drift: assistant used ${packet.snapshotRevision}, current target is ${packet.targetRevision}`
    );
    actions.push("refresh assistant context against the current artifact revision");
  }

  if (age > maxAge) {
    blockers.push(`snapshot is ${age} days old, above ${maxAge} day limit`);
    actions.push("refresh source snapshot before handoff");
  }

  if (missing.length > 0) {
    blockers.push(`missing evidence anchors: ${missing.join(", ")}`);
    actions.push("attach required evidence anchors before release");
  }

  for (const signal of conflicts) {
    blockers.push(`${signal.assistant} reported ${signal.status}: ${signal.detail}`);
    actions.push("resolve cross-assistant conflict before user-facing handoff");
  }

  if (needsHumanApproval(packet) && packet.humanApproval !== "approved") {
    blockers.push(`human approval is ${packet.humanApproval}`);
    actions.push("obtain responsible human approval for high-impact handoff");
  }

  if (packet.containsPrivateNotes) {
    blockers.push("private reviewer notes are present");
    actions.push("redact private reviewer notes before author-visible release");
  }

  if (packet.reviewerIdentityRisk) {
    blockers.push("reviewer identity leakage risk detected");
    actions.push("remove identity-bearing details from the handoff");
  }

  if (packet.confidence < 0.55) {
    blockers.push(`assistant confidence ${packet.confidence} is below release floor`);
    actions.push("rerun or demote the assistant output");
  } else if (packet.confidence < 0.7) {
    warnings.push(`assistant confidence ${packet.confidence} needs strengthening`);
    actions.push("keep the output in draft until more support is attached");
  }

  if ((packet.remediationSteps || []).length === 0) {
    warnings.push("no remediation steps provided");
    actions.push("add concrete next steps before handoff");
  }

  if (blockers.length === 0 && warnings.length === 0) {
    actions.push("release handoff to researcher-facing queue");
  } else if (blockers.length === 0) {
    actions.push("revise handoff before promotion");
  }

  const decision = blockers.length > 0 ? "hold" : warnings.length > 0 ? "revise" : "release";
  const result = {
    handoffId: packet.id,
    assistant: packet.assistant,
    outputType: packet.outputType,
    title: packet.title,
    targetArtifact: packet.targetArtifact,
    targetRevision: packet.targetRevision,
    snapshotRevision: packet.snapshotRevision,
    snapshotAgeDays: age,
    impact: packet.impact,
    confidence: packet.confidence,
    decision,
    blockers,
    warnings,
    actions: [...new Set(actions)],
  };

  return {
    ...result,
    auditDigest: digest(result),
  };
}

function evaluateHandoffBatch(packets, now = GENERATED_AT) {
  const decisions = packets.map((packet) => evaluateHandoff(packet, now));
  const summary = decisions.reduce(
    (acc, item) => {
      acc.total += 1;
      acc[item.decision] += 1;
      acc.blockers += item.blockers.length;
      acc.warnings += item.warnings.length;
      if (item.snapshotAgeDays > acc.maxSnapshotAgeDays) {
        acc.maxSnapshotAgeDays = item.snapshotAgeDays;
      }
      return acc;
    },
    {
      total: 0,
      release: 0,
      revise: 0,
      hold: 0,
      blockers: 0,
      warnings: 0,
      maxSnapshotAgeDays: 0,
    }
  );

  const report = {
    generatedAt: new Date(now).toISOString(),
    summary,
    decisions,
  };

  return {
    ...report,
    auditDigest: digest(report),
  };
}

function renderMarkdownReport(report) {
  const lines = [
    "# Assistant Decision Handoff Guard Report",
    "",
    `Generated: ${report.generatedAt}`,
    `Audit digest: ${report.auditDigest}`,
    "",
    "## Summary",
    "",
    `- Handoff packets: ${report.summary.total}`,
    `- Release: ${report.summary.release}`,
    `- Revise: ${report.summary.revise}`,
    `- Hold: ${report.summary.hold}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Max snapshot age days: ${report.summary.maxSnapshotAgeDays}`,
    "",
    "## Decisions",
    "",
  ];

  for (const item of report.decisions) {
    lines.push(`### ${item.handoffId}`);
    lines.push("");
    lines.push(`- Assistant: ${item.assistant}`);
    lines.push(`- Output type: ${item.outputType}`);
    lines.push(`- Decision: ${item.decision}`);
    lines.push(`- Target: ${item.targetArtifact} @ ${item.targetRevision}`);
    lines.push(`- Snapshot revision: ${item.snapshotRevision}`);
    lines.push(`- Snapshot age days: ${item.snapshotAgeDays}`);
    lines.push(`- Confidence: ${item.confidence}`);
    lines.push(`- Blockers: ${item.blockers.join("; ") || "none"}`);
    lines.push(`- Warnings: ${item.warnings.join("; ") || "none"}`);
    lines.push(`- Actions: ${item.actions.join("; ")}`);
    lines.push(`- Digest: ${item.auditDigest}`);
    lines.push("");
  }

  while (lines[lines.length - 1] === "") {
    lines.pop();
  }

  return `${lines.join("\n")}\n`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSvgReport(report) {
  const cards = [
    ["Packets", report.summary.total, "#264653"],
    ["Release", report.summary.release, "#2a9d8f"],
    ["Revise", report.summary.revise, "#e9c46a"],
    ["Hold", report.summary.hold, "#e76f51"],
    ["Blockers", report.summary.blockers, "#8d3b72"],
    ["Max age", `${report.summary.maxSnapshotAgeDays}d`, "#457b9d"],
  ];

  const cardSvg = cards
    .map(([label, value, color], index) => {
      const x = 70 + (index % 3) * 382;
      const y = 184 + Math.floor(index / 3) * 148;
      return [
        `<rect x="${x}" y="${y}" width="322" height="108" rx="8" fill="#ffffff" stroke="#d8dee8"/>`,
        `<rect x="${x}" y="${y}" width="10" height="108" rx="4" fill="${color}"/>`,
        `<text x="${x + 30}" y="${y + 42}" font-size="24" font-family="Arial" fill="#344054">${escapeXml(label)}</text>`,
        `<text x="${x + 30}" y="${y + 82}" font-size="34" font-family="Arial" font-weight="700" fill="${color}">${escapeXml(value)}</text>`,
      ].join("\n");
    })
    .join("\n");

  const queueRows = report.decisions
    .filter((item) => item.decision !== "release")
    .slice(0, 4)
    .map((item, index) => {
      const y = 528 + index * 31;
      return `<text x="82" y="${y}" font-size="20" font-family="Arial" fill="#344054">${escapeXml(item.handoffId)} - ${escapeXml(item.decision)} - ${escapeXml(item.actions[0])}</text>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#f7f8fb"/>
  <rect x="44" y="44" width="1192" height="632" rx="12" fill="#ffffff" stroke="#d8dee8"/>
  <text x="72" y="104" font-size="38" font-family="Arial" font-weight="700" fill="#182230">Assistant Decision Handoff Guard</text>
  <text x="72" y="145" font-size="22" font-family="Arial" fill="#667085">Safe promotion checks for AI assistant outputs</text>
  ${cardSvg}
  <text x="72" y="486" font-size="27" font-family="Arial" font-weight="700" fill="#182230">Held or revision queue</text>
  ${queueRows}
  <text x="72" y="655" font-size="18" font-family="Arial" fill="#667085">Audit digest ${escapeXml(report.auditDigest.slice(0, 32))}</text>
</svg>`;
}

function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

module.exports = {
  GENERATED_AT,
  conflictSignals,
  daysOld,
  digest,
  evaluateHandoff,
  evaluateHandoffBatch,
  missingEvidence,
  needsHumanApproval,
  renderMarkdownReport,
  renderSvgReport,
  requiredEvidenceFor,
};
