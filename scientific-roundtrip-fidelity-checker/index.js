const crypto = require("node:crypto");

const SEVERITY_WEIGHTS = {
  blocker: 30,
  high: 20,
  medium: 10,
  low: 4
};

function arrayDiff(expected = [], actual = []) {
  const actualSet = new Set(actual);
  return expected.filter((item) => !actualSet.has(item));
}

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

function addFinding(findings, severity, code, message, task, blockId = null) {
  findings.push({ severity, code, message, task, blockId });
}

function compareScalar(findings, block, roundTripBlock, field, severity, code, label) {
  if (block[field] !== roundTripBlock[field]) {
    addFinding(
      findings,
      severity,
      code,
      `${label} changed for ${block.id}: expected ${JSON.stringify(block[field])}, got ${JSON.stringify(roundTripBlock[field])}.`,
      `Regenerate the export/import adapter so ${label.toLowerCase()} survives round trip for ${block.id}.`,
      block.id
    );
  }
}

function compareArray(findings, block, roundTripBlock, field, severity, code, label) {
  const missing = arrayDiff(block[field], roundTripBlock[field]);
  if (missing.length) {
    addFinding(
      findings,
      severity,
      code,
      `${label} missing after round trip for ${block.id}: ${missing.join(", ")}.`,
      `Preserve ${label.toLowerCase()} metadata for ${block.id} in this format.`,
      block.id
    );
  }
}

function compareBlock(canonicalBlock, roundTripBlock, format) {
  const findings = [];
  if (!roundTripBlock) {
    addFinding(
      findings,
      "blocker",
      "block-dropped",
      `${format} round trip dropped required block ${canonicalBlock.id}.`,
      `Restore ${canonicalBlock.id} during ${format} import before enabling publication export.`,
      canonicalBlock.id
    );
    return findings;
  }

  compareScalar(findings, canonicalBlock, roundTripBlock, "type", "blocker", "block-type-changed", "Block type");
  compareScalar(findings, canonicalBlock, roundTripBlock, "label", "high", "label-changed", "Anchor label");
  compareArray(findings, canonicalBlock, roundTripBlock, "references", "medium", "citation-key-lost", "Citation keys");
  compareArray(findings, canonicalBlock, roundTripBlock, "comments", "medium", "comment-thread-lost", "Comment threads");
  compareArray(findings, canonicalBlock, roundTripBlock, "suggestions", "medium", "suggestion-lost", "Unresolved suggestions");

  if (canonicalBlock.type === "equation") {
    compareScalar(findings, canonicalBlock, roundTripBlock, "latex", "high", "equation-mutated", "Equation LaTeX");
  }

  if (canonicalBlock.type === "figure") {
    compareScalar(findings, canonicalBlock, roundTripBlock, "caption", "medium", "caption-mutated", "Figure caption");
    if (canonicalBlock.sourceAsset !== roundTripBlock.sourceAsset) {
      addFinding(
        findings,
        "low",
        "source-asset-transcoded",
        `${canonicalBlock.id} source asset changed from ${canonicalBlock.sourceAsset} to ${roundTripBlock.sourceAsset}.`,
        "Confirm the transcoded figure keeps resolution, accessibility metadata, and citation anchors.",
        canonicalBlock.id
      );
    }
  }

  if (canonicalBlock.type === "table") {
    compareScalar(findings, canonicalBlock, roundTripBlock, "caption", "medium", "table-caption-mutated", "Table caption");
    compareArray(findings, canonicalBlock, roundTripBlock, "columns", "high", "table-column-lost", "Table columns");
  }

  if (canonicalBlock.type === "notebook-cell") {
    compareScalar(findings, canonicalBlock, roundTripBlock, "language", "high", "cell-language-changed", "Notebook language");
    compareScalar(findings, canonicalBlock, roundTripBlock, "sourceHash", "high", "cell-source-mutated", "Notebook source hash");
    compareScalar(findings, canonicalBlock, roundTripBlock, "outputHash", "high", "cell-output-mutated", "Notebook output hash");
    compareScalar(findings, canonicalBlock, roundTripBlock, "executionCount", "medium", "cell-execution-count-drift", "Execution count");
  }

  return findings;
}

function requiredBlocksForFormat(document, format) {
  return document.blocks.filter((block) => block.requiredFormats.includes(format));
}

function crossReferenceKey(ref) {
  return `${ref.from}->${ref.to}:${ref.kind}`;
}

function compareCrossReferences(document, roundTrip) {
  const actual = new Set((roundTrip.crossReferences || []).map(crossReferenceKey));
  return document.crossReferences
    .filter((ref) => {
      const fromBlock = document.blocks.find((block) => block.id === ref.from);
      const toBlock = document.blocks.find((block) => block.id === ref.to);
      return fromBlock?.requiredFormats.includes(roundTrip.format) || toBlock?.requiredFormats.includes(roundTrip.format);
    })
    .filter((ref) => !actual.has(crossReferenceKey(ref)))
    .map((ref) => ({
      severity: "high",
      code: "cross-reference-lost",
      message: `${roundTrip.format} round trip lost ${ref.kind} link ${ref.from} -> ${ref.to}.`,
      task: `Preserve cross-reference ${ref.from} -> ${ref.to} during ${roundTrip.format} import.`,
      blockId: ref.from
    }));
}

function score(findings) {
  const penalty = findings.reduce((total, finding) => total + SEVERITY_WEIGHTS[finding.severity], 0);
  return Math.max(0, 100 - penalty);
}

function decisionFor(findings, fidelityScore) {
  if (findings.some((finding) => finding.severity === "blocker")) return "block-export";
  if (fidelityScore < 70) return "repair-before-submit";
  if (fidelityScore < 90) return "review-warnings";
  return "roundtrip-ready";
}

function evaluateRoundTrip(document, roundTrip) {
  const blockMap = new Map(roundTrip.blocks.map((block) => [block.id, block]));
  const findings = [];
  for (const block of requiredBlocksForFormat(document, roundTrip.format)) {
    findings.push(...compareBlock(block, blockMap.get(block.id), roundTrip.format));
  }
  findings.push(...compareCrossReferences(document, roundTrip));
  const fidelityScore = score(findings);
  return {
    format: roundTrip.format,
    exporter: roundTrip.exporter,
    importer: roundTrip.importer,
    timestamp: roundTrip.timestamp,
    fidelityScore,
    decision: decisionFor(findings, fidelityScore),
    findingCount: findings.length,
    findings,
    repairedBy: findings.map((finding) => finding.task)
  };
}

function summarize(formatReports) {
  const allFindings = formatReports.flatMap((report) => report.findings);
  const countsBySeverity = allFindings.reduce((counts, finding) => {
    counts[finding.severity] = (counts[finding.severity] || 0) + 1;
    return counts;
  }, {});
  const averageScore = Math.round(formatReports.reduce((total, report) => total + report.fidelityScore, 0) / formatReports.length);
  const releaseDecision = formatReports.some((report) => report.decision === "block-export")
    ? "block-export"
    : averageScore < 80
      ? "repair-before-submit"
      : "roundtrip-ready";
  return {
    averageScore,
    releaseDecision,
    totalFindings: allFindings.length,
    countsBySeverity,
    weakestFormats: formatReports
      .slice()
      .sort((a, b) => a.fidelityScore - b.fidelityScore)
      .map((report) => ({
        format: report.format,
        fidelityScore: report.fidelityScore,
        decision: report.decision
      }))
  };
}

function runRoundTripAudit({ canonicalDocument, roundTripExports }) {
  const formatReports = roundTripExports.map((roundTrip) => evaluateRoundTrip(canonicalDocument, roundTrip));
  const packet = {
    document: {
      id: canonicalDocument.id,
      title: canonicalDocument.title,
      version: canonicalDocument.version,
      publicationStyle: canonicalDocument.publicationStyle
    },
    checker: "scientific-roundtrip-fidelity-checker",
    summary: summarize(formatReports),
    formatReports
  };
  return {
    ...packet,
    auditDigest: digest(packet)
  };
}

function renderMarkdown(report) {
  const lines = [
    `# Round-Trip Fidelity Review: ${report.document.title}`,
    "",
    `Decision: **${report.summary.releaseDecision}**`,
    `Average fidelity: **${report.summary.averageScore}**`,
    `Total findings: **${report.summary.totalFindings}**`,
    "",
    "## Formats",
    ...report.summary.weakestFormats.map((item) => `- ${item.format}: ${item.decision} (${item.fidelityScore})`),
    "",
    "## Repair Queue"
  ];
  for (const formatReport of report.formatReports) {
    lines.push("", `### ${formatReport.format}`, `Score: ${formatReport.fidelityScore}`, `Decision: ${formatReport.decision}`);
    if (!formatReport.findings.length) {
      lines.push("- No fidelity loss detected.");
    } else {
      for (const finding of formatReport.findings) {
        lines.push(`- [${finding.severity}] ${finding.message}`);
        lines.push(`  Task: ${finding.task}`);
      }
    }
  }
  lines.push("", `Audit digest: \`${report.auditDigest}\``);
  return `${lines.join("\n")}\n`;
}

function renderSvg(report) {
  const width = 980;
  const rowHeight = 94;
  const height = 160 + report.formatReports.length * rowHeight;
  const rows = report.formatReports.map((formatReport, index) => {
    const y = 140 + index * rowHeight;
    const barWidth = Math.max(10, formatReport.fidelityScore * 5.2);
    const color = formatReport.fidelityScore >= 90 ? "#2f855a" : formatReport.fidelityScore >= 70 ? "#b7791f" : "#c53030";
    return [
      `<text x="52" y="${y}" fill="#102033" font-size="24" font-family="Arial">${formatReport.format}</text>`,
      `<rect x="190" y="${y - 24}" width="520" height="34" rx="4" fill="#e7eef6"/>`,
      `<rect x="190" y="${y - 24}" width="${barWidth}" height="34" rx="4" fill="${color}"/>`,
      `<text x="730" y="${y}" fill="#102033" font-size="20" font-family="Arial">${formatReport.decision} (${formatReport.fidelityScore})</text>`,
      `<text x="190" y="${y + 34}" fill="#4a5568" font-size="16" font-family="Arial">${formatReport.findingCount} finding(s)</text>`
    ].join("");
  }).join("");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="#f7fafc"/>`,
    `<rect x="24" y="24" width="${width - 48}" height="${height - 48}" rx="8" fill="#ffffff" stroke="#cbd5e0"/>`,
    `<text x="52" y="72" fill="#102033" font-size="30" font-weight="700" font-family="Arial">Scientific Round-Trip Fidelity Checker</text>`,
    `<text x="52" y="104" fill="#4a5568" font-size="18" font-family="Arial">Decision: ${report.summary.releaseDecision} | Avg ${report.summary.averageScore} | Audit ${report.auditDigest.slice(0, 12)}</text>`,
    rows,
    `</svg>`
  ].join("");
}

module.exports = {
  runRoundTripAudit,
  evaluateRoundTrip,
  compareBlock,
  renderMarkdown,
  renderSvg,
  digest
};
