const crypto = require("crypto");

const SEVERITY_RANK = {
  info: 0,
  warning: 1,
  major: 2,
  critical: 3
};

function yearsBetween(olderDate, newerDate) {
  const older = new Date(`${olderDate}T00:00:00Z`);
  const newer = new Date(`${newerDate}T00:00:00Z`);
  return (newer.getTime() - older.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
}

function latestDate(dates) {
  const validDates = dates.filter(Boolean).sort();
  return validDates[validDates.length - 1] || null;
}

function evidenceForTopic(ledger, topic) {
  return ledger.signals.filter((signal) => signal.topic === topic);
}

function addFinding(findings, finding) {
  findings.push({
    severity: finding.severity,
    code: finding.code,
    claimId: finding.claimId,
    topic: finding.topic,
    detail: finding.detail,
    requiredAction: finding.requiredAction,
    evidenceSignalId: finding.evidenceSignalId || null
  });
}

function evaluateClaimFreshness(claim, ledger, policy) {
  const findings = [];
  const signals = evidenceForTopic(ledger, claim.topic);
  const latestCitation = latestDate(claim.citationDates || []);
  const reviewDate = policy.reviewDate;

  if (!latestCitation) {
    addFinding(findings, {
      severity: "critical",
      code: "NO_SUPPORT_DATES",
      claimId: claim.id,
      topic: claim.topic,
      detail: "Claim has no dated supporting citations for freshness review.",
      requiredAction: "Attach dated evidence before the assistant marks this claim reviewer-ready."
    });
  } else if (yearsBetween(latestCitation, reviewDate) > policy.staleAfterYears) {
    addFinding(findings, {
      severity: "major",
      code: "STALE_SUPPORT_WINDOW",
      claimId: claim.id,
      topic: claim.topic,
      detail: `Latest support is ${latestCitation}, older than the ${policy.staleAfterYears}-year freshness window.`,
      requiredAction: "Add recent evidence or downgrade the claim wording."
    });
  }

  for (const signal of signals) {
    const cited = (claim.citedCurrentSignalIds || []).includes(signal.id);
    const signalIsNewer = !latestCitation || signal.published > latestCitation;

    if (!cited && signalIsNewer) {
      const severity = signal.relation === "contradicts" ? policy.contradictionSeverity : "major";
      addFinding(findings, {
        severity,
        code: signal.relation === "contradicts" ? "NEWER_CONTRADICTORY_EVIDENCE" : "MISSING_NEWER_EVIDENCE",
        claimId: claim.id,
        topic: claim.topic,
        detail: `${signal.title} (${signal.published}) ${signal.relation} older support but is not cited.`,
        requiredAction: signal.requirement,
        evidenceSignalId: signal.id
      });
    }

    if (signal.currentVersion && claim.datasetVersion && claim.datasetVersion !== signal.currentVersion) {
      addFinding(findings, {
        severity: "major",
        code: "DATASET_VERSION_DRIFT",
        claimId: claim.id,
        topic: claim.topic,
        detail: `Claim uses dataset ${claim.datasetVersion}; current ledger version is ${signal.currentVersion}.`,
        requiredAction: signal.requirement,
        evidenceSignalId: signal.id
      });
    }

    if (signal.currentVersion && claim.benchmarkVersion && claim.benchmarkVersion !== signal.currentVersion) {
      addFinding(findings, {
        severity: "major",
        code: "BENCHMARK_VERSION_DRIFT",
        claimId: claim.id,
        topic: claim.topic,
        detail: `Claim uses benchmark ${claim.benchmarkVersion}; current ledger version is ${signal.currentVersion}.`,
        requiredAction: signal.requirement,
        evidenceSignalId: signal.id
      });
    }
  }

  if (findings.length === 0) {
    addFinding(findings, {
      severity: "info",
      code: "FRESHNESS_READY",
      claimId: claim.id,
      topic: claim.topic,
      detail: "Claim cites the current evidence signal for its topic.",
      requiredAction: "No freshness hold required."
    });
  }

  return findings;
}

function summarizeFindings(findings, policy) {
  const actionable = findings.filter((finding) => finding.severity !== "info");
  const critical = findings.filter((finding) => finding.severity === "critical");
  const major = findings.filter((finding) => finding.severity === "major");
  const warnings = findings.filter((finding) => finding.severity === "warning");
  const maxSeverity = findings.reduce((max, finding) => {
    return SEVERITY_RANK[finding.severity] > SEVERITY_RANK[max] ? finding.severity : max;
  }, "info");
  const status = SEVERITY_RANK[maxSeverity] >= SEVERITY_RANK[policy.holdSeverityCutoff]
    ? "hold_freshness_review"
    : actionable.length > 0
      ? "revise_freshness_context"
      : "ready_for_review";

  return {
    status,
    totalFindings: findings.length,
    actionableFindings: actionable.length,
    criticalFindings: critical.length,
    majorFindings: major.length,
    warningFindings: warnings.length,
    readyFindings: findings.length - actionable.length
  };
}

function buildReviewerActions(findings) {
  return findings
    .filter((finding) => finding.severity !== "info")
    .map((finding) => ({
      claimId: finding.claimId,
      severity: finding.severity,
      action: finding.requiredAction,
      reason: finding.detail
    }));
}

function buildResearchGapPrompts(findings) {
  const topics = new Map();
  for (const finding of findings) {
    if (finding.severity === "info") {
      continue;
    }
    if (!topics.has(finding.topic)) {
      topics.set(
        finding.topic,
        `Freshness gap: update the evidence base for ${finding.topic} before treating the claim as current.`
      );
    }
  }
  return [...topics.values()];
}

function stableDigest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function evaluateManuscript(packet, ledger, policy) {
  const findings = packet.claims.flatMap((claim) => evaluateClaimFreshness(claim, ledger, policy));
  const summary = summarizeFindings(findings, policy);
  const reviewerActions = buildReviewerActions(findings);
  const researchGapPrompts = buildResearchGapPrompts(findings);
  const result = {
    packetId: packet.id,
    title: packet.title,
    domain: packet.domain,
    reviewDate: policy.reviewDate,
    summary,
    findings,
    reviewerActions,
    researchGapPrompts
  };
  return {
    ...result,
    auditDigest: stableDigest(result)
  };
}

function evaluateFreshnessReview(packets, ledger, policy) {
  const manuscripts = packets.map((packet) => evaluateManuscript(packet, ledger, policy));
  const aggregate = {
    reviewedManuscripts: manuscripts.length,
    heldManuscripts: manuscripts.filter((entry) => entry.summary.status === "hold_freshness_review").length,
    revisionManuscripts: manuscripts.filter((entry) => entry.summary.status === "revise_freshness_context").length,
    readyManuscripts: manuscripts.filter((entry) => entry.summary.status === "ready_for_review").length,
    criticalFindings: manuscripts.reduce((sum, entry) => sum + entry.summary.criticalFindings, 0),
    majorFindings: manuscripts.reduce((sum, entry) => sum + entry.summary.majorFindings, 0),
    actionableFindings: manuscripts.reduce((sum, entry) => sum + entry.summary.actionableFindings, 0)
  };
  const result = {
    assistant: "literature-freshness-review-assistant",
    policy,
    aggregate,
    manuscripts
  };
  return {
    ...result,
    auditDigest: stableDigest(result)
  };
}

function renderMarkdown(report) {
  const lines = [
    "# Literature Freshness Review Assistant",
    "",
    `Review date: ${report.policy.reviewDate}`,
    `Overall digest: ${report.auditDigest}`,
    "",
    "## Aggregate",
    "",
    `- Reviewed manuscripts: ${report.aggregate.reviewedManuscripts}`,
    `- Held manuscripts: ${report.aggregate.heldManuscripts}`,
    `- Revision manuscripts: ${report.aggregate.revisionManuscripts}`,
    `- Ready manuscripts: ${report.aggregate.readyManuscripts}`,
    `- Critical findings: ${report.aggregate.criticalFindings}`,
    `- Major findings: ${report.aggregate.majorFindings}`,
    `- Actionable findings: ${report.aggregate.actionableFindings}`,
    ""
  ];

  for (const manuscript of report.manuscripts) {
    lines.push(`## ${manuscript.title}`);
    lines.push("");
    lines.push(`Status: ${manuscript.summary.status}`);
    lines.push(`Digest: ${manuscript.auditDigest}`);
    lines.push("");
    lines.push("| Severity | Code | Claim | Detail | Required action |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const finding of manuscript.findings) {
      lines.push(
        `| ${finding.severity} | ${finding.code} | ${finding.claimId} | ${finding.detail} | ${finding.requiredAction} |`
      );
    }
    lines.push("");
    if (manuscript.researchGapPrompts.length > 0) {
      lines.push("Research gap prompts:");
      for (const prompt of manuscript.researchGapPrompts) {
        lines.push(`- ${prompt}`);
      }
      lines.push("");
    }
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderSvg(report) {
  const held = report.aggregate.heldManuscripts;
  const ready = report.aggregate.readyManuscripts;
  const critical = report.aggregate.criticalFindings;
  const major = report.aggregate.majorFindings;
  const bars = [
    { label: "Held", value: held, color: "#b91c1c" },
    { label: "Ready", value: ready, color: "#047857" },
    { label: "Critical", value: critical, color: "#dc2626" },
    { label: "Major", value: major, color: "#d97706" }
  ];
  const maxValue = Math.max(1, ...bars.map((bar) => bar.value));
  const rows = bars.map((bar, index) => {
    const y = 170 + index * 70;
    const width = Math.round((bar.value / maxValue) * 560);
    return `  <text x="72" y="${y + 24}" class="label">${escapeXml(bar.label)}</text>
      <rect x="190" y="${y}" width="560" height="34" rx="6" fill="#e5e7eb"/>
      <rect x="190" y="${y}" width="${width}" height="34" rx="6" fill="${bar.color}"/>
      <text x="770" y="${y + 24}" class="value">${bar.value}</text>`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="560" viewBox="0 0 960 560" role="img" aria-labelledby="title desc">
  <title id="title">Literature freshness review assistant summary</title>
  <desc id="desc">Summary of held manuscripts, ready manuscripts, and freshness findings.</desc>
  <style>
    .bg { fill: #f8fafc; }
    .panel { fill: #ffffff; stroke: #cbd5e1; stroke-width: 1.5; }
    .title { font: 700 34px Arial, sans-serif; fill: #0f172a; }
    .subtitle { font: 400 18px Arial, sans-serif; fill: #475569; }
    .label { font: 700 20px Arial, sans-serif; fill: #0f172a; }
    .value { font: 700 22px Arial, sans-serif; fill: #0f172a; }
    .digest { font: 400 14px Arial, sans-serif; fill: #475569; }
  </style>
  <rect class="bg" width="960" height="560"/>
  <rect class="panel" x="40" y="40" width="880" height="480" rx="8"/>
  <text x="72" y="98" class="title">Literature freshness review assistant</text>
  <text x="72" y="132" class="subtitle">Stale citations, missing newer evidence, and temporal drift before AI review release</text>
${rows}
  <text x="72" y="500" class="digest">Audit digest: ${escapeXml(report.auditDigest.slice(0, 24))}</text>
</svg>
`;
}

module.exports = {
  evaluateClaimFreshness,
  evaluateManuscript,
  evaluateFreshnessReview,
  renderMarkdown,
  renderSvg,
  stableDigest
};
