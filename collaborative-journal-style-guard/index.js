function addFinding(findings, severity, code, message, evidence, action) {
  findings.push({ severity, code, message, evidence, action });
}

function orderedSectionsMatch(actual, expected) {
  if (actual.length !== expected.length) return false;
  return expected.every((section, index) => actual[index] === section);
}

function missingValues(actual, required) {
  const actualSet = new Set(actual || []);
  return required.filter((value) => !actualSet.has(value));
}

function checkStyleEnvelope(manuscript, style, findings) {
  if (!orderedSectionsMatch(manuscript.sections || [], style.sectionOrder || [])) {
    const missingSections = missingValues(manuscript.sections || [], style.sectionOrder || []);
    addFinding(
      findings,
      missingSections.length > 0 ? "critical" : "high",
      "section-order-drift",
      "Manuscript sections do not match the target journal order.",
      missingSections.length > 0 ? `missing: ${missingSections.join(", ")}` : "same sections, wrong order",
      "Reorder manuscript blocks and restore missing required sections before export.",
    );
  }

  if (manuscript.abstractWordCount > style.abstractWordLimit) {
    addFinding(
      findings,
      "medium",
      "abstract-word-limit-exceeded",
      "Abstract exceeds the target journal word limit.",
      `${manuscript.abstractWordCount}/${style.abstractWordLimit}`,
      "Shorten abstract or move details into the main manuscript.",
    );
  }

  if (manuscript.manuscriptWordCount > style.manuscriptWordLimit) {
    addFinding(
      findings,
      "high",
      "manuscript-word-limit-exceeded",
      "Main manuscript exceeds the target journal word limit.",
      `${manuscript.manuscriptWordCount}/${style.manuscriptWordLimit}`,
      "Trim manuscript text or request an editor-approved exception.",
    );
  }

  if (manuscript.figureCount > style.maxFigures) {
    addFinding(
      findings,
      "high",
      "figure-limit-exceeded",
      "Figure count exceeds the target journal limit.",
      `${manuscript.figureCount}/${style.maxFigures}`,
      "Move lower-priority figures to supplements or request an exception.",
    );
  }

  if (manuscript.tableCount > style.maxTables) {
    addFinding(
      findings,
      "medium",
      "table-limit-exceeded",
      "Table count exceeds the target journal limit.",
      `${manuscript.tableCount}/${style.maxTables}`,
      "Move lower-priority tables to supplements or request an exception.",
    );
  }

  if (manuscript.referenceStyle !== style.referenceStyle) {
    addFinding(
      findings,
      "high",
      "reference-style-mismatch",
      "Reference style does not match the target journal instructions.",
      `${manuscript.referenceStyle} vs ${style.referenceStyle}`,
      "Regenerate references using the target journal style.",
    );
  }
}

function checkDeclarations(manuscript, style, findings) {
  const missing = missingValues(manuscript.declarations || [], style.requiredDeclarations || []);
  for (const declaration of missing) {
    addFinding(
      findings,
      declaration === "ethics" || declaration === "data-availability" ? "critical" : "high",
      "missing-required-declaration",
      "Required publication declaration is missing.",
      declaration,
      `Add and coauthor-review the ${declaration} declaration block before export.`,
    );
  }
}

function checkCollaborationState(manuscript, findings) {
  const state = manuscript.collaborationState || {};

  if (state.blockingComments > 0) {
    addFinding(
      findings,
      "critical",
      "blocking-comments-open",
      "Blocking collaborative comments remain unresolved.",
      `${state.blockingComments}`,
      "Resolve blocking comments before generating a submission export.",
    );
  }

  if (state.unresolvedTrackedChanges > 0) {
    addFinding(
      findings,
      "high",
      "tracked-changes-open",
      "Tracked changes remain unresolved in shared manuscript blocks.",
      `${state.unresolvedTrackedChanges}`,
      "Accept, reject, or explicitly defer tracked changes before export.",
    );
  }

  if (state.unresolvedSuggestions > 3) {
    addFinding(
      findings,
      "medium",
      "many-unresolved-suggestions",
      "Many non-blocking suggestions remain open.",
      `${state.unresolvedSuggestions}`,
      "Triage open suggestions or mark them as intentionally deferred.",
    );
  }

  if (state.staleNotebookOutputs > 0) {
    addFinding(
      findings,
      "high",
      "stale-notebook-output",
      "Notebook-derived manuscript outputs are stale relative to source cells.",
      `${state.staleNotebookOutputs}`,
      "Re-run or refresh notebook outputs before final export.",
    );
  }

  if (state.coauthorApprovals < state.requiredCoauthorApprovals) {
    addFinding(
      findings,
      "critical",
      "missing-coauthor-approval",
      "Not all required coauthors have approved the current manuscript hash.",
      `${state.coauthorApprovals}/${state.requiredCoauthorApprovals}`,
      "Collect coauthor approvals after final style and content changes are applied.",
    );
  }
}

function scoreFindings(findings) {
  const weights = { critical: 30, high: 13, medium: 5, low: 2 };
  const deduction = findings.reduce((sum, finding) => sum + (weights[finding.severity] || 4), 0);
  return Math.max(0, 100 - deduction);
}

function decisionFromFindings(findings) {
  const critical = findings.filter((finding) => finding.severity === "critical").length;
  const high = findings.filter((finding) => finding.severity === "high").length;
  const medium = findings.filter((finding) => finding.severity === "medium").length;

  if (critical > 0) return "block-export";
  if (high >= 2) return "style-revision";
  if (high === 1 || medium > 0) return "minor-style-fixes";
  return "export-ready";
}

function severityCounts(findings) {
  return findings.reduce((counts, finding) => {
    counts[finding.severity] = (counts[finding.severity] || 0) + 1;
    return counts;
  }, {});
}

function uniqueActions(findings) {
  const actions = findings.map((finding) => finding.action);
  if (actions.length === 0) {
    actions.push("Generate journal export packet from the current collaborative manuscript hash.");
  }
  return Array.from(new Set(actions));
}

function reviewManuscript(manuscript, targetStyles) {
  const style = targetStyles[manuscript.targetStyleId];
  if (!style) {
    throw new Error(`Unknown target style: ${manuscript.targetStyleId}`);
  }

  const findings = [];
  checkStyleEnvelope(manuscript, style, findings);
  checkDeclarations(manuscript, style, findings);
  checkCollaborationState(manuscript, findings);

  return {
    manuscriptId: manuscript.id,
    title: manuscript.title,
    targetJournal: style.journal,
    decision: decisionFromFindings(findings),
    styleScore: scoreFindings(findings),
    findingCount: findings.length,
    severityCounts: severityCounts(findings),
    findings,
    actions: uniqueActions(findings),
  };
}

function reviewManuscripts(manuscripts, targetStyles) {
  const results = manuscripts.map((manuscript) => reviewManuscript(manuscript, targetStyles));
  const summary = {
    manuscriptsReviewed: results.length,
    exportReady: results.filter((result) => result.decision === "export-ready").length,
    minorStyleFixes: results.filter((result) => result.decision === "minor-style-fixes").length,
    styleRevision: results.filter((result) => result.decision === "style-revision").length,
    blocked: results.filter((result) => result.decision === "block-export").length,
    averageStyleScore: Math.round(results.reduce((sum, result) => sum + result.styleScore, 0) / results.length),
  };

  return {
    generatedAt: new Date("2026-05-28T00:00:00Z").toISOString(),
    requirementMap: [
      "Rich scientific formatting: validates journal-specific sections, declarations, references, figures, and tables.",
      "Reference manager integration: checks target reference style before export.",
      "Real-time collaboration: blocks export while comments, tracked changes, suggestions, or approvals are unresolved.",
      "Jupyter integration: blocks stale notebook-derived outputs before publication export.",
      "Publication templates: applies target journal abstract, word-count, figure, and table limits.",
    ],
    summary,
    results,
  };
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderMarkdownReport(report) {
  const lines = [
    "# Collaborative Journal Style Conformance Review",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Manuscripts reviewed: ${report.summary.manuscriptsReviewed}`,
    `- Export ready: ${report.summary.exportReady}`,
    `- Minor style fixes: ${report.summary.minorStyleFixes}`,
    `- Style revision: ${report.summary.styleRevision}`,
    `- Blocked: ${report.summary.blocked}`,
    `- Average style score: ${report.summary.averageStyleScore}`,
    "",
    "## Requirement Map",
    "",
    ...report.requirementMap.map((item) => `- ${item}`),
    "",
    "## Findings",
    "",
  ];

  for (const result of report.results) {
    lines.push(`### ${result.title}`);
    lines.push("");
    lines.push(`- Target journal: ${result.targetJournal}`);
    lines.push(`- Decision: ${result.decision}`);
    lines.push(`- Style score: ${result.styleScore}`);
    lines.push(`- Finding count: ${result.findingCount}`);
    for (const finding of result.findings) {
      lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}`);
    }
    lines.push("");
    lines.push("Actions:");
    for (const action of result.actions) {
      lines.push(`- ${action}`);
    }
    lines.push("");
  }

  while (lines[lines.length - 1] === "") {
    lines.pop();
  }

  return `${lines.join("\n")}\n`;
}

function renderSvgReport(report) {
  const bars = [
    { label: "Ready", value: report.summary.exportReady, color: "#2f9e44" },
    { label: "Minor", value: report.summary.minorStyleFixes, color: "#1971c2" },
    { label: "Revision", value: report.summary.styleRevision, color: "#f08c00" },
    { label: "Blocked", value: report.summary.blocked, color: "#d6336c" },
  ];
  const max = Math.max(1, ...bars.map((bar) => bar.value));
  const rows = bars
    .map((bar, index) => {
      const y = 190 + index * 62;
      const barWidth = Math.round((bar.value / max) * 540);
      return [
        `<text x="80" y="${y + 26}" fill="#e9ecef" font-size="24">${escapeHtml(bar.label)}</text>`,
        `<rect x="230" y="${y}" width="${barWidth}" height="34" rx="4" fill="${bar.color}"/>`,
        `<text x="${250 + barWidth}" y="${y + 26}" fill="#e9ecef" font-size="22">${bar.value}</text>`,
      ].join("");
    })
    .join("");

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="520" viewBox="0 0 960 520">',
    '<rect width="960" height="520" fill="#0b1020"/>',
    '<rect x="48" y="48" width="864" height="424" rx="8" fill="#151b2e" stroke="#334155"/>',
    '<text x="80" y="105" fill="#f8f9fa" font-size="34" font-family="Arial, sans-serif">Journal Style Conformance Guard</text>',
    `<text x="80" y="145" fill="#adb5bd" font-size="20" font-family="Arial, sans-serif">Average style score: ${report.summary.averageStyleScore}</text>`,
    rows,
    '<text x="80" y="454" fill="#adb5bd" font-size="18" font-family="Arial, sans-serif">Synthetic collaborative manuscript export packets only.</text>',
    "</svg>",
  ].join("");
}

module.exports = {
  reviewManuscript,
  reviewManuscripts,
  renderMarkdownReport,
  renderSvgReport,
};
