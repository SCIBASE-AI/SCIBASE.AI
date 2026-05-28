const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const RULES = {
  REFERENCE_BUILD_MISMATCH: {
    severity: "high",
    penalty: 14,
    recommendation: "Normalize every variant to the manuscript reference build and report any liftover or remapping evidence.",
  },
  TRANSCRIPT_EVIDENCE_GAP: {
    severity: "medium",
    penalty: 8,
    recommendation: "State the canonical transcript and ensure HGVS claims use a transcript named in the methods.",
  },
  HGVS_NOMENCLATURE_GAP: {
    severity: "medium",
    penalty: 8,
    recommendation: "Provide complete HGVS cDNA and protein nomenclature before the claim is reviewer-ready.",
  },
  POPULATION_FREQUENCY_CONFLICT: {
    severity: "high",
    penalty: 18,
    recommendation: "Downgrade pathogenicity language or explain why population frequency is compatible with disease prevalence and penetrance.",
  },
  CLINVAR_CONFLICT_UNRESOLVED: {
    severity: "high",
    penalty: 15,
    recommendation: "Add an adjudication note for ClinVar benign/conflicting evidence or revise the variant classification.",
  },
  SEGREGATION_UNDERPOWERED: {
    severity: "medium",
    penalty: 9,
    recommendation: "Treat segregation as supportive only after reporting informative meioses, LOD support, and unaffected-carrier checks.",
  },
  FUNCTIONAL_ASSAY_WEAK_SUPPORT: {
    severity: "medium",
    penalty: 9,
    recommendation: "Require replicated functional assays with positive and negative controls before using functional rescue language.",
  },
  ANCESTRY_COMPARISON_UNSUPPORTED: {
    severity: "medium",
    penalty: 7,
    recommendation: "Match ancestry or stratify frequency comparisons before presenting case-control enrichment as variant evidence.",
  },
  COMPUTATIONAL_ONLY_OVERCLAIM: {
    severity: "medium",
    penalty: 10,
    recommendation: "Replace pathogenic or causal language with candidate-variant language until orthogonal evidence is supplied.",
  },
  PHENOTYPE_MATCH_WEAK: {
    severity: "medium",
    penalty: 8,
    recommendation: "Add HPO-level phenotype support or soften the asserted genotype-phenotype match.",
  },
  REPRODUCIBILITY_EVIDENCE_GAP: {
    severity: "high",
    penalty: 14,
    recommendation: "Provide callset availability, validation method, pipeline version, and parameter digests for reviewer reproduction.",
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

function setOf(values) {
  return new Set(values || []);
}

function evidenceById(packet) {
  const byId = new Map();
  for (const evidence of packet.evidenceItems || []) byId.set(evidence.id, evidence);
  return byId;
}

function claimsForVariant(packet, variantId) {
  return (packet.claims || []).filter((claim) => claim.variantId === variantId);
}

function claimUsesStrongPathogenicLanguage(claim) {
  return (
    claim.strength === "pathogenic" ||
    /\b(pathogenic|disease-causing|causes?|causal|diagnostic|clinically actionable|monogenic driver)\b/i.test(claim.text || "")
  );
}

function claimUsesFamilyEvidence(claim) {
  return /\b(segregat|family|pedigree|meioses|lod)\b/i.test(claim.text || "");
}

function isFunctionalEvidence(evidence) {
  return evidence && ["functional_assay", "rescue_assay", "enzyme_assay", "splicing_assay"].includes(evidence.type);
}

function hasOrthogonalEvidence(claim, evidenceMap) {
  const evidence = (claim.evidenceIds || []).map((id) => evidenceMap.get(id)).filter(Boolean);
  return evidence.some((item) => ["segregation", "functional_assay", "rescue_assay", "enzyme_assay", "splicing_assay", "case_control_burden"].includes(item.type));
}

function auditReferenceBuild(packet, findings) {
  const methodBuild = packet.methods.referenceGenomeBuild;
  const methodTranscripts = setOf(packet.methods.transcripts);

  for (const variant of packet.variants || []) {
    if (!methodBuild || !variant.genomeBuild || variant.genomeBuild !== methodBuild) {
      addFinding(
        findings,
        "REFERENCE_BUILD_MISMATCH",
        `Variant ${variant.id} is not normalized to the manuscript reference build.`,
        {
          variantId: variant.id,
          methodBuild: methodBuild || null,
          variantBuild: variant.genomeBuild || null,
          coordinate: `${variant.chromosome || "?"}:${variant.position || "?"}${variant.reference || "?"}>${variant.alternate || "?"}`,
        },
      );
    }

    if (!variant.transcript || !methodTranscripts.has(variant.transcript)) {
      addFinding(
        findings,
        "TRANSCRIPT_EVIDENCE_GAP",
        `Variant ${variant.id} uses a transcript not declared in the methods.`,
        {
          variantId: variant.id,
          transcript: variant.transcript || null,
          methodTranscripts: packet.methods.transcripts || [],
        },
      );
    }
  }
}

function auditHgvs(packet, findings) {
  for (const variant of packet.variants || []) {
    const cdnaReady = typeof variant.hgvsCdna === "string" && /^c\.[A-Za-z0-9_*+>.\-]+$/.test(variant.hgvsCdna);
    const proteinReady = typeof variant.hgvsProtein === "string" && /^p\.[A-Za-z0-9_*?=().\-]+$/.test(variant.hgvsProtein);
    if (!cdnaReady || !proteinReady) {
      addFinding(
        findings,
        "HGVS_NOMENCLATURE_GAP",
        `Variant ${variant.id} has incomplete HGVS nomenclature.`,
        {
          variantId: variant.id,
          hgvsCdna: variant.hgvsCdna || null,
          hgvsProtein: variant.hgvsProtein || null,
          cdnaReady,
          proteinReady,
        },
      );
    }
  }
}

function auditPopulationFrequency(packet, findings) {
  const rareThreshold = packet.methods.rareDiseaseMaxAlleleFrequency || 0.01;
  for (const variant of packet.variants || []) {
    const strongClaims = claimsForVariant(packet, variant.id).filter(claimUsesStrongPathogenicLanguage);
    if (strongClaims.length === 0) continue;
    const maxFrequency = Math.max(
      Number(variant.populationFrequencies.gnomad || 0),
      Number(variant.populationFrequencies.ancestryMax || 0),
      Number(variant.populationFrequencies.localControl || 0),
    );
    if (maxFrequency > rareThreshold) {
      addFinding(
        findings,
        "POPULATION_FREQUENCY_CONFLICT",
        `Variant ${variant.id} exceeds the rare-disease allele frequency threshold used by the manuscript.`,
        {
          variantId: variant.id,
          maxFrequency,
          threshold: rareThreshold,
          claimIds: strongClaims.map((claim) => claim.id),
          frequencies: variant.populationFrequencies,
        },
      );
    }
  }
}

function auditClinVar(packet, findings) {
  for (const variant of packet.variants || []) {
    const strongClaims = claimsForVariant(packet, variant.id).filter(claimUsesStrongPathogenicLanguage);
    if (strongClaims.length === 0) continue;
    const clinvar = variant.clinVar || {};
    const classification = String(clinvar.classification || "").toLowerCase();
    const conflicting = Boolean(clinvar.conflictingSubmissions);
    const benignConflict = classification.includes("benign") || classification.includes("conflicting") || conflicting;
    if (benignConflict && !clinvar.adjudicationNote) {
      addFinding(
        findings,
        "CLINVAR_CONFLICT_UNRESOLVED",
        `Variant ${variant.id} has unresolved ClinVar evidence that conflicts with strong pathogenicity language.`,
        {
          variantId: variant.id,
          classification: clinvar.classification || null,
          reviewStatus: clinvar.reviewStatus || null,
          conflictingSubmissions: conflicting,
          claimIds: strongClaims.map((claim) => claim.id),
        },
      );
    }
  }
}

function auditSegregation(packet, findings) {
  for (const variant of packet.variants || []) {
    const familyClaims = claimsForVariant(packet, variant.id).filter((claim) => claimUsesStrongPathogenicLanguage(claim) && claimUsesFamilyEvidence(claim));
    if (familyClaims.length === 0) continue;
    const segregation = variant.segregation || {};
    const lodReady = Number(segregation.lodScore || 0) >= 3;
    const meiosesReady = Number(segregation.informativeMeioses || 0) >= 6;
    const unaffectedReady = Number(segregation.unaffectedCarriers || 0) === 0;
    if (!lodReady || !meiosesReady || !unaffectedReady) {
      addFinding(
        findings,
        "SEGREGATION_UNDERPOWERED",
        `Variant ${variant.id} is described with family segregation support, but the pedigree evidence is underpowered.`,
        {
          variantId: variant.id,
          lodScore: segregation.lodScore || 0,
          informativeMeioses: segregation.informativeMeioses || 0,
          unaffectedCarriers: segregation.unaffectedCarriers || 0,
          claimIds: familyClaims.map((claim) => claim.id),
        },
      );
    }
  }
}

function auditFunctionalAssays(packet, findings) {
  const evidenceMap = evidenceById(packet);
  for (const claim of packet.claims || []) {
    const functionalEvidence = (claim.evidenceIds || []).map((id) => evidenceMap.get(id)).filter(isFunctionalEvidence);
    for (const evidence of functionalEvidence) {
      const controlsReady = Boolean(evidence.positiveControl && evidence.negativeControl);
      const replicateReady = Number(evidence.replicates || 0) >= 3;
      const protocolReady = Boolean(evidence.validatedProtocol);
      if (!controlsReady || !replicateReady || !protocolReady) {
        addFinding(
          findings,
          "FUNCTIONAL_ASSAY_WEAK_SUPPORT",
          `Claim ${claim.id} relies on functional evidence that is not reviewer-ready.`,
          {
            claimId: claim.id,
            evidenceId: evidence.id,
            assayType: evidence.type,
            positiveControl: Boolean(evidence.positiveControl),
            negativeControl: Boolean(evidence.negativeControl),
            replicates: evidence.replicates || 0,
            validatedProtocol: Boolean(evidence.validatedProtocol),
          },
        );
      }
    }
  }
}

function auditAncestryComparisons(packet, findings) {
  for (const comparison of packet.caseControlComparisons || []) {
    if (!comparison.ancestryMatched || !comparison.stratifiedAnalysis) {
      addFinding(
        findings,
        "ANCESTRY_COMPARISON_UNSUPPORTED",
        `Comparison ${comparison.id} uses frequency enrichment without ancestry-matched support.`,
        {
          comparisonId: comparison.id,
          variantId: comparison.variantId,
          ancestryMatched: Boolean(comparison.ancestryMatched),
          stratifiedAnalysis: Boolean(comparison.stratifiedAnalysis),
          cases: comparison.cases,
          controls: comparison.controls,
        },
      );
    }
  }
}

function auditComputationalOnlyClaims(packet, findings) {
  const evidenceMap = evidenceById(packet);
  for (const claim of packet.claims || []) {
    if (!claimUsesStrongPathogenicLanguage(claim)) continue;
    const evidence = (claim.evidenceIds || []).map((id) => evidenceMap.get(id)).filter(Boolean);
    const onlyComputational = evidence.length > 0 && evidence.every((item) => ["in_silico", "conservation", "prediction"].includes(item.type));
    if (onlyComputational || !hasOrthogonalEvidence(claim, evidenceMap)) {
      addFinding(
        findings,
        "COMPUTATIONAL_ONLY_OVERCLAIM",
        `Claim ${claim.id} uses strong pathogenicity language without orthogonal variant evidence.`,
        {
          claimId: claim.id,
          variantId: claim.variantId,
          evidenceTypes: evidence.map((item) => item.type),
          text: claim.text,
        },
      );
    }
  }
}

function auditPhenotypeMatch(packet, findings) {
  for (const variant of packet.variants || []) {
    const strongClaims = claimsForVariant(packet, variant.id).filter(claimUsesStrongPathogenicLanguage);
    if (strongClaims.length === 0) continue;
    const overlap = Number((variant.phenotype || {}).hpoOverlap || 0);
    if (overlap < 0.5) {
      addFinding(
        findings,
        "PHENOTYPE_MATCH_WEAK",
        `Variant ${variant.id} is claimed as disease-relevant with weak phenotype overlap.`,
        {
          variantId: variant.id,
          hpoOverlap: overlap,
          expectedThreshold: 0.5,
          assertedPhenotype: (variant.phenotype || {}).assertedPhenotype || null,
          claimIds: strongClaims.map((claim) => claim.id),
        },
      );
    }
  }
}

function auditReproducibility(packet, findings) {
  for (const variant of packet.variants || []) {
    const callset = variant.callset || {};
    const gaps = [];
    if (!callset.vcfAvailable) gaps.push("vcf");
    if (!callset.pipelineVersion) gaps.push("pipelineVersion");
    if (!callset.parameterDigest) gaps.push("parameterDigest");
    if (!callset.validationMethod) gaps.push("validationMethod");
    if (Number(callset.readDepthMedian || 0) < 20) gaps.push("readDepthMedian");
    if (gaps.length > 0) {
      addFinding(
        findings,
        "REPRODUCIBILITY_EVIDENCE_GAP",
        `Variant ${variant.id} is missing callset reproducibility evidence.`,
        {
          variantId: variant.id,
          missingOrWeakFields: gaps,
          vcfAvailable: Boolean(callset.vcfAvailable),
          pipelineVersion: callset.pipelineVersion || null,
          parameterDigest: callset.parameterDigest || null,
          validationMethod: callset.validationMethod || null,
          readDepthMedian: callset.readDepthMedian || null,
        },
      );
    }
  }
}

function summarize(findings) {
  const severityCounts = { high: 0, medium: 0, low: 0 };
  for (const finding of findings) severityCounts[finding.severity] += 1;
  const penalty = findings.reduce((sum, finding) => sum + finding.penalty, 0);
  const riskScore = Math.min(100, penalty);
  let decision = "variant-evidence-ready";
  if (severityCounts.high > 0 || riskScore >= 55) decision = "hold-pathogenicity-claim";
  else if (severityCounts.medium > 0) decision = "needs-genetics-review";
  return { severityCounts, riskScore, decision };
}

function auditGenomicVariantEvidence(packet, options = {}) {
  if (!packet || typeof packet !== "object") throw new TypeError("packet must be an object");
  const normalized = {
    variants: [],
    claims: [],
    evidenceItems: [],
    caseControlComparisons: [],
    methods: {
      referenceGenomeBuild: null,
      transcripts: [],
      rareDiseaseMaxAlleleFrequency: 0.01,
    },
    ...packet,
  };
  normalized.methods = {
    referenceGenomeBuild: null,
    transcripts: [],
    rareDiseaseMaxAlleleFrequency: 0.01,
    ...(packet.methods || {}),
  };

  const findings = [];
  auditReferenceBuild(normalized, findings);
  auditHgvs(normalized, findings);
  auditPopulationFrequency(normalized, findings);
  auditClinVar(normalized, findings);
  auditSegregation(normalized, findings);
  auditFunctionalAssays(normalized, findings);
  auditAncestryComparisons(normalized, findings);
  auditComputationalOnlyClaims(normalized, findings);
  auditPhenotypeMatch(normalized, findings);
  auditReproducibility(normalized, findings);

  const summary = summarize(findings);
  const evidenceDigest = digest({
    studyId: normalized.studyId,
    methods: normalized.methods,
    variants: normalized.variants,
    claims: normalized.claims,
    findings,
  });

  return {
    studyId: normalized.studyId,
    title: normalized.title,
    generatedAt: options.now || "2026-05-28T21:15:00.000Z",
    decision: summary.decision,
    riskScore: summary.riskScore,
    severityCounts: summary.severityCounts,
    findingCount: findings.length,
    evidenceDigest,
    summary: {
      variants: normalized.variants.length,
      claims: normalized.claims.length,
      evidenceItems: normalized.evidenceItems.length,
      caseControlComparisons: normalized.caseControlComparisons.length,
      referenceGenomeBuild: normalized.methods.referenceGenomeBuild,
      transcripts: normalized.methods.transcripts.length,
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
    "# Genomic Variant Evidence Review",
    "",
    `Study: ${report.title || report.studyId}`,
    `Decision: ${report.decision}`,
    `Risk score: ${report.riskScore}/100`,
    `Evidence digest: ${report.evidenceDigest}`,
    "",
    "## Scope",
    "",
    `Variants: ${report.summary.variants}`,
    `Claims: ${report.summary.claims}`,
    `Evidence items: ${report.summary.evidenceItems}`,
    `Case-control comparisons: ${report.summary.caseControlComparisons}`,
    `Reference build: ${report.summary.referenceGenomeBuild || "not declared"}`,
    `Declared transcripts: ${report.summary.transcripts}`,
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
  const color = report.decision === "variant-evidence-ready" ? "#168a4a" : report.decision === "needs-genetics-review" ? "#b7791f" : "#b91c1c";
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
  <text x="72" y="98" fill="#0f172a" font-family="Arial, sans-serif" font-size="34" font-weight="700">Genomic Variant Evidence Assistant</text>
  <text x="72" y="140" fill="#475569" font-family="Arial, sans-serif" font-size="22">${escapeXml(report.title || report.studyId)}</text>
  <text x="72" y="198" fill="${color}" font-family="Arial, sans-serif" font-size="32" font-weight="700">${escapeXml(report.decision)}</text>
  <text x="72" y="242" fill="#334155" font-family="Arial, sans-serif" font-size="22">Risk ${report.riskScore}/100 · findings ${
    report.findingCount
  } · digest ${escapeXml(report.evidenceDigest)}</text>
  <rect x="72" y="270" width="560" height="24" rx="12" fill="#e2e8f0"/>
  <rect x="72" y="270" width="${riskWidth}" height="24" rx="12" fill="${color}"/>
  <text x="72" y="324" fill="#0f172a" font-family="Arial, sans-serif" font-size="24" font-weight="700">Top findings</text>
  ${findingRows}
  <text x="72" y="642" fill="#64748b" font-family="Arial, sans-serif" font-size="18">Synthetic variant packet only. No private genomic data, external APIs, patients, or model services.</text>
</svg>
`;
}

function writeAuditReports(report, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, "genomic-variant-evidence-review.json");
  const markdownPath = path.join(outputDir, "genomic-variant-evidence-review.md");
  const svgPath = path.join(outputDir, "genomic-variant-evidence-summary.svg");
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, createMarkdownReport(report));
  fs.writeFileSync(svgPath, createSummarySvg(report));
  return { jsonPath, markdownPath, svgPath };
}

module.exports = {
  RULES,
  auditGenomicVariantEvidence,
  createMarkdownReport,
  createSummarySvg,
  digest,
  stableStringify,
  writeAuditReports,
};
