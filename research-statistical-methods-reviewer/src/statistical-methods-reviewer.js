"use strict";

const crypto = require("node:crypto");

const DEFAULT_SECRET = "scibase-statistical-methods-reviewer-demo-secret";

function evaluateReviewDocket(docket, options = {}) {
  if (!docket || typeof docket !== "object") {
    throw new Error("A statistical review docket object is required.");
  }

  const manuscripts = (docket.manuscripts || []).map((manuscript) =>
    evaluateManuscript(manuscript, {
      asOf: docket.asOf,
      secret: options.secret || DEFAULT_SECRET
    })
  );
  const summary = summarizeManuscripts(manuscripts);

  return {
    schemaVersion: "2026-05-16.research-statistical-methods-reviewer.v1",
    asOf: docket.asOf,
    summary,
    manuscripts,
    signedReviewPackets: manuscripts.map((manuscript) =>
      signReviewPacket(
        {
          type: "research_assistant.statistical_review.evaluated",
          asOf: docket.asOf,
          manuscriptId: manuscript.manuscriptId,
          reviewStatus: manuscript.reviewStatus,
          blockerCount: manuscript.actionCounts.blocker,
          reviewCount: manuscript.actionCounts.review,
          rigorScore: manuscript.rigorScore
        },
        options.secret || DEFAULT_SECRET
      )
    )
  };
}

function evaluateManuscript(manuscript, options = {}) {
  if (!manuscript || typeof manuscript !== "object") {
    throw new Error("A manuscript object is required.");
  }

  const artifactIndex = indexBy(manuscript.artifacts || [], "artifactId");
  const analysisIndex = indexBy(manuscript.analyses || [], "analysisId");
  const findings = buildFindings(manuscript, analysisIndex, artifactIndex);
  const actionCounts = countFindings(findings);
  const reviewStatus = decideReviewStatus(actionCounts);
  const claimCoverage = buildClaimCoverage(manuscript.claims || [], analysisIndex, artifactIndex);
  const analysisSummaries = (manuscript.analyses || []).map((analysis) => summarizeAnalysis(analysis));
  const rigorScore = calculateRigorScore(manuscript, findings);

  return {
    manuscriptId: manuscript.manuscriptId,
    title: manuscript.title,
    domain: manuscript.domain,
    reviewStatus,
    rigorScore,
    actionCounts,
    claimCoverage,
    analysisSummaries,
    findings,
    reviewerPacket: buildReviewerPacket(manuscript, findings, claimCoverage, rigorScore),
    auditDigest: digest({
      manuscriptId: manuscript.manuscriptId,
      reviewStatus,
      rigorScore,
      findings,
      claimCoverage
    }),
    signedAt: options.asOf || null
  };
}

function buildFindings(manuscript, analysisIndex, artifactIndex) {
  const findings = [
    ...assessClaimMapping(manuscript.claims || [], analysisIndex, artifactIndex),
    ...assessProtocolCoverage(manuscript.protocol || {}, manuscript.analyses || []),
    ...(manuscript.analyses || []).flatMap((analysis) => [
      ...assessTestChoice(analysis),
      ...assessPower(analysis),
      ...assessMultiplicity(analysis),
      ...assessPValuePattern(analysis),
      ...assessReproducibility(analysis),
      ...assessAssumptions(analysis),
      ...assessDataHandling(analysis)
    ]),
    ...assessArtifactEvidence(manuscript.artifacts || [])
  ];

  return findings.sort((left, right) => severityRank(left.severity) - severityRank(right.severity) || left.scope.localeCompare(right.scope));
}

function assessClaimMapping(claims, analysisIndex, artifactIndex) {
  const findings = [];

  for (const claim of claims) {
    if (!claim.analysisId || !analysisIndex.has(claim.analysisId)) {
      findings.push(
        blocker(
          "claim-analysis-map",
          claim.claimId,
          `Claim ${claim.claimId} is not linked to an available statistical analysis`,
          "Link each manuscript claim to a concrete analysis before release."
        )
      );
    }

    if (!claim.evidenceArtifactIds || claim.evidenceArtifactIds.length === 0) {
      findings.push(
        blocker(
          "claim-evidence",
          claim.claimId,
          `Claim ${claim.claimId} has no evidence artifacts`,
          "Attach raw data, analysis code, or derived tables that support the claim."
        )
      );
      continue;
    }

    const missingEvidence = claim.evidenceArtifactIds.filter((artifactId) => !artifactIndex.has(artifactId) || !artifactIndex.get(artifactId).available);
    if (missingEvidence.length > 0) {
      findings.push(
        blocker(
          "claim-evidence",
          claim.claimId,
          `Claim ${claim.claimId} references unavailable evidence: ${missingEvidence.join(", ")}`,
          "Publish or replace missing evidence artifacts before review."
        )
      );
    }
  }

  return findings;
}

function assessProtocolCoverage(protocol, analyses) {
  const planned = new Set(protocol.plannedAnalysisIds || []);
  const findings = [];

  for (const analysis of analyses) {
    if (!analysis.preregistered && analysis.pValue < analysis.alpha && !planned.has(analysis.analysisId)) {
      findings.push(
        review(
          "protocol-drift",
          analysis.analysisId,
          `${analysis.analysisId} reports a significant non-preregistered result`,
          "Label the result as exploratory or provide a protocol amendment with timestamped rationale."
        )
      );
    }
  }

  return findings;
}

function assessTestChoice(analysis) {
  const findings = [];
  const test = normalizeToken(analysis.test);
  const design = normalizeToken(analysis.dataDesign);
  const outcome = normalizeToken(analysis.outcomeType);

  if (design === "repeated_measures" && !["mixed_effects_model", "repeated_measures_anova", "paired_t_test"].includes(test)) {
    findings.push(
      blocker(
        "test-choice",
        analysis.analysisId,
        `${analysis.analysisId} uses ${analysis.test} for repeated-measures data`,
        "Use a paired, repeated-measures, or mixed-effects model that respects within-subject dependence."
      )
    );
  }

  if (design === "longitudinal" && !["linear_model", "mixed_effects_model", "time_series_model"].includes(test)) {
    findings.push(
      blocker(
        "test-choice",
        analysis.analysisId,
        `${analysis.analysisId} uses ${analysis.test} for longitudinal data`,
        "Use a longitudinal model and document autocorrelation handling."
      )
    );
  }

  if (outcome === "categorical" && !["chi_square", "fisher_exact", "logistic_regression"].includes(test)) {
    findings.push(
      review(
        "test-choice",
        analysis.analysisId,
        `${analysis.analysisId} may not match a categorical outcome`,
        "Confirm the selected test is appropriate for categorical response data."
      )
    );
  }

  if (outcome === "continuous" && analysis.groups > 2 && ["t_test", "welch_t_test", "paired_t_test"].includes(test)) {
    findings.push(
      review(
        "test-choice",
        analysis.analysisId,
        `${analysis.analysisId} compares more than two groups with a two-group test`,
        "Use ANOVA, regression contrasts, or a planned pairwise-comparison strategy."
      )
    );
  }

  return findings;
}

function assessPower(analysis) {
  const findings = [];

  if (analysis.sampleSize < 30) {
    findings.push(
      blocker(
        "sample-size",
        analysis.analysisId,
        `${analysis.analysisId} has only ${analysis.sampleSize} samples`,
        "Provide a sample-size justification, exact-test plan, or independent validation cohort."
      )
    );
  }

  if (typeof analysis.power === "number" && analysis.power < 0.6) {
    findings.push(
      blocker(
        "power",
        analysis.analysisId,
        `${analysis.analysisId} has very low estimated power (${formatPercent(analysis.power)})`,
        "Increase sample size, narrow the claim, or mark the finding as exploratory."
      )
    );
  } else if (typeof analysis.power === "number" && analysis.power < 0.8) {
    findings.push(
      review(
        "power",
        analysis.analysisId,
        `${analysis.analysisId} is below the 80% power target (${formatPercent(analysis.power)})`,
        "Add a power note and sensitivity analysis for the claimed effect size."
      )
    );
  }

  return findings;
}

function assessMultiplicity(analysis) {
  if (analysis.comparisons <= 1) {
    return [];
  }

  const correction = normalizeToken(analysis.correction || "none");
  if (correction !== "none") {
    return [];
  }

  const message = `${analysis.analysisId} runs ${analysis.comparisons} comparisons without multiplicity correction`;
  if (analysis.comparisons >= 10) {
    return [
      blocker(
        "multiple-comparisons",
        analysis.analysisId,
        message,
        "Apply FDR, Holm, Bonferroni, or a registered family-wise testing plan."
      )
    ];
  }

  return [
    review(
      "multiple-comparisons",
      analysis.analysisId,
      message,
      "Document why no correction is needed for the tested family."
    )
  ];
}

function assessPValuePattern(analysis) {
  const findings = [];

  if (analysis.pValue >= 0.045 && analysis.pValue < analysis.alpha && !analysis.preregistered) {
    findings.push(
      review(
        "selective-reporting",
        analysis.analysisId,
        `${analysis.analysisId} has a just-significant p-value (${analysis.pValue}) without preregistration`,
        "Show all tested outcomes and the decision trail for analysis selection."
      )
    );
  }

  if (analysis.pValue < analysis.alpha && analysis.effectSize > 0.7 && analysis.sampleSize < 40) {
    findings.push(
      review(
        "effect-size-plausibility",
        analysis.analysisId,
        `${analysis.analysisId} reports a large effect from a small sample`,
        "Add uncertainty intervals and independent validation notes."
      )
    );
  }

  return findings;
}

function assessReproducibility(analysis) {
  const evidence = new Set(analysis.reproducibilityEvidence || []);
  const findings = [];

  if (!evidence.has("raw-data")) {
    findings.push(
      blocker(
        "reproducibility",
        analysis.analysisId,
        `${analysis.analysisId} is missing raw-data reproducibility evidence`,
        "Attach or document governed access to raw data before accepting the claim."
      )
    );
  }

  if (!evidence.has("script")) {
    findings.push(
      blocker(
        "reproducibility",
        analysis.analysisId,
        `${analysis.analysisId} is missing executable analysis code`,
        "Attach the analysis script or notebook used to generate reported statistics."
      )
    );
  }

  if (!evidence.has("environment")) {
    findings.push(
      review(
        "reproducibility",
        analysis.analysisId,
        `${analysis.analysisId} has no environment lockfile or runtime description`,
        "Add a package lock, container digest, or environment manifest."
      )
    );
  }

  if (!evidence.has("seed")) {
    findings.push(
      review(
        "reproducibility",
        analysis.analysisId,
        `${analysis.analysisId} does not record deterministic seeds`,
        "Record random seeds for bootstrapping, imputation, or model fitting."
      )
    );
  }

  return findings;
}

function assessAssumptions(analysis) {
  const checks = new Set((analysis.assumptionChecks || []).map(normalizeToken));
  const findings = [];
  const test = normalizeToken(analysis.test);
  const design = normalizeToken(analysis.dataDesign);

  if (["t_test", "welch_t_test", "paired_t_test"].includes(test) && analysis.sampleSize < 50 && !checks.has("normality")) {
    findings.push(
      review(
        "assumptions",
        analysis.analysisId,
        `${analysis.analysisId} lacks normality evidence for a small-sample t-test`,
        "Add normality diagnostics or switch to a robust/nonparametric analysis."
      )
    );
  }

  if (test === "linear_model" && !checks.has("residuals")) {
    findings.push(
      review(
        "assumptions",
        analysis.analysisId,
        `${analysis.analysisId} lacks residual diagnostics`,
        "Add residual, leverage, and influence diagnostics to the review packet."
      )
    );
  }

  if (design === "longitudinal" && !checks.has("autocorrelation")) {
    findings.push(
      review(
        "assumptions",
        analysis.analysisId,
        `${analysis.analysisId} lacks autocorrelation checks for longitudinal data`,
        "Document temporal dependence handling or robust standard errors."
      )
    );
  }

  return findings;
}

function assessDataHandling(analysis) {
  const findings = [];

  if (!analysis.missingDataPlan) {
    findings.push(
      review(
        "missing-data",
        analysis.analysisId,
        `${analysis.analysisId} has no missing-data plan`,
        "Define exclusion, imputation, or sensitivity-analysis handling."
      )
    );
  }

  if (!analysis.outlierPlan) {
    findings.push(
      review(
        "outlier-plan",
        analysis.analysisId,
        `${analysis.analysisId} has no outlier handling policy`,
        "Add a predefined outlier and influence-point policy."
      )
    );
  }

  return findings;
}

function assessArtifactEvidence(artifacts) {
  return artifacts
    .filter((artifact) => artifact.available && !artifact.contentHash)
    .map((artifact) =>
      review(
        "artifact-integrity",
        artifact.artifactId,
        `${artifact.artifactId} is available but has no content hash`,
        "Add a content hash so the statistical packet can be reproduced exactly."
      )
    );
}

function buildClaimCoverage(claims, analysisIndex, artifactIndex) {
  return claims.map((claim) => {
    const evidenceArtifacts = (claim.evidenceArtifactIds || []).map((artifactId) => {
      const artifact = artifactIndex.get(artifactId);
      return {
        artifactId,
        available: Boolean(artifact && artifact.available),
        hashed: Boolean(artifact && artifact.contentHash)
      };
    });

    return {
      claimId: claim.claimId,
      primary: Boolean(claim.primary),
      analysisId: claim.analysisId || null,
      hasAnalysis: Boolean(claim.analysisId && analysisIndex.has(claim.analysisId)),
      evidenceArtifacts,
      evidenceReady: evidenceArtifacts.length > 0 && evidenceArtifacts.every((artifact) => artifact.available && artifact.hashed)
    };
  });
}

function summarizeAnalysis(analysis) {
  return {
    analysisId: analysis.analysisId,
    test: analysis.test,
    preregistered: Boolean(analysis.preregistered),
    sampleSize: analysis.sampleSize,
    power: analysis.power,
    pValue: analysis.pValue,
    comparisons: analysis.comparisons,
    correction: analysis.correction || "none",
    reproducibilityEvidenceCount: (analysis.reproducibilityEvidence || []).length
  };
}

function buildReviewerPacket(manuscript, findings, claimCoverage, rigorScore) {
  const blockers = findings.filter((finding) => finding.severity === "blocker");
  const reviews = findings.filter((finding) => finding.severity === "review");

  return {
    title: manuscript.title,
    domain: manuscript.domain,
    recommendation: blockers.length > 0 ? "hold_release" : reviews.length > 0 ? "revise_before_submission" : "ready_for_editorial_review",
    topRisks: findings.slice(0, 5).map((finding) => ({
      severity: finding.severity,
      scope: finding.scope,
      target: finding.target,
      message: finding.message
    })),
    claimCoverage,
    requiredAuthorActions: findings.map((finding) => finding.remediation),
    rigorScore
  };
}

function calculateRigorScore(manuscript, findings) {
  const startingScore = 100;
  const blockerPenalty = findings.filter((finding) => finding.severity === "blocker").length * 15;
  const reviewPenalty = findings.filter((finding) => finding.severity === "review").length * 6;
  const preregisteredBonus = (manuscript.analyses || []).filter((analysis) => analysis.preregistered).length * 2;
  return Math.max(0, Math.min(100, startingScore - blockerPenalty - reviewPenalty + preregisteredBonus));
}

function summarizeManuscripts(manuscripts) {
  const counts = manuscripts.reduce(
    (accumulator, manuscript) => {
      accumulator.total += 1;
      accumulator[manuscript.reviewStatus] += 1;
      accumulator.blockers += manuscript.actionCounts.blocker;
      accumulator.reviews += manuscript.actionCounts.review;
      accumulator.averageRigorScore += manuscript.rigorScore;
      return accumulator;
    },
    {
      total: 0,
      ready: 0,
      needs_review: 0,
      blocked: 0,
      blockers: 0,
      reviews: 0,
      averageRigorScore: 0
    }
  );

  return {
    ...counts,
    averageRigorScore: counts.total ? Math.round(counts.averageRigorScore / counts.total) : 0
  };
}

function decideReviewStatus(actionCounts) {
  if (actionCounts.blocker > 0) {
    return "blocked";
  }

  if (actionCounts.review > 0) {
    return "needs_review";
  }

  return "ready";
}

function countFindings(findings) {
  return findings.reduce(
    (counts, finding) => {
      counts[finding.severity] += 1;
      return counts;
    },
    { blocker: 0, review: 0, note: 0 }
  );
}

function blocker(scope, target, message, remediation) {
  return finding("blocker", scope, target, message, remediation);
}

function review(scope, target, message, remediation) {
  return finding("review", scope, target, message, remediation);
}

function finding(severity, scope, target, message, remediation) {
  return {
    severity,
    scope,
    target,
    message,
    remediation
  };
}

function severityRank(severity) {
  return { blocker: 0, review: 1, note: 2 }[severity] || 3;
}

function indexBy(items, key) {
  return new Map(items.map((item) => [item[key], item]));
}

function normalizeToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function signReviewPacket(payload, secret = DEFAULT_SECRET) {
  const canonical = stableStringify(payload);
  const digestValue = digest(payload);
  const signature = crypto.createHmac("sha256", secret).update(canonical).digest("hex");

  return {
    payload,
    digest: digestValue,
    signature,
    algorithm: "hmac-sha256"
  };
}

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

module.exports = {
  assessMultiplicity,
  assessPower,
  assessPValuePattern,
  assessReproducibility,
  assessTestChoice,
  buildFindings,
  decideReviewStatus,
  digest,
  evaluateManuscript,
  evaluateReviewDocket,
  signReviewPacket,
  stableStringify
};
