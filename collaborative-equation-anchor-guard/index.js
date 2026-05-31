const crypto = require("crypto");

function expectedEquationNumber(section, equation) {
  return `${section.number}.${equation.localNumber}`;
}

function collectEquations(session) {
  const equations = [];
  for (const section of session.sections || []) {
    for (const equation of section.equations || []) {
      equations.push({
        ...equation,
        sectionId: section.id,
        sectionNumber: section.number,
        lockedSection: section.locked,
        expectedNumber: expectedEquationNumber(section, equation),
      });
    }
  }
  return equations;
}

function countLabels(equations) {
  const counts = new Map();
  for (const equation of equations) {
    counts.set(equation.label, (counts.get(equation.label) || 0) + 1);
  }
  return counts;
}

function evaluateEquationAnchors(session) {
  const blockers = [];
  const warnings = [];
  const evidence = [];
  const actions = [];

  const equations = collectEquations(session);
  const labelCounts = countLabels(equations);
  const labels = new Set(equations.map((item) => item.label));

  for (const [label, count] of labelCounts.entries()) {
    if (count > 1) {
      blockers.push(`duplicate equation label ${label} appears ${count} times`);
      actions.push("rename duplicate equation labels before export");
    }
  }

  for (const section of session.sections || []) {
    for (const reference of section.references || []) {
      if (!labels.has(reference)) {
        blockers.push(`section ${section.id} references missing ${reference}`);
        actions.push("repair stale equation references before export");
      } else {
        evidence.push(`reference ${reference} resolves`);
      }
    }

    for (const comment of section.comments || []) {
      if (
        comment.visibility === "private-reviewer" &&
        comment.anchor &&
        !comment.resolved
      ) {
        blockers.push(
          `private reviewer comment ${comment.id} remains on ${comment.anchor}`
        );
        actions.push("resolve or redact private reviewer equation comments");
      }
    }
  }

  for (const equation of equations) {
    if (!/^eq:[a-z0-9-]+$/i.test(equation.label)) {
      warnings.push(`equation label ${equation.label} is not export-safe`);
      actions.push("normalize equation labels for journal export");
    }
    if (equation.lockedSection && equation.modifiedBy !== "section-owner") {
      blockers.push(
        `locked section ${equation.sectionId} equation ${equation.label} was modified by ${equation.modifiedBy}`
      );
      actions.push("obtain section-owner approval for locked equation changes");
    }
    evidence.push(
      `${equation.label} should render as (${equation.expectedNumber})`
    );
  }

  if (blockers.length === 0) {
    actions.push("allow manuscript export with equation anchors preserved");
  }

  const decision =
    blockers.length > 0 ? "hold_export" : warnings.length > 0 ? "allow_with_notice" : "allow_export";

  const result = {
    sessionId: session.id,
    title: session.title,
    journalStyle: session.journalStyle,
    decision,
    equationCount: equations.length,
    referenceCount: (session.sections || []).reduce(
      (total, section) => total + (section.references || []).length,
      0
    ),
    evidence,
    blockers,
    warnings,
    actions: [...new Set(actions)],
  };

  return {
    ...result,
    auditDigest: digest(result),
  };
}

function evaluateEquationAnchorBatch(sessions) {
  const decisions = sessions.map(evaluateEquationAnchors);
  const summary = decisions.reduce(
    (acc, item) => {
      acc.total += 1;
      acc[item.decision] += 1;
      acc.equations += item.equationCount;
      acc.references += item.referenceCount;
      return acc;
    },
    {
      total: 0,
      allow_export: 0,
      allow_with_notice: 0,
      hold_export: 0,
      equations: 0,
      references: 0,
    }
  );

  return {
    generatedAt: new Date().toISOString(),
    summary,
    decisions,
  };
}

function digest(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

function renderMarkdownReport(report) {
  const lines = [
    "# Collaborative Equation Anchor Guard Report",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Sessions checked: ${report.summary.total}`,
    `- Allow export: ${report.summary.allow_export}`,
    `- Allow with notice: ${report.summary.allow_with_notice}`,
    `- Hold export: ${report.summary.hold_export}`,
    `- Equations: ${report.summary.equations}`,
    `- References: ${report.summary.references}`,
    "",
    "## Decisions",
    "",
  ];

  for (const item of report.decisions) {
    lines.push(`### ${item.sessionId} - ${item.decision}`);
    lines.push("");
    lines.push(`- Title: ${item.title}`);
    lines.push(`- Equations: ${item.equationCount}`);
    lines.push(`- References: ${item.referenceCount}`);
    lines.push(`- Audit digest: ${item.auditDigest}`);
    lines.push(`- Evidence: ${item.evidence.join("; ") || "none"}`);
    lines.push(`- Blockers: ${item.blockers.join("; ") || "none"}`);
    lines.push(`- Warnings: ${item.warnings.join("; ") || "none"}`);
    lines.push(`- Actions: ${item.actions.join("; ")}`);
    lines.push("");
  }

  return lines.join("\n");
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSvgReport(report) {
  const rows = report.decisions
    .map((item, index) => {
      const y = 190 + index * 110;
      const color =
        item.decision === "allow_export"
          ? "#059669"
          : item.decision === "allow_with_notice"
            ? "#d97706"
            : "#dc2626";
      return `
        <g transform="translate(60 ${y})">
          <rect width="1080" height="86" rx="10" fill="#f8fafc" stroke="#cbd5e1"/>
          <circle cx="30" cy="43" r="11" fill="${color}"/>
          <text x="58" y="30" font-size="20" font-weight="700">${escapeXml(item.sessionId)} - ${escapeXml(item.decision)}</text>
          <text x="58" y="56" font-size="15" fill="#475569">${escapeXml(item.title.slice(0, 98))}</text>
          <text x="58" y="76" font-size="14" fill="#64748b">equations ${item.equationCount} / references ${item.referenceCount} / blockers ${item.blockers.length}</text>
        </g>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
  <rect width="1200" height="720" fill="#f0f9ff"/>
  <rect x="34" y="34" width="1132" height="652" rx="18" fill="white" stroke="#bae6fd"/>
  <text x="60" y="92" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="#111827">Collaborative Equation Anchor Guard</text>
  <text x="60" y="130" font-family="Arial, sans-serif" font-size="20" fill="#475569">Allow ${report.summary.allow_export} / Notice ${report.summary.allow_with_notice} / Hold ${report.summary.hold_export}</text>
  <text x="60" y="160" font-family="Arial, sans-serif" font-size="18" fill="#64748b">${report.summary.equations} equations and ${report.summary.references} references checked</text>
  <g font-family="Arial, sans-serif">${rows}</g>
</svg>`;
}

module.exports = {
  collectEquations,
  evaluateEquationAnchorBatch,
  evaluateEquationAnchors,
  renderMarkdownReport,
  renderSvgReport,
};
