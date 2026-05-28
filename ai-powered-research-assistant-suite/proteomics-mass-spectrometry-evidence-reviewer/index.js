"use strict";

const SEVERITY_WEIGHT = {
  critical: 25,
  high: 18,
  medium: 10,
  low: 4
};

function addFinding(findings, severity, id, title, evidence, remediation) {
  findings.push({ severity, id, title, evidence, remediation });
}

function reviewProteomicsEvidence(study) {
  const findings = [];
  const search = study.search || {};
  const design = study.sampleDesign || {};
  const quant = study.quantification || {};
  const instrument = study.instrument || {};
  const availability = study.dataAvailability || {};
  const groups = Array.isArray(quant.proteinGroups) ? quant.proteinGroups : [];

  if (typeof search.proteinFdrPercent !== "number") {
    addFinding(
      findings,
      "critical",
      "protein-fdr-missing",
      "Protein-level FDR is not reported",
      "The packet reports peptide FDR but no protein-level false-discovery threshold.",
      "Report protein-level FDR control, decoy counting rules, and protein-group inference settings before accepting protein abundance claims."
    );
  }

  const ambiguousGroups = groups.filter(
    (group) => Number(group.uniquePeptides || 0) < 2 || Number(group.razorPeptides || 0) > Number(group.uniquePeptides || 0) * 2
  );
  if (ambiguousGroups.length > 0) {
    addFinding(
      findings,
      "high",
      "peptide-protein-ambiguity",
      "Protein claims rely on weak unique-peptide support",
      `${ambiguousGroups.length} protein group(s) have fewer than two unique peptides or are dominated by razor/shared peptides.`,
      "Require unique-peptide evidence, protein-group ambiguity flags, or claim wording that reflects indistinguishable protein families."
    );
  }

  if (design.batchByCondition || design.randomizedRunOrder === false) {
    addFinding(
      findings,
      "high",
      "batch-confounded-design",
      "Batch structure is confounded with biological condition",
      `batchByCondition=${Boolean(design.batchByCondition)}, randomizedRunOrder=${Boolean(design.randomizedRunOrder)}.`,
      "Randomize run order or model batch explicitly; treat condition-level abundance claims as provisional until batch sensitivity is shown."
    );
  }

  if (Number(instrument.retentionTimeMedianShiftSeconds || 0) > 20 && !instrument.calibrationStandard) {
    addFinding(
      findings,
      "medium",
      "instrument-drift",
      "Retention-time drift lacks calibration evidence",
      `Median shift is ${instrument.retentionTimeMedianShiftSeconds} seconds and no calibration standard is listed.`,
      "Add pooled QC trend plots, retention-time alignment diagnostics, and acceptance thresholds for instrument drift."
    );
  }

  if (Number(quant.missingnessPercent || 0) > 25 || /zero/i.test(String(quant.missingnessHandling || ""))) {
    addFinding(
      findings,
      "high",
      "missingness-handling",
      "Missing intensity handling can inflate differential abundance",
      `${quant.missingnessPercent}% missingness with "${quant.missingnessHandling}" handling.`,
      "Use left-censoring-aware imputation or sensitivity analyses; avoid zero-fill-driven significance claims."
    );
  }

  if (search.variableModifications && search.variableModifications.some((mod) => /phospho/i.test(mod)) && !search.ptmLocalizationThreshold) {
    addFinding(
      findings,
      "medium",
      "ptm-localization",
      "PTM localization confidence is absent",
      "Phosphorylation is searched, but no site-localization probability threshold is provided.",
      "Report localization score thresholds and site ambiguity before claiming a direct kinase substrate."
    );
  }

  if (Number(design.biologicalReplicatesPerCondition || 0) < 4) {
    addFinding(
      findings,
      "medium",
      "replicate-adequacy",
      "Biological replicate count is low for broad pathway claims",
      `${design.biologicalReplicatesPerCondition || 0} biological replicates per condition are listed.`,
      "Limit claims to exploratory evidence or add independent biological replication."
    );
  }

  if (!availability.rawFilesDeposited || !availability.accession || !availability.searchParametersIncluded) {
    addFinding(
      findings,
      "high",
      "raw-data-availability",
      "Raw data and search parameters are not reproducible",
      "The packet lacks a repository accession, raw-file deposition, or full search-parameter export.",
      "Provide raw files, peak lists where applicable, search-parameter exports, and a stable ProteomeXchange-style accession."
    );
  }

  const unsupportedClaims = groups.filter((group) => Number(group.adjustedPValue || 1) >= 0.05 && /significant|robust|activated|decreased/i.test(group.claim || ""));
  if (unsupportedClaims.length > 0) {
    addFinding(
      findings,
      "medium",
      "claim-statistics-mismatch",
      "Narrative claims exceed statistical support",
      `${unsupportedClaims.length} protein-level claim(s) use strong wording despite adjusted p-values at or above 0.05.`,
      "Align claim language with adjusted p-values, effect sizes, and confidence intervals."
    );
  }

  const riskScore = Math.min(
    100,
    findings.reduce((total, finding) => total + SEVERITY_WEIGHT[finding.severity], 0)
  );
  const readinessScore = Math.max(0, 100 - riskScore);
  const criticalCount = findings.filter((finding) => finding.severity === "critical").length;
  const highCount = findings.filter((finding) => finding.severity === "high").length;

  return {
    studyId: study.studyId,
    title: study.title,
    reviewedAt: "2026-05-28T00:00:00.000Z",
    status: criticalCount > 0 || highCount > 2 ? "block-ai-summary" : "revise-before-summary",
    riskScore,
    readinessScore,
    findingCount: findings.length,
    severityCounts: countBySeverity(findings),
    findings,
    safeSummary:
      "Synthetic proteomics evidence is not ready for strong AI-generated conclusions until FDR, protein-group ambiguity, batch design, missingness, PTM localization, and reproducibility gaps are resolved."
  };
}

function countBySeverity(findings) {
  return findings.reduce(
    (counts, finding) => {
      counts[finding.severity] += 1;
      return counts;
    },
    { critical: 0, high: 0, medium: 0, low: 0 }
  );
}

function toMarkdown(report) {
  const rows = report.findings
    .map((finding) => `| ${finding.severity} | ${finding.id} | ${finding.title} | ${finding.remediation} |`)
    .join("\n");

  return [
    `# Proteomics Evidence Review: ${report.studyId}`,
    "",
    `Status: **${report.status}**`,
    `Risk score: **${report.riskScore}/100**`,
    `Readiness score: **${report.readinessScore}/100**`,
    "",
    report.safeSummary,
    "",
    "| Severity | Check | Finding | Reviewer action |",
    "| --- | --- | --- | --- |",
    rows
  ].join("\n");
}

function toSvg(report) {
  const width = 960;
  const height = 540;
  const barWidth = Math.round((report.riskScore / 100) * 680);
  const colors = {
    critical: "#b91c1c",
    high: "#d97706",
    medium: "#2563eb",
    low: "#16a34a"
  };
  const severityRows = Object.entries(report.severityCounts)
    .map(([severity, count], index) => {
      const y = 310 + index * 36;
      const countWidth = Math.max(8, count * 46);
      return `<text x="120" y="${y}" font-family="Arial" font-size="20" fill="#111827">${severity}</text><rect x="260" y="${y - 20}" width="${countWidth}" height="22" rx="4" fill="${colors[severity]}"/><text x="${275 + countWidth}" y="${y}" font-family="Arial" font-size="18" fill="#111827">${count}</text>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#f8fafc"/>
  <text x="80" y="86" font-family="Arial" font-size="34" font-weight="700" fill="#111827">Proteomics evidence readiness</text>
  <text x="80" y="125" font-family="Arial" font-size="18" fill="#475569">${escapeXml(report.studyId)} - ${escapeXml(report.status)}</text>
  <rect x="80" y="174" width="680" height="42" rx="8" fill="#e5e7eb"/>
  <rect x="80" y="174" width="${barWidth}" height="42" rx="8" fill="#dc2626"/>
  <text x="785" y="203" font-family="Arial" font-size="30" font-weight="700" fill="#111827">${report.riskScore}/100</text>
  <text x="80" y="258" font-family="Arial" font-size="22" font-weight="700" fill="#111827">Finding severity mix</text>
  ${severityRows}
</svg>`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  reviewProteomicsEvidence,
  toMarkdown,
  toSvg
};
