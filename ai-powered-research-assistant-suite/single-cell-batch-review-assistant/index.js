const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const RULES = {
  BATCH_CONFOUNDED_DESIGN: {
    severity: "high",
    penalty: 17,
    recommendation: "Balance condition across batches or add a limitation and batch-aware sensitivity analysis.",
  },
  DONOR_REPLICATION_GAP: {
    severity: "high",
    penalty: 16,
    recommendation: "Use donor-level replication or pseudobulk models before claiming group-level biology.",
  },
  DOUBLET_BURDEN_UNRESOLVED: {
    severity: "medium",
    penalty: 8,
    recommendation: "Run doublet detection and report removal thresholds before interpreting rare clusters.",
  },
  CELL_TYPE_MARKER_WEAK: {
    severity: "medium",
    penalty: 8,
    recommendation: "Support annotations with canonical markers, negative markers, and ambiguity notes.",
  },
  INTEGRATION_OVERCORRECTION_RISK: {
    severity: "medium",
    penalty: 9,
    recommendation: "Avoid testing differential expression on over-integrated expression values without condition-preservation diagnostics.",
  },
  QC_THRESHOLD_GAP: {
    severity: "medium",
    penalty: 7,
    recommendation: "Report mitochondrial, ribosomal, UMI, gene-count, and minimum-cell filters for every sample.",
  },
  AMBIENT_RNA_UNCORRECTED: {
    severity: "medium",
    penalty: 8,
    recommendation: "Correct or quantify ambient RNA contamination before assigning marker-driven clusters.",
  },
  CLUSTER_STABILITY_GAP: {
    severity: "medium",
    penalty: 7,
    recommendation: "Add resolution sensitivity, bootstrap, or cross-donor stability checks for highlighted clusters.",
  },
  DE_OVERCLAIM_UNSUPPORTED: {
    severity: "high",
    penalty: 15,
    recommendation: "Downgrade differential-expression claims until donor-replicated models, FDR control, and effect sizes agree.",
  },
  REPRODUCIBILITY_EVIDENCE_GAP: {
    severity: "high",
    penalty: 13,
    recommendation: "Provide raw matrix accessions, analysis code, random seeds, package versions, and parameter digests.",
  },
};

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

function evidenceById(packet) {
  const byId = new Map();
  for (const evidence of packet.evidenceItems || []) byId.set(evidence.id, evidence);
  return byId;
}

function strongBiologyClaim(claim) {
  return (
    claim.strength === "strong" ||
    /\b(drives?|causes?|defines?|specific|exclusive|therapeutic target|novel pathogenic|differentially expressed)\b/i.test(claim.text || "")
  );
}

function auditBatchDesign(packet, findings) {
  for (const batch of packet.batchDesign || []) {
    const conditionCounts = batch.conditionCounts || {};
    const conditions = Object.keys(conditionCounts).filter((condition) => conditionCounts[condition] > 0);
    const total = Object.values(conditionCounts).reduce((sum, count) => sum + Number(count || 0), 0);
    const maxShare = total > 0 ? Math.max(...Object.values(conditionCounts).map((count) => Number(count || 0))) / total : 0;
    if (conditions.length < 2 || maxShare >= 0.85 || Number(batch.conditionAssociation || 0) >= 0.8) {
      addFinding(
        findings,
        "BATCH_CONFOUNDED_DESIGN",
        `Batch ${batch.id} is strongly confounded with biological condition.`,
        {
          batchId: batch.id,
          variable: batch.variable,
          conditionCounts,
          maxShare,
          conditionAssociation: batch.conditionAssociation || null,
          affectedSamples: batch.sampleIds || [],
        },
      );
    }
  }
}

function auditDonorReplication(packet, findings) {
  const donorsByCondition = packet.experimentalDesign.donorsByCondition || {};
  const minDonors = Math.min(...Object.values(donorsByCondition).map((value) => Number(value || 0)));
  const analysis = packet.analysisPlan || {};
  if (minDonors < 3 || analysis.deModel === "cell_level_wilcoxon" || !analysis.usesPseudobulk) {
    addFinding(
      findings,
      "DONOR_REPLICATION_GAP",
      "Differential expression is not supported by donor-level replication.",
      {
        donorsByCondition,
        minDonors,
        deModel: analysis.deModel || null,
        usesPseudobulk: Boolean(analysis.usesPseudobulk),
        randomEffect: analysis.randomEffect || null,
      },
    );
  }
}

function auditDoublets(packet, findings) {
  for (const sample of packet.samples || []) {
    if (!sample.doubletDetectionRun || Number(sample.doubletRate || 0) > 0.08) {
      addFinding(
        findings,
        "DOUBLET_BURDEN_UNRESOLVED",
        `Sample ${sample.id} has unresolved doublet risk.`,
        {
          sampleId: sample.id,
          condition: sample.condition,
          doubletDetectionRun: Boolean(sample.doubletDetectionRun),
          doubletRate: sample.doubletRate || null,
          cells: sample.cells,
        },
      );
    }
  }
}

function auditCellTypeMarkers(packet, findings) {
  for (const annotation of packet.cellTypeAnnotations || []) {
    const positiveMarkers = Number(annotation.positiveMarkerSupport || 0);
    const negativeMarkers = Number(annotation.negativeMarkerSupport || 0);
    if (positiveMarkers < 0.65 || negativeMarkers < 0.5 || annotation.ambiguousLabel) {
      addFinding(
        findings,
        "CELL_TYPE_MARKER_WEAK",
        `Cell type label ${annotation.label} has weak marker support.`,
        {
          clusterId: annotation.clusterId,
          label: annotation.label,
          positiveMarkerSupport: positiveMarkers,
          negativeMarkerSupport: negativeMarkers,
          ambiguousLabel: Boolean(annotation.ambiguousLabel),
          topMarkers: annotation.topMarkers || [],
        },
      );
    }
  }
}

function auditIntegration(packet, findings) {
  const integration = packet.integration || {};
  if (integration.used && integration.expressionUsedForDE && (!integration.conditionPreservationDiagnostic || Number(integration.silhouetteDelta || 0) < -0.2)) {
    addFinding(
      findings,
      "INTEGRATION_OVERCORRECTION_RISK",
      "Integrated expression is used for differential expression without condition-preservation support.",
      {
        method: integration.method,
        expressionUsedForDE: Boolean(integration.expressionUsedForDE),
        conditionPreservationDiagnostic: Boolean(integration.conditionPreservationDiagnostic),
        silhouetteDelta: integration.silhouetteDelta || null,
      },
    );
  }
}

function auditQc(packet, findings) {
  const qc = packet.qualityControl || {};
  const required = ["mitochondrialMax", "ribosomalMax", "minGenes", "maxGenes", "minUmi", "minCellsPerSample"];
  const missing = required.filter((field) => qc[field] === undefined || qc[field] === null);
  if (missing.length > 0) {
    addFinding(
      findings,
      "QC_THRESHOLD_GAP",
      "Single-cell QC thresholds are incomplete.",
      {
        missingFields: missing,
        suppliedFields: Object.keys(qc).sort(),
      },
    );
  }
}

function auditAmbientRna(packet, findings) {
  const ambient = packet.ambientRna || {};
  if (Number(ambient.estimatedContamination || 0) > 0.08 && !ambient.correctionRun) {
    addFinding(
      findings,
      "AMBIENT_RNA_UNCORRECTED",
      "Ambient RNA contamination is above threshold without correction evidence.",
      {
        estimatedContamination: ambient.estimatedContamination,
        correctionRun: Boolean(ambient.correctionRun),
        affectedMarkers: ambient.affectedMarkers || [],
      },
    );
  }
}

function auditClusterStability(packet, findings) {
  for (const cluster of packet.clusterStability || []) {
    if (Number(cluster.bootstrapJaccard || 0) < 0.6 || Number(cluster.resolutionConsistency || 0) < 0.65) {
      addFinding(
        findings,
        "CLUSTER_STABILITY_GAP",
        `Highlighted cluster ${cluster.clusterId} is not stable across checks.`,
        {
          clusterId: cluster.clusterId,
          label: cluster.label,
          bootstrapJaccard: cluster.bootstrapJaccard || 0,
          resolutionConsistency: cluster.resolutionConsistency || 0,
        },
      );
    }
  }
}

function auditDifferentialExpressionClaims(packet, findings) {
  const evidenceMap = evidenceById(packet);
  const analysis = packet.analysisPlan || {};
  for (const claim of packet.claims || []) {
    if (!strongBiologyClaim(claim)) continue;
    const evidence = (claim.evidenceIds || []).map((id) => evidenceMap.get(id)).filter(Boolean);
    const hasDonorModel = evidence.some((item) => item.type === "pseudobulk_de" && item.fdr <= 0.05 && Math.abs(item.logFoldChange || 0) >= 0.25);
    if (!hasDonorModel || !analysis.usesPseudobulk || analysis.deModel === "cell_level_wilcoxon") {
      addFinding(
        findings,
        "DE_OVERCLAIM_UNSUPPORTED",
        `Claim ${claim.id} overstates differential expression evidence.`,
        {
          claimId: claim.id,
          text: claim.text,
          evidenceTypes: evidence.map((item) => item.type),
          usesPseudobulk: Boolean(analysis.usesPseudobulk),
          deModel: analysis.deModel || null,
          hasDonorModel,
        },
      );
    }
  }
}

function auditReproducibility(packet, findings) {
  const reproducibility = packet.reproducibility || {};
  const missing = [];
  if (!reproducibility.rawMatrixAccession) missing.push("rawMatrixAccession");
  if (!reproducibility.analysisCodeAvailable) missing.push("analysisCodeAvailable");
  if (!reproducibility.pipelineVersion) missing.push("pipelineVersion");
  if (!reproducibility.randomSeed) missing.push("randomSeed");
  if (!reproducibility.parameterDigest) missing.push("parameterDigest");
  if (!reproducibility.packageLockDigest) missing.push("packageLockDigest");
  if (missing.length > 0) {
    addFinding(
      findings,
      "REPRODUCIBILITY_EVIDENCE_GAP",
      "Single-cell analysis reproducibility evidence is incomplete.",
      {
        missingFields: missing,
        rawMatrixAccession: reproducibility.rawMatrixAccession || null,
        pipelineVersion: reproducibility.pipelineVersion || null,
        randomSeed: reproducibility.randomSeed || null,
      },
    );
  }
}

function summarize(findings) {
  const severityCounts = { high: 0, medium: 0, low: 0 };
  for (const finding of findings) severityCounts[finding.severity] += 1;
  const penalty = findings.reduce((sum, finding) => sum + finding.penalty, 0);
  const riskScore = Math.min(100, penalty);
  let decision = "single-cell-claims-ready";
  if (severityCounts.high > 0 || riskScore >= 55) decision = "hold-cell-state-claims";
  else if (severityCounts.medium > 0) decision = "needs-omics-methods-review";
  return { severityCounts, riskScore, decision };
}

function auditSingleCellBatchEffects(packet, options = {}) {
  if (!packet || typeof packet !== "object") throw new TypeError("packet must be an object");
  const normalized = {
    samples: [],
    batchDesign: [],
    cellTypeAnnotations: [],
    clusterStability: [],
    claims: [],
    evidenceItems: [],
    experimentalDesign: { donorsByCondition: {} },
    analysisPlan: {},
    integration: {},
    qualityControl: {},
    ambientRna: {},
    reproducibility: {},
    ...packet,
  };
  const findings = [];

  auditBatchDesign(normalized, findings);
  auditDonorReplication(normalized, findings);
  auditDoublets(normalized, findings);
  auditCellTypeMarkers(normalized, findings);
  auditIntegration(normalized, findings);
  auditQc(normalized, findings);
  auditAmbientRna(normalized, findings);
  auditClusterStability(normalized, findings);
  auditDifferentialExpressionClaims(normalized, findings);
  auditReproducibility(normalized, findings);

  const summary = summarize(findings);
  const evidenceDigest = digest({
    studyId: normalized.studyId,
    samples: normalized.samples,
    batchDesign: normalized.batchDesign,
    claims: normalized.claims,
    analysisPlan: normalized.analysisPlan,
    findings,
  });

  return {
    studyId: normalized.studyId,
    title: normalized.title,
    generatedAt: options.now || "2026-05-28T21:45:00.000Z",
    decision: summary.decision,
    riskScore: summary.riskScore,
    severityCounts: summary.severityCounts,
    findingCount: findings.length,
    evidenceDigest,
    summary: {
      samples: normalized.samples.length,
      cells: normalized.samples.reduce((sum, sample) => sum + Number(sample.cells || 0), 0),
      claims: normalized.claims.length,
      evidenceItems: normalized.evidenceItems.length,
      annotations: normalized.cellTypeAnnotations.length,
      clusters: normalized.clusterStability.length,
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
    "# Single-Cell Batch Review",
    "",
    `Study: ${report.title || report.studyId}`,
    `Decision: ${report.decision}`,
    `Risk score: ${report.riskScore}/100`,
    `Evidence digest: ${report.evidenceDigest}`,
    "",
    "## Scope",
    "",
    `Samples: ${report.summary.samples}`,
    `Cells: ${report.summary.cells}`,
    `Claims: ${report.summary.claims}`,
    `Evidence items: ${report.summary.evidenceItems}`,
    `Cell-type annotations: ${report.summary.annotations}`,
    `Cluster checks: ${report.summary.clusters}`,
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
  const color = report.decision === "single-cell-claims-ready" ? "#168a4a" : report.decision === "needs-omics-methods-review" ? "#b7791f" : "#b91c1c";
  const findingRows = report.findings
    .slice(0, 6)
    .map(
      (finding, index) =>
        `<text x="72" y="${342 + index * 34}" fill="#334155" font-family="Arial, sans-serif" font-size="19">${escapeXml(
          finding.code,
        )}: ${escapeXml(finding.message).slice(0, 94)}</text>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#f8fafc"/>
  <rect x="48" y="44" width="1184" height="632" rx="18" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="72" y="98" fill="#0f172a" font-family="Arial, sans-serif" font-size="34" font-weight="700">Single-Cell Batch Review Assistant</text>
  <text x="72" y="140" fill="#475569" font-family="Arial, sans-serif" font-size="22">${escapeXml(report.title || report.studyId)}</text>
  <text x="72" y="198" fill="${color}" font-family="Arial, sans-serif" font-size="32" font-weight="700">${escapeXml(report.decision)}</text>
  <text x="72" y="242" fill="#334155" font-family="Arial, sans-serif" font-size="22">Risk ${report.riskScore}/100 · findings ${
    report.findingCount
  } · digest ${escapeXml(report.evidenceDigest)}</text>
  <rect x="72" y="270" width="560" height="24" rx="12" fill="#e2e8f0"/>
  <rect x="72" y="270" width="${riskWidth}" height="24" rx="12" fill="${color}"/>
  <text x="72" y="324" fill="#0f172a" font-family="Arial, sans-serif" font-size="24" font-weight="700">Top findings</text>
  ${findingRows}
  <text x="72" y="642" fill="#64748b" font-family="Arial, sans-serif" font-size="18">Synthetic single-cell packet only. No private omics data, external APIs, patients, or model services.</text>
</svg>
`;
}

function writeAuditReports(report, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, "single-cell-batch-review.json");
  const markdownPath = path.join(outputDir, "single-cell-batch-review.md");
  const svgPath = path.join(outputDir, "single-cell-batch-summary.svg");
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, createMarkdownReport(report));
  fs.writeFileSync(svgPath, createSummarySvg(report));
  return { jsonPath, markdownPath, svgPath };
}

module.exports = {
  RULES,
  auditSingleCellBatchEffects,
  createMarkdownReport,
  createSummarySvg,
  digest,
  stableStringify,
  writeAuditReports,
};
