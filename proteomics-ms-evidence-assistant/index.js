const FDR_LIMIT = 0.01;

function addFinding(findings, severity, code, message, evidence, action) {
  findings.push({ severity, code, message, evidence, action });
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function checkSearchEvidence(study, findings) {
  const search = study.search || {};

  if (search.peptideFdr > FDR_LIMIT) {
    addFinding(
      findings,
      "critical",
      "peptide-fdr-above-threshold",
      "Peptide-level FDR exceeds the standard 1% review threshold.",
      `${search.peptideFdr}`,
      "Tighten peptide-spectrum match filtering or qualify affected claims.",
    );
  }

  if (search.proteinFdr > FDR_LIMIT) {
    addFinding(
      findings,
      "critical",
      "protein-fdr-above-threshold",
      "Protein-level FDR exceeds the standard 1% review threshold.",
      `${search.proteinFdr}`,
      "Recompute protein groups at 1% FDR or downgrade protein-level conclusions.",
    );
  }

  if (!hasValue(search.decoyStrategy)) {
    addFinding(
      findings,
      "high",
      "missing-decoy-strategy",
      "Search packet does not document target-decoy or equivalent error control.",
      study.id,
      "Attach decoy strategy, FDR estimation method, and thresholding notes.",
    );
  }

  if (!hasValue(search.databaseVersion)) {
    addFinding(
      findings,
      "high",
      "missing-protein-database-version",
      "Protein database version is missing from the manuscript packet.",
      study.id,
      "Record UniProt/refseq database version and contaminant database handling.",
    );
  }

  if (!hasValue(search.engine) || !hasValue(search.precursorTolerancePpm) || !hasValue(search.fragmentToleranceDa)) {
    addFinding(
      findings,
      "medium",
      "incomplete-search-parameters",
      "Search-engine tolerances are incomplete.",
      study.id,
      "Add search engine, precursor tolerance, fragment tolerance, and modification settings.",
    );
  }

  if (search.precursorTolerancePpm > 20 || search.fragmentToleranceDa > 0.5) {
    addFinding(
      findings,
      "medium",
      "wide-search-tolerance",
      "Mass tolerances are broad enough to require extra false-discovery justification.",
      `${search.precursorTolerancePpm} ppm / ${search.fragmentToleranceDa} Da`,
      "Explain instrument mode and validate tolerance choices against decoy performance.",
    );
  }
}

function checkQuantification(study, findings) {
  const quant = study.quantification || {};

  if (!hasValue(quant.normalization) || quant.normalization === "none") {
    addFinding(
      findings,
      "high",
      "missing-normalization",
      "Quantification packet does not include a usable normalization strategy.",
      study.id,
      "Add normalization method and show effect on key protein estimates.",
    );
  }

  if (!quant.randomizedBatches || !quant.batchAdjusted) {
    addFinding(
      findings,
      "high",
      "batch-control-gap",
      "Batch randomization or adjustment evidence is incomplete.",
      `randomized=${Boolean(quant.randomizedBatches)}, adjusted=${Boolean(quant.batchAdjusted)}`,
      "Provide batch design, bridge samples, and adjusted sensitivity analysis.",
    );
  }

  if (quant.method === "DIA" && !hasValue(quant.spectralLibrary)) {
    addFinding(
      findings,
      "high",
      "missing-dia-library",
      "DIA analysis lacks spectral library or library-free search evidence.",
      study.id,
      "Attach spectral library, library-free settings, or library construction manifest.",
    );
  }

  if (quant.qcCvPct > 20) {
    addFinding(
      findings,
      "medium",
      "high-qc-cv",
      "QC coefficient of variation is above the 20% review target.",
      `${quant.qcCvPct}%`,
      "Add QC trend plots and exclude unstable features or batches.",
    );
  }

  if (quant.missingnessPct > 30) {
    addFinding(
      findings,
      "high",
      "high-missingness",
      "Feature missingness is high enough to threaten claim stability.",
      `${quant.missingnessPct}%`,
      "Report missingness handling and run sensitivity analysis for key claims.",
    );
  }
}

function checkClaimSupport(study, findings) {
  const search = study.search || {};
  const claims = study.claims || [];

  for (const claim of claims) {
    if (claim.uniquePeptidesPerProtein < 2 || search.proteinInference !== "parsimonious-with-unique-peptides") {
      addFinding(
        findings,
        "high",
        "weak-protein-inference",
        "Protein-level claim relies on weak unique-peptide or inference evidence.",
        claim.id,
        "Require at least two unique peptides per claimed protein or qualify protein-group ambiguity.",
      );
    }

    if (claim.biomarkerClaim && !claim.validationCohort) {
      addFinding(
        findings,
        "high",
        "missing-validation-cohort",
        "Biomarker claim lacks independent validation cohort evidence.",
        claim.id,
        "Mark the finding as discovery-only or add validation cohort support.",
      );
    }

    if (claim.adjustedP > 0.01 && claim.biomarkerClaim) {
      addFinding(
        findings,
        "medium",
        "biomarker-effect-weak",
        "Biomarker claim has weak adjusted significance for reviewer-ready wording.",
        `${claim.id}: ${claim.adjustedP}`,
        "Calibrate claim wording and show correction method with confidence intervals.",
      );
    }

    if (claim.ptmClaim && (claim.ptmLocalizationProbability || 0) < 0.75) {
      addFinding(
        findings,
        "critical",
        "weak-ptm-localization",
        "PTM site claim lacks localization probability above 0.75.",
        `${claim.id}: ${claim.ptmLocalizationProbability}`,
        "Downgrade site-specific language or add site-localization evidence.",
      );
    }
  }
}

function checkReproducibility(study, findings) {
  const repro = study.reproducibility || {};

  if (repro.rawFileCount < repro.expectedRawFileCount) {
    addFinding(
      findings,
      "critical",
      "missing-raw-files",
      "Raw LC-MS/MS file count is lower than the sample manifest expects.",
      `${repro.rawFileCount}/${repro.expectedRawFileCount}`,
      "Block reviewer-ready status until raw files or documented exclusions are attached.",
    );
  }

  if (!hasValue(repro.publicRawAccession)) {
    addFinding(
      findings,
      "high",
      "missing-public-raw-accession",
      "No public or controlled-access raw data accession is included.",
      study.id,
      "Deposit raw data in a proteomics repository or document controlled-access route.",
    );
  }

  if (!hasValue(repro.workflowFile)) {
    addFinding(
      findings,
      "high",
      "missing-workflow-file",
      "No executable search or quantification workflow is listed.",
      study.id,
      "Attach workflow, scripts, and execution notes for reproducibility checking.",
    );
  }

  if (!hasValue(repro.lockfile)) {
    addFinding(
      findings,
      "medium",
      "missing-environment-lock",
      "Environment lockfile is missing.",
      study.id,
      "Add conda, container, lockfile, or versioned workflow environment evidence.",
    );
  }

  if (!repro.parameterManifest || !repro.resultChecksums) {
    addFinding(
      findings,
      "medium",
      "incomplete-reproducibility-manifest",
      "Parameter manifest or result checksums are incomplete.",
      study.id,
      "Attach search parameters and digest output tables for rerun comparison.",
    );
  }
}

function scoreFindings(findings) {
  const weights = { critical: 26, high: 14, medium: 6, low: 2 };
  const deduction = findings.reduce((sum, finding) => sum + (weights[finding.severity] || 4), 0);
  return Math.max(0, 100 - deduction);
}

function decisionFromFindings(findings) {
  const critical = findings.filter((finding) => finding.severity === "critical").length;
  const high = findings.filter((finding) => finding.severity === "high").length;

  if (critical > 0) return "block-reviewer-ready-status";
  if (high >= 2) return "major-revision-before-review";
  if (high === 1) return "targeted-revision-before-review";
  return "reviewer-ready";
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
    actions.push("Proceed to reviewer-ready peer-review packet with proteomics evidence attached.");
  }
  return Array.from(new Set(actions));
}

function reviewStudy(study) {
  const findings = [];

  checkSearchEvidence(study, findings);
  checkQuantification(study, findings);
  checkClaimSupport(study, findings);
  checkReproducibility(study, findings);

  return {
    studyId: study.id,
    title: study.title,
    manuscriptType: study.manuscriptType,
    decision: decisionFromFindings(findings),
    evidenceScore: scoreFindings(findings),
    severityCounts: severityCounts(findings),
    findingCount: findings.length,
    findings,
    actions: uniqueActions(findings),
  };
}

function reviewStudies(studies) {
  const results = studies.map(reviewStudy);
  const summary = {
    studiesReviewed: results.length,
    reviewerReady: results.filter((result) => result.decision === "reviewer-ready").length,
    targetedRevision: results.filter((result) => result.decision === "targeted-revision-before-review").length,
    majorRevision: results.filter((result) => result.decision === "major-revision-before-review").length,
    blocked: results.filter((result) => result.decision === "block-reviewer-ready-status").length,
    averageEvidenceScore: Math.round(results.reduce((sum, result) => sum + result.evidenceScore, 0) / results.length),
  };

  return {
    generatedAt: new Date("2026-05-28T00:00:00Z").toISOString(),
    requirementMap: [
      "Auto peer review reports: flags proteomics-specific claims that need reviewer attention.",
      "Claims versus evidence alignment: checks peptide/protein FDR, protein inference, PTM localization, and biomarker validation.",
      "Reproducibility checker: verifies raw files, workflow files, environment locks, parameter manifests, and result checksums.",
      "Adaptive domain template: specializes the assistant for LC-MS/MS, DIA, TMT, PTM, and biomarker manuscripts.",
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
    "# Proteomics Mass-Spectrometry Evidence Review",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    `- Studies reviewed: ${report.summary.studiesReviewed}`,
    `- Reviewer ready: ${report.summary.reviewerReady}`,
    `- Targeted revision: ${report.summary.targetedRevision}`,
    `- Major revision: ${report.summary.majorRevision}`,
    `- Blocked: ${report.summary.blocked}`,
    `- Average evidence score: ${report.summary.averageEvidenceScore}`,
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
    lines.push(`- Decision: ${result.decision}`);
    lines.push(`- Evidence score: ${result.evidenceScore}`);
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
  const width = 960;
  const height = 520;
  const bars = [
    { label: "Ready", value: report.summary.reviewerReady, color: "#2f9e44" },
    { label: "Targeted", value: report.summary.targetedRevision, color: "#1971c2" },
    { label: "Major", value: report.summary.majorRevision, color: "#f08c00" },
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
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<rect width="960" height="520" fill="#0b1020"/>',
    '<rect x="48" y="48" width="864" height="424" rx="8" fill="#151b2e" stroke="#334155"/>',
    '<text x="80" y="105" fill="#f8f9fa" font-size="34" font-family="Arial, sans-serif">Proteomics MS Evidence Assistant</text>',
    `<text x="80" y="145" fill="#adb5bd" font-size="20" font-family="Arial, sans-serif">Average evidence score: ${report.summary.averageEvidenceScore}</text>`,
    rows,
    '<text x="80" y="454" fill="#adb5bd" font-size="18" font-family="Arial, sans-serif">Synthetic LC-MS/MS reviewer packet; no credentials or external services.</text>',
    "</svg>",
  ].join("");
}

module.exports = {
  reviewStudy,
  reviewStudies,
  renderMarkdownReport,
  renderSvgReport,
};
