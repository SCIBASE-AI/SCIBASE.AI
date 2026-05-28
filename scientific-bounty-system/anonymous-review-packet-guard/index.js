const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const RULES = {
  COMMIT_AUTHOR_LEAK: {
    severity: "high",
    penalty: 18,
    recommendation: "Rewrite or mask commit author metadata before the sponsor review packet is released.",
  },
  FILE_PATH_IDENTITY_LEAK: {
    severity: "high",
    penalty: 16,
    recommendation: "Replace local usernames, lab folders, and institution paths with neutral artifact paths.",
  },
  NOTEBOOK_OUTPUT_IDENTITY_LEAK: {
    severity: "high",
    penalty: 15,
    recommendation: "Clear notebook outputs or redact user, host, and local path fragments before reviewer access.",
  },
  DOCUMENT_METADATA_LEAK: {
    severity: "high",
    penalty: 15,
    recommendation: "Strip document author, company, editor, and template metadata from review exports.",
  },
  EXIF_GPS_OR_DEVICE_LEAK: {
    severity: "medium",
    penalty: 10,
    recommendation: "Remove EXIF GPS, serial, device owner, and capture metadata from figures and media.",
  },
  ACKNOWLEDGEMENT_IDENTITY_LEAK: {
    severity: "medium",
    penalty: 9,
    recommendation: "Move acknowledgements and institution references to the post-award disclosure packet.",
  },
  UNBLINDED_REVIEWER_ROLE: {
    severity: "high",
    penalty: 17,
    recommendation: "Remove sponsor/reviewer access until all anonymous review roles use the redacted packet.",
  },
  REDACTION_EVIDENCE_MISSING: {
    severity: "medium",
    penalty: 8,
    recommendation: "Attach redaction receipts for every transformed artifact before review release.",
  },
  ANONYMITY_MODE_MISMATCH: {
    severity: "high",
    penalty: 18,
    recommendation: "Hold the submission until the challenge anonymity setting matches the generated packet.",
  },
  AUDIT_LOG_UNPROTECTED: {
    severity: "medium",
    penalty: 7,
    recommendation: "Keep full identity audit logs restricted to arbitrators until award or dispute resolution.",
  },
};

const IDENTITY_PATTERNS = [
  { id: "email", pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
  { id: "home-directory", pattern: /\/Users\/[A-Za-z0-9._-]+|\/home\/[A-Za-z0-9._-]+/i },
  { id: "windows-profile", pattern: /C:\\Users\\[A-Za-z0-9._-]+/i },
  { id: "institution", pattern: /\b(Stanford|MIT|Harvard|Oxford|Cambridge|Berkeley|Caltech|UCLA|University|Institute)\b/i },
  { id: "orcid", pattern: /\b\d{4}-\d{4}-\d{4}-\d{3}[\dX]\b/i },
  { id: "github-handle", pattern: /@[A-Za-z0-9-]{3,39}\b/ },
];

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value, length = 16) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, length);
}

function addFinding(findings, code, message, evidence) {
  const rule = RULES[code];
  findings.push({
    code,
    severity: rule.severity,
    penalty: rule.penalty,
    message,
    evidence,
    recommendation: rule.recommendation,
  });
}

function detectIdentity(text) {
  const value = String(text || "");
  return IDENTITY_PATTERNS.filter((entry) => entry.pattern.test(value)).map((entry) => entry.id);
}

function auditChallengeMode(packet, findings) {
  if (packet.challenge.anonymityMode !== packet.reviewPacket.anonymityMode) {
    addFinding(
      findings,
      "ANONYMITY_MODE_MISMATCH",
      "Challenge anonymity mode does not match the generated review packet.",
      {
        challengeMode: packet.challenge.anonymityMode,
        reviewPacketMode: packet.reviewPacket.anonymityMode,
      },
    );
  }
}

function auditArtifacts(packet, findings) {
  for (const artifact of packet.artifacts || []) {
    const pathHits = detectIdentity(artifact.path);
    if (pathHits.length > 0) {
      addFinding(findings, "FILE_PATH_IDENTITY_LEAK", `Artifact ${artifact.id} path contains identity-bearing text.`, {
        artifactId: artifact.id,
        path: artifact.path,
        detectedSignals: pathHits,
      });
    }

    const metadataText = JSON.stringify(artifact.metadata || {});
    const metadataHits = detectIdentity(metadataText);
    if (metadataHits.length > 0 || artifact.metadata.author || artifact.metadata.company || artifact.metadata.lastModifiedBy) {
      addFinding(findings, "DOCUMENT_METADATA_LEAK", `Artifact ${artifact.id} metadata can identify the solver team.`, {
        artifactId: artifact.id,
        metadata: artifact.metadata,
        detectedSignals: metadataHits,
      });
    }

    if (artifact.type === "notebook") {
      const outputHits = (artifact.outputs || [])
        .map((output, index) => ({ index, signals: detectIdentity(output), value: output }))
        .filter((entry) => entry.signals.length > 0);
      if (outputHits.length > 0) {
        addFinding(findings, "NOTEBOOK_OUTPUT_IDENTITY_LEAK", `Notebook ${artifact.id} output contains solver identity signals.`, {
          artifactId: artifact.id,
          outputHits,
        });
      }
    }

    if (artifact.type === "image" || artifact.type === "media") {
      const exif = artifact.metadata.exif || {};
      if (exif.gps || exif.deviceOwner || exif.serialNumber) {
        addFinding(findings, "EXIF_GPS_OR_DEVICE_LEAK", `Media artifact ${artifact.id} contains identifying EXIF metadata.`, {
          artifactId: artifact.id,
          exif,
        });
      }
    }
  }
}

function auditCommits(packet, findings) {
  for (const commit of packet.commitHistory || []) {
    const signals = [
      ...detectIdentity(commit.authorName),
      ...detectIdentity(commit.authorEmail),
      ...detectIdentity(commit.message),
    ];
    const redactedAuthor = /^(anon|anonymous|redacted)([-_\s]solver)?$/i.test(String(commit.authorName || ""));
    const hasUnredactedAuthorName = Boolean(commit.authorName) && !redactedAuthor;
    if (signals.length > 0 || commit.authorEmail || hasUnredactedAuthorName) {
      addFinding(findings, "COMMIT_AUTHOR_LEAK", `Commit ${commit.sha} exposes solver identity metadata.`, {
        sha: commit.sha,
        authorName: commit.authorName,
        authorEmail: commit.authorEmail,
        detectedSignals: Array.from(new Set(signals)),
      });
    }
  }
}

function auditNarrative(packet, findings) {
  for (const section of packet.reviewPacket.sections || []) {
    if (!["acknowledgements", "conflicts", "team-bio"].includes(section.kind)) continue;
    const signals = detectIdentity(section.text);
    if (signals.length > 0 || !section.redacted) {
      addFinding(findings, "ACKNOWLEDGEMENT_IDENTITY_LEAK", `Review packet section ${section.id} can identify the solver team.`, {
        sectionId: section.id,
        kind: section.kind,
        redacted: Boolean(section.redacted),
        detectedSignals: signals,
      });
    }
  }
}

function auditAccess(packet, findings) {
  for (const grant of packet.accessGrants || []) {
    if (grant.role === "sponsor" || grant.role === "reviewer") {
      if (packet.challenge.anonymityMode === "anonymous" && grant.packetVariant !== "redacted") {
        addFinding(findings, "UNBLINDED_REVIEWER_ROLE", `Access grant ${grant.id} exposes an unredacted packet to ${grant.role}.`, {
          grantId: grant.id,
          role: grant.role,
          principal: grant.principal,
          packetVariant: grant.packetVariant,
        });
      }
    }
  }
}

function auditRedactionEvidence(packet, findings) {
  const redactionReceipts = new Set((packet.redactionReceipts || []).map((receipt) => receipt.artifactId));
  for (const artifact of packet.artifacts || []) {
    if (artifact.requiresRedaction && !redactionReceipts.has(artifact.id)) {
      addFinding(findings, "REDACTION_EVIDENCE_MISSING", `Artifact ${artifact.id} requires redaction but has no receipt.`, {
        artifactId: artifact.id,
        requiredReason: artifact.redactionReason || "identity-bearing metadata",
      });
    }
  }
}

function auditAuditLogs(packet, findings) {
  for (const log of packet.auditLogs || []) {
    if (log.containsIdentity && log.visibility !== "arbitrator-only") {
      addFinding(findings, "AUDIT_LOG_UNPROTECTED", `Audit log ${log.id} contains identity data outside arbitrator-only visibility.`, {
        logId: log.id,
        visibility: log.visibility,
        containsIdentity: log.containsIdentity,
      });
    }
  }
}

function summarize(findings) {
  const severityCounts = { high: 0, medium: 0, low: 0 };
  for (const finding of findings) severityCounts[finding.severity] += 1;
  const riskScore = Math.min(100, findings.reduce((sum, finding) => sum + finding.penalty, 0));
  let decision = "release-redacted-packet";
  if (severityCounts.high > 0 || riskScore >= 50) decision = "hold-review-packet";
  else if (severityCounts.medium > 0) decision = "needs-redaction-review";
  return { severityCounts, riskScore, decision };
}

function auditAnonymousReviewPacket(packet, options = {}) {
  if (!packet || typeof packet !== "object") throw new TypeError("packet must be an object");
  const normalized = {
    challenge: {},
    reviewPacket: { sections: [] },
    artifacts: [],
    commitHistory: [],
    accessGrants: [],
    redactionReceipts: [],
    auditLogs: [],
    ...packet,
  };
  const findings = [];

  auditChallengeMode(normalized, findings);
  auditArtifacts(normalized, findings);
  auditCommits(normalized, findings);
  auditNarrative(normalized, findings);
  auditAccess(normalized, findings);
  auditRedactionEvidence(normalized, findings);
  auditAuditLogs(normalized, findings);

  const summary = summarize(findings);
  const evidenceDigest = digest({
    challengeId: normalized.challenge.id,
    submissionId: normalized.submissionId,
    reviewPacket: normalized.reviewPacket,
    findings,
  });

  return {
    submissionId: normalized.submissionId,
    challengeId: normalized.challenge.id,
    title: normalized.challenge.title,
    generatedAt: options.now || "2026-05-28T21:10:00.000Z",
    decision: summary.decision,
    riskScore: summary.riskScore,
    severityCounts: summary.severityCounts,
    findingCount: findings.length,
    evidenceDigest,
    summary: {
      artifacts: normalized.artifacts.length,
      commits: normalized.commitHistory.length,
      accessGrants: normalized.accessGrants.length,
      redactionReceipts: normalized.redactionReceipts.length,
      auditLogs: normalized.auditLogs.length,
    },
    findings,
  };
}

function createMarkdownReport(report) {
  const findings = report.findings.length
    ? report.findings
        .map(
          (finding, index) => [
            `### ${index + 1}. ${finding.code} (${finding.severity})`,
            finding.message,
            "",
            `Recommendation: ${finding.recommendation}`,
            "",
            "Evidence:",
            "```json",
            JSON.stringify(finding.evidence, null, 2),
            "```",
          ].join("\n"),
        )
        .join("\n\n")
    : "No blocking findings.";

  return [
    "# Anonymous Review Packet Guard",
    "",
    `Challenge: ${report.title || report.challengeId}`,
    `Submission: ${report.submissionId}`,
    `Decision: ${report.decision}`,
    `Risk score: ${report.riskScore}/100`,
    `Evidence digest: ${report.evidenceDigest}`,
    "",
    "## Scope",
    "",
    `Artifacts: ${report.summary.artifacts}`,
    `Commits: ${report.summary.commits}`,
    `Access grants: ${report.summary.accessGrants}`,
    `Redaction receipts: ${report.summary.redactionReceipts}`,
    `Audit logs: ${report.summary.auditLogs}`,
    "",
    "## Findings",
    "",
    findings,
    "",
  ].join("\n");
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createSummarySvg(report) {
  const riskWidth = Math.max(0, Math.min(1, report.riskScore / 100)) * 560;
  const color = report.decision === "release-redacted-packet" ? "#168a4a" : report.decision === "needs-redaction-review" ? "#b7791f" : "#b91c1c";
  const rows = report.findings
    .slice(0, 5)
    .map(
      (finding, index) =>
        `<text x="72" y="${342 + index * 36}" fill="#334155" font-family="Arial, sans-serif" font-size="20">${escapeXml(
          finding.code,
        )}: ${escapeXml(finding.message).slice(0, 92)}</text>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#f8fafc"/>
  <rect x="48" y="44" width="1184" height="632" rx="18" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="72" y="98" fill="#0f172a" font-family="Arial, sans-serif" font-size="34" font-weight="700">Anonymous Review Packet Guard</text>
  <text x="72" y="140" fill="#475569" font-family="Arial, sans-serif" font-size="22">${escapeXml(report.title || report.challengeId)}</text>
  <text x="72" y="198" fill="${color}" font-family="Arial, sans-serif" font-size="32" font-weight="700">${escapeXml(report.decision)}</text>
  <text x="72" y="242" fill="#334155" font-family="Arial, sans-serif" font-size="22">Risk ${report.riskScore}/100 · findings ${
    report.findingCount
  } · digest ${escapeXml(report.evidenceDigest)}</text>
  <rect x="72" y="270" width="560" height="24" rx="12" fill="#e2e8f0"/>
  <rect x="72" y="270" width="${riskWidth}" height="24" rx="12" fill="${color}"/>
  <text x="72" y="324" fill="#0f172a" font-family="Arial, sans-serif" font-size="24" font-weight="700">Top findings</text>
  ${rows}
  <text x="72" y="642" fill="#64748b" font-family="Arial, sans-serif" font-size="18">Synthetic challenge packet only. No private submissions, credentials, or external services.</text>
</svg>
`;
}

function writeAuditReports(report, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, "anonymous-review-packet-audit.json");
  const markdownPath = path.join(outputDir, "anonymous-review-packet-audit.md");
  const svgPath = path.join(outputDir, "anonymous-review-packet-summary.svg");
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, createMarkdownReport(report));
  fs.writeFileSync(svgPath, createSummarySvg(report));
  return { jsonPath, markdownPath, svgPath };
}

module.exports = {
  RULES,
  auditAnonymousReviewPacket,
  createMarkdownReport,
  createSummarySvg,
  detectIdentity,
  digest,
  stableStringify,
  writeAuditReports,
};
