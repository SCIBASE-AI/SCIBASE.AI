const crypto = require("node:crypto");

const BLOCKING_DIFFS = new Set([
  "primary-artifact-added-after-deadline",
  "checksum-drift",
  "metric-drift"
]);

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function byId(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function isPrimary(artifact) {
  return ["primary-model", "primary-result", "dataset", "analysis-notebook"].includes(artifact.type);
}

function addDiff(diffs, severity, code, artifactId, message, task, justification = "") {
  diffs.push({ severity, code, artifactId, message, task, justification });
}

function compareArtifact(frozen, current, challenge) {
  const diffs = [];
  if (frozen.checksum !== current.checksum) {
    addDiff(
      diffs,
      challenge.rules.blockChecksumDrift ? "blocker" : "high",
      "checksum-drift",
      current.id,
      `${current.id} checksum changed from ${frozen.checksum} to ${current.checksum}.`,
      "Freeze evaluation for this artifact and route to arbitration before scoring.",
      current.exceptionJustification || ""
    );
  }

  if (frozen.metric?.name === current.metric?.name && frozen.metric?.value !== current.metric?.value) {
    addDiff(
      diffs,
      challenge.rules.blockMetricDrift ? "blocker" : "high",
      "metric-drift",
      current.id,
      `${current.id} metric ${current.metric.name} changed from ${frozen.metric.value} to ${current.metric.value}.`,
      "Require reviewer-visible metric-change explanation and pre-deadline reproduction evidence.",
      current.exceptionJustification || ""
    );
  }

  if (frozen.bytes !== current.bytes && frozen.checksum === current.checksum) {
    addDiff(
      diffs,
      "medium",
      "metadata-size-drift",
      current.id,
      `${current.id} size changed while checksum stayed fixed.`,
      "Verify packaging metadata and storage manifest generation.",
      current.exceptionJustification || ""
    );
  }

  if (JSON.stringify(frozen.metadata) !== JSON.stringify(current.metadata)) {
    addDiff(
      diffs,
      "medium",
      "metadata-drift",
      current.id,
      `${current.id} metadata changed after freeze.`,
      "Record a reviewer-visible metadata exception before releasing the packet.",
      current.exceptionJustification || ""
    );
  }

  if (diffs.length && challenge.rules.requireReviewerVisibleJustification && !current.exceptionJustification) {
    addDiff(
      diffs,
      "high",
      "exception-justification-missing",
      current.id,
      `${current.id} changed after freeze without a reviewer-visible justification.`,
      "Block sponsor preview until the solver provides an exception justification."
    );
  }

  return diffs;
}

function compareSubmissions(challenge, frozenSubmission, currentSubmission) {
  const frozenMap = byId(frozenSubmission.artifacts);
  const currentMap = byId(currentSubmission.artifacts);
  const diffs = [];

  for (const current of currentSubmission.artifacts) {
    const frozen = frozenMap.get(current.id);
    if (!frozen) {
      const primary = isPrimary(current);
      addDiff(
        diffs,
        primary && challenge.rules.blockLatePrimaryArtifacts ? "blocker" : "high",
        primary ? "primary-artifact-added-after-deadline" : "artifact-added-after-deadline",
        current.id,
        `${current.id} was added after the frozen deadline manifest.`,
        primary ? "Exclude this artifact from scoring and hold payout/arbitration until reviewed." : "Route late artifact to reviewer exception queue.",
        current.exceptionJustification || ""
      );
      if (challenge.rules.requireReviewerVisibleJustification && !current.exceptionJustification) {
        addDiff(
          diffs,
          "high",
          "exception-justification-missing",
          current.id,
          `${current.id} has no reviewer-visible late-addition justification.`,
          "Require a public exception note before sponsor review."
        );
      }
      continue;
    }
    diffs.push(...compareArtifact(frozen, current, challenge));
  }

  for (const frozen of frozenSubmission.artifacts) {
    if (!currentMap.has(frozen.id)) {
      addDiff(
        diffs,
        "blocker",
        "artifact-removed-after-deadline",
        frozen.id,
        `${frozen.id} was present in the frozen manifest but is absent from the current packet.`,
        "Restore the frozen artifact or mark the submission incomplete before evaluation."
      );
    }
  }

  return diffs;
}

function summarizeDiffs(diffs) {
  const countsBySeverity = diffs.reduce((counts, diff) => {
    counts[diff.severity] = (counts[diff.severity] || 0) + 1;
    return counts;
  }, {});
  const countsByCode = diffs.reduce((counts, diff) => {
    counts[diff.code] = (counts[diff.code] || 0) + 1;
    return counts;
  }, {});
  const blockerCount = diffs.filter((diff) => diff.severity === "blocker").length;
  const releaseDecision = blockerCount
    ? "hold-evaluation-and-payout"
    : diffs.length
      ? "review-exceptions-before-scoring"
      : "frozen-packet-clean";
  return {
    releaseDecision,
    blockerCount,
    totalDiffs: diffs.length,
    countsBySeverity,
    countsByCode
  };
}

function buildArbitrationPacket(challenge, frozenSubmission, currentSubmission, diffs) {
  return {
    challengeId: challenge.id,
    submissionId: frozenSubmission.submissionId,
    frozenAt: frozenSubmission.frozenAt,
    observedAt: currentSubmission.observedAt,
    frozenManifestHash: frozenSubmission.manifestHash,
    currentManifestHash: currentSubmission.manifestHash,
    excludedFromScoring: diffs
      .filter((diff) => diff.severity === "blocker" || BLOCKING_DIFFS.has(diff.code))
      .map((diff) => diff.artifactId),
    reviewerTasks: diffs.map((diff) => diff.task),
    publicExceptionNotes: diffs
      .filter((diff) => diff.justification)
      .map((diff) => ({ artifactId: diff.artifactId, justification: diff.justification }))
  };
}

function runFreezeGate(data) {
  const diffs = compareSubmissions(data.challenge, data.frozenSubmission, data.currentSubmission);
  const summary = summarizeDiffs(diffs);
  const arbitrationPacket = buildArbitrationPacket(data.challenge, data.frozenSubmission, data.currentSubmission, diffs);
  const packet = {
    module: "challenge-evidence-freeze-gate",
    challenge: {
      id: data.challenge.id,
      title: data.challenge.title,
      deadline: data.challenge.deadline,
      reviewOpenedAt: data.challenge.reviewOpenedAt
    },
    submission: {
      id: data.frozenSubmission.submissionId,
      teamId: data.frozenSubmission.teamId
    },
    summary,
    diffs,
    arbitrationPacket
  };
  return {
    ...packet,
    auditDigest: digest(packet)
  };
}

function renderMarkdown(report) {
  const lines = [
    `# Challenge Evidence Freeze Review: ${report.challenge.title}`,
    "",
    `Decision: **${report.summary.releaseDecision}**`,
    `Blockers: **${report.summary.blockerCount}**`,
    `Total diffs: **${report.summary.totalDiffs}**`,
    "",
    "## Tamper Diff Queue"
  ];
  for (const diff of report.diffs) {
    lines.push(`- [${diff.severity}] ${diff.artifactId}: ${diff.message}`);
    lines.push(`  Task: ${diff.task}`);
    if (diff.justification) lines.push(`  Justification: ${diff.justification}`);
  }
  lines.push("", "## Arbitration Packet");
  lines.push(`- Frozen manifest: ${report.arbitrationPacket.frozenManifestHash}`);
  lines.push(`- Current manifest: ${report.arbitrationPacket.currentManifestHash}`);
  lines.push(`- Excluded from scoring: ${[...new Set(report.arbitrationPacket.excludedFromScoring)].join(", ") || "none"}`);
  lines.push("", `Audit digest: \`${report.auditDigest}\``);
  return `${lines.join("\n")}\n`;
}

function renderSvg(report) {
  const width = 980;
  const height = 500;
  const blocker = report.summary.blockerCount;
  const high = report.summary.countsBySeverity.high || 0;
  const medium = report.summary.countsBySeverity.medium || 0;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="#f7fafc"/>`,
    `<rect x="24" y="24" width="${width - 48}" height="${height - 48}" rx="8" fill="#ffffff" stroke="#cbd5e0"/>`,
    `<text x="48" y="74" fill="#102033" font-size="30" font-weight="700" font-family="Arial">Challenge Evidence Freeze Gate</text>`,
    `<text x="48" y="108" fill="#4a5568" font-size="18" font-family="Arial">${report.summary.releaseDecision} | Audit ${report.auditDigest.slice(0, 12)}</text>`,
    `<rect x="60" y="154" width="${Math.max(8, blocker * 120)}" height="52" rx="4" fill="#c53030"/>`,
    `<text x="60" y="242" fill="#102033" font-size="22" font-family="Arial">Blockers: ${blocker}</text>`,
    `<rect x="60" y="282" width="${Math.max(8, high * 90)}" height="52" rx="4" fill="#b7791f"/>`,
    `<text x="60" y="370" fill="#102033" font-size="22" font-family="Arial">High: ${high}</text>`,
    `<rect x="520" y="154" width="${Math.max(8, medium * 90)}" height="52" rx="4" fill="#2b6cb0"/>`,
    `<text x="520" y="242" fill="#102033" font-size="22" font-family="Arial">Medium: ${medium}</text>`,
    `<text x="520" y="312" fill="#4a5568" font-size="17" font-family="Arial">Excluded: ${[...new Set(report.arbitrationPacket.excludedFromScoring)].join(", ")}</text>`,
    `<text x="520" y="350" fill="#4a5568" font-size="17" font-family="Arial">Frozen ${report.arbitrationPacket.frozenManifestHash}</text>`,
    `<text x="520" y="382" fill="#4a5568" font-size="17" font-family="Arial">Current ${report.arbitrationPacket.currentManifestHash}</text>`,
    `</svg>`
  ].join("");
}

module.exports = {
  runFreezeGate,
  compareSubmissions,
  renderMarkdown,
  renderSvg,
  digest
};
