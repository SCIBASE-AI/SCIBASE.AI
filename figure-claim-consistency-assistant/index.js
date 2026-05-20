const crypto = require("node:crypto");

const SEVERITY_WEIGHT = {
  blocker: 34,
  high: 22,
  medium: 12,
  low: 5
};

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function toIdMap(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function artifactTypes(artifacts) {
  return new Set(artifacts.filter((artifact) => artifact.public).map((artifact) => artifact.type));
}

function matchesDirection(expected, observed, threshold, reportedEffect) {
  if (expected === observed) return true;
  if (expected === "stable") return Math.abs(reportedEffect) <= threshold && Math.abs(reportedEffect - observedEffectValue(observed)) <= threshold;
  if (expected === "below-threshold") return observed === "below-threshold";
  if (expected === "at-least") return observed === "at-least";
  return false;
}

function observedEffectValue(direction) {
  if (direction === "increase" || direction === "at-least") return 1;
  if (direction === "decrease" || direction === "above-threshold") return -1;
  return 0;
}

function effectWithinTolerance(claim, observedEffect) {
  if (claim.expectedDirection === "below-threshold") return observedEffect <= claim.reportedEffect;
  if (claim.expectedDirection === "at-least") return observedEffect >= claim.reportedEffect;
  const tolerance = Math.max(0.03, Math.abs(claim.reportedEffect) * 0.12);
  return Math.abs(claim.reportedEffect - observedEffect) <= tolerance;
}

function addIssue(issues, severity, code, message, task) {
  issues.push({ severity, code, message, task });
}

function evaluateFigure(claim, figure, publicArtifactTypes) {
  const issues = [];
  if (!figure) {
    addIssue(
      issues,
      "blocker",
      "missing-figure",
      `Claim ${claim.id} cites a figure that is not present in the packet.`,
      "Attach the referenced figure or remove the unsupported claim before submission."
    );
    return issues;
  }

  if (figure.metric !== claim.metric) {
    addIssue(
      issues,
      "high",
      "figure-metric-mismatch",
      `${figure.id} tracks ${figure.metric}, but claim ${claim.id} expects ${claim.metric}.`,
      "Route the claim to the correct figure or regenerate the figure from the matching endpoint."
    );
  }

  if (figure.axis?.yUnit !== claim.expectedUnit) {
    addIssue(
      issues,
      "high",
      "axis-unit-mismatch",
      `${figure.id} uses ${figure.axis?.yUnit || "unknown units"} while claim ${claim.id} reports ${claim.expectedUnit}.`,
      "Normalize units in the caption, manuscript claim, and source table."
    );
  }

  for (const panel of figure.panels || []) {
    if (!matchesDirection(claim.expectedDirection, panel.direction, 0.02, claim.reportedEffect)) {
      addIssue(
        issues,
        "high",
        "effect-direction-mismatch",
        `${figure.id}${panel.id} shows ${panel.direction}, but claim ${claim.id} says ${claim.expectedDirection}.`,
        "Revise the claim language or regenerate the panel from the intended analysis."
      );
    }

    if (!effectWithinTolerance(claim, panel.effect)) {
      addIssue(
        issues,
        "medium",
        "effect-size-drift",
        `${figure.id}${panel.id} effect ${panel.effect} does not match reported claim effect ${claim.reportedEffect}.`,
        "Update the manuscript effect size or regenerate the plotted estimate."
      );
    }

    if (Math.abs((panel.sampleSize || 0) - claim.reportedSampleSize) > 2) {
      addIssue(
        issues,
        "medium",
        "sample-size-drift",
        `${figure.id}${panel.id} uses n=${panel.sampleSize}; claim ${claim.id} reports n=${claim.reportedSampleSize}.`,
        "Add a sample-size reconciliation note and align the figure/table/manuscript counts."
      );
    }

    if (panel.caveat && !claim.caveats.includes(panel.caveat)) {
      addIssue(
        issues,
        "medium",
        "caption-caveat-missing-from-claim",
        `${figure.id}${panel.id} caveat "${panel.caveat}" is absent from claim ${claim.id}.`,
        "Carry the figure caveat into the manuscript claim or downgrade the conclusion."
      );
    }

    if (panel.colorEncodingSafe === false) {
      addIssue(
        issues,
        "low",
        "visual-accessibility-risk",
        `${figure.id}${panel.id} uses an unsafe color encoding for review.`,
        "Switch to a redundant encoding or color-safe palette before submission."
      );
    }

    if (panel.sourceDataId && !publicArtifactTypes.has("source-data")) {
      addIssue(
        issues,
        "high",
        "source-data-not-public",
        `${figure.id}${panel.id} references source data that is not public.`,
        "Publish the source-data artifact or mark the claim as internally unverified."
      );
    }

    if (!panel.analysisNotebookId && claim.requiredArtifacts.includes("analysis-notebook")) {
      addIssue(
        issues,
        "high",
        "missing-analysis-notebook",
        `${figure.id}${panel.id} has no linked analysis notebook.`,
        "Attach the notebook that produces this figure and rerun the assistant."
      );
    }
  }

  return issues;
}

function evaluateTable(claim, table) {
  const issues = [];
  if (!table) {
    addIssue(
      issues,
      "high",
      "missing-table",
      `Claim ${claim.id} cites a table that is not present in the packet.`,
      "Attach the referenced table or remove the table citation."
    );
    return issues;
  }

  const rows = (table.rows || []).filter((row) => row.claimId === claim.id || row.metric === claim.metric);
  if (rows.length === 0) {
    addIssue(
      issues,
      "high",
      "table-row-missing",
      `${table.id} has no row supporting claim ${claim.id}.`,
      "Add a claim-linked table row with metric, unit, sample size, and adjustment notes."
    );
  }

  for (const row of rows) {
    if (row.unit !== claim.expectedUnit) {
      addIssue(
        issues,
        "medium",
        "table-unit-mismatch",
        `${table.id} reports ${row.unit}, but claim ${claim.id} reports ${claim.expectedUnit}.`,
        "Normalize the table row unit or update the claim."
      );
    }

    if (!effectWithinTolerance(claim, row.effect)) {
      addIssue(
        issues,
        "medium",
        "table-effect-size-drift",
        `${table.id} row effect ${row.effect} does not match claim effect ${claim.reportedEffect}.`,
        "Reconcile the table value and manuscript claim."
      );
    }

    if (Math.abs((row.sampleSize || 0) - claim.reportedSampleSize) > 2) {
      addIssue(
        issues,
        "medium",
        "table-sample-size-drift",
        `${table.id} row uses n=${row.sampleSize}; claim ${claim.id} reports n=${claim.reportedSampleSize}.`,
        "Align table and manuscript denominators."
      );
    }

    if (row.adjustedPValue === null && /subgroup|scanner|cohort/i.test(claim.text)) {
      addIssue(
        issues,
        "medium",
        "multiplicity-adjustment-missing",
        `${table.id} row for claim ${claim.id} lacks multiplicity-adjusted significance evidence.`,
        "Add adjusted p-values or downgrade the subgroup conclusion."
      );
    }
  }

  return issues;
}

function missingArtifacts(claim, publicArtifactTypes) {
  return claim.requiredArtifacts
    .filter((artifactType) => !publicArtifactTypes.has(artifactType))
    .map((artifactType) => ({
      severity: "high",
      code: "required-artifact-missing",
      message: `Claim ${claim.id} requires public ${artifactType}, but none is attached.`,
      task: `Attach a public ${artifactType} artifact before submission.`
    }));
}

function scoreIssues(issues) {
  const penalty = issues.reduce((total, issue) => total + SEVERITY_WEIGHT[issue.severity], 0);
  return Math.max(0, 100 - penalty);
}

function statusFromScore(score, issues) {
  if (issues.some((issue) => issue.severity === "blocker")) return "block-release";
  if (score < 60) return "major-revision";
  if (score < 82) return "minor-revision";
  return "ready-with-notes";
}

function evaluateClaim(claim, context) {
  const figureIssues = claim.figureRefs.flatMap((ref) => evaluateFigure(claim, context.figureMap.get(ref), context.publicArtifactTypes));
  const tableIssues = claim.tableRefs.flatMap((ref) => evaluateTable(claim, context.tableMap.get(ref)));
  const artifactIssues = missingArtifacts(claim, context.publicArtifactTypes);
  const issues = [...figureIssues, ...tableIssues, ...artifactIssues];
  const score = scoreIssues(issues);
  return {
    claimId: claim.id,
    claim: claim.text,
    score,
    status: statusFromScore(score, issues),
    issueCount: issues.length,
    issues,
    reviewerTasks: issues.map((issue) => issue.task)
  };
}

function buildResearchGapSignals(claimReports) {
  return claimReports
    .filter((report) => report.status !== "ready-with-notes")
    .map((report) => ({
      claimId: report.claimId,
      opportunity: `Run a targeted follow-up study for ${report.claimId} before broadening the conclusion.`,
      rationale: report.issues.slice(0, 2).map((issue) => issue.message).join(" "),
      priority: report.issues.some((issue) => issue.severity === "blocker" || issue.severity === "high") ? "high" : "medium"
    }));
}

function summarizeReports(claimReports) {
  const allIssues = claimReports.flatMap((report) => report.issues);
  const countsBySeverity = allIssues.reduce((counts, issue) => {
    counts[issue.severity] = (counts[issue.severity] || 0) + 1;
    return counts;
  }, {});
  const averageScore = round(claimReports.reduce((sum, report) => sum + report.score, 0) / claimReports.length);
  const releaseStatus = claimReports.some((report) => report.status === "block-release")
    ? "block-release"
    : averageScore < 70
      ? "major-revision"
      : "ready-with-notes";
  return {
    averageScore,
    releaseStatus,
    totalIssues: allIssues.length,
    countsBySeverity,
    highestRiskClaims: claimReports
      .slice()
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map((report) => ({ claimId: report.claimId, score: report.score, status: report.status }))
  };
}

function auditDigest(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function runAssistant(data) {
  const context = {
    figureMap: toIdMap(data.figures),
    tableMap: toIdMap(data.tables),
    publicArtifactTypes: artifactTypes(data.artifacts)
  };
  const claimReports = data.manuscript.claims.map((claim) => evaluateClaim(claim, context));
  const summary = summarizeReports(claimReports);
  const gapSignals = buildResearchGapSignals(claimReports);
  const reviewPacket = {
    manuscript: {
      id: data.manuscript.id,
      title: data.manuscript.title,
      domain: data.manuscript.domain
    },
    assistant: "figure-claim-consistency-assistant",
    summary,
    claimReports,
    gapSignals
  };
  return {
    ...reviewPacket,
    auditDigest: auditDigest(reviewPacket)
  };
}

function renderMarkdown(report) {
  const lines = [
    `# Figure Claim Consistency Review: ${report.manuscript.title}`,
    "",
    `Decision: **${report.summary.releaseStatus}**`,
    `Average score: **${report.summary.averageScore}**`,
    `Total issues: **${report.summary.totalIssues}**`,
    "",
    "## Highest Risk Claims",
    ...report.summary.highestRiskClaims.map((claim) => `- ${claim.claimId}: ${claim.status} (${claim.score})`),
    "",
    "## Reviewer Tasks"
  ];
  for (const claim of report.claimReports) {
    lines.push("", `### ${claim.claimId}`, `Score: ${claim.score}`, `Status: ${claim.status}`);
    if (claim.issues.length === 0) {
      lines.push("- No blocking figure/table inconsistencies found.");
    } else {
      for (const issue of claim.issues) {
        lines.push(`- [${issue.severity}] ${issue.message}`);
        lines.push(`  Task: ${issue.task}`);
      }
    }
  }
  lines.push("", "## Research Gap Signals");
  for (const gap of report.gapSignals) {
    lines.push(`- ${gap.claimId} (${gap.priority}): ${gap.opportunity}`);
  }
  lines.push("", `Audit digest: \`${report.auditDigest}\``);
  return `${lines.join("\n")}\n`;
}

function renderSvg(report) {
  const width = 960;
  const rowHeight = 82;
  const height = 160 + report.claimReports.length * rowHeight;
  const rows = report.claimReports.map((claim, index) => {
    const y = 132 + index * rowHeight;
    const barWidth = Math.max(16, claim.score * 4.8);
    const color = claim.score >= 82 ? "#2f855a" : claim.score >= 60 ? "#b7791f" : "#c53030";
    return [
      `<text x="44" y="${y}" fill="#102033" font-size="22" font-family="Arial">${claim.claimId}</text>`,
      `<rect x="118" y="${y - 24}" width="480" height="30" rx="4" fill="#e7eef6"/>`,
      `<rect x="118" y="${y - 24}" width="${barWidth}" height="30" rx="4" fill="${color}"/>`,
      `<text x="620" y="${y}" fill="#102033" font-size="19" font-family="Arial">${claim.status} (${claim.score})</text>`,
      `<text x="44" y="${y + 28}" fill="#4a5568" font-size="15" font-family="Arial">${claim.issueCount} issue(s)</text>`
    ].join("");
  }).join("");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="#f7fafc"/>`,
    `<rect x="24" y="24" width="${width - 48}" height="${height - 48}" rx="8" fill="#ffffff" stroke="#cbd5e0"/>`,
    `<text x="44" y="72" fill="#102033" font-size="30" font-weight="700" font-family="Arial">Figure/Table Claim Consistency Assistant</text>`,
    `<text x="44" y="104" fill="#4a5568" font-size="18" font-family="Arial">Decision: ${report.summary.releaseStatus} | Average score: ${report.summary.averageScore} | Audit ${report.auditDigest.slice(0, 12)}</text>`,
    rows,
    `</svg>`
  ].join("");
}

module.exports = {
  runAssistant,
  renderMarkdown,
  renderSvg,
  evaluateClaim,
  effectWithinTolerance
};
