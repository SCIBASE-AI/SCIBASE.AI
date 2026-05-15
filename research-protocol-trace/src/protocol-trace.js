const crypto = require("node:crypto");

const ARTIFACT_WEIGHTS = {
  "raw-data": 24,
  notebook: 22,
  figure: 12,
  table: 10,
  protocol: 18
};

function buildProtocolTraceReport(study) {
  const validation = validateStudyPackage(study);
  const protocol = study.protocol || {};
  const artifacts = indexById(study.artifacts || []);
  const analyses = indexById(protocol.plannedAnalyses || []);
  const claims = (study.claims || []).map((claim) =>
    traceClaim(claim, study, artifacts, analyses)
  );
  const unreportedOutcomes = findUnreportedProtocolOutcomes(study, claims);
  const selectiveReporting = scoreSelectiveReporting(study, claims, unreportedOutcomes);
  const reproducibility = scoreReproducibility(study, claims);
  const peerReview = buildPeerReviewPacket(study, claims, unreportedOutcomes);
  const researchGaps = buildResearchGapOpportunities(study, claims, unreportedOutcomes);
  const overallScore = clamp(
    Math.round(
      claimsAverage(claims, "confidenceScore") * 0.45 +
        reproducibility.score * 0.25 +
        selectiveReporting.score * 0.2 +
        validation.score * 0.1
    ),
    0,
    100
  );

  const report = {
    projectId: study.projectId,
    title: study.title,
    domain: study.domain,
    generatedAt: "deterministic-report",
    registrationId: protocol.registrationId || null,
    overallScore,
    decision: overallScore >= 85 ? "ready" : overallScore >= 70 ? "needs-review" : "hold",
    validation,
    claims,
    unreportedOutcomes,
    selectiveReporting,
    reproducibility,
    peerReview,
    researchGaps
  };

  report.digest = stableDigest(report);
  return report;
}

function validateStudyPackage(study) {
  const required = [
    ["projectId", study.projectId],
    ["title", study.title],
    ["protocol.registrationId", study.protocol && study.protocol.registrationId],
    ["protocol.primaryOutcomes", study.protocol && (study.protocol.primaryOutcomes || []).length],
    ["claims", (study.claims || []).length],
    ["artifacts", (study.artifacts || []).length],
    ["reproducibility.dependencyManifest", study.reproducibility && study.reproducibility.dependencyManifest]
  ];
  const missing = required.filter(([, value]) => !value).map(([field]) => field);
  return {
    score: clamp(100 - missing.length * 14, 0, 100),
    status: missing.length === 0 ? "passed" : "incomplete",
    missing
  };
}

function traceClaim(claim, study, artifacts, plannedAnalyses) {
  const outcomeClassification = classifyOutcome(claim.outcomeId, study.protocol || {});
  const plannedAnalysis = plannedAnalyses.get(claim.analysisId);
  const analysisStatus = classifyAnalysis(claim, plannedAnalysis);
  const evidence = scoreEvidence(claim, artifacts);
  const reproduction = traceReproduction(claim, study.reproducibility || {});
  const reportingSignals = buildClaimReportingSignals(claim, outcomeClassification, analysisStatus, evidence, reproduction, study);
  const confidenceScore = clamp(
    100 -
      reportingSignals.reduce((sum, signal) => sum + signal.penalty, 0) +
      Math.round(evidence.score * 0.12) +
      Math.round(reproduction.score * 0.1),
    0,
    100
  );

  return {
    id: claim.id,
    text: claim.text,
    outcomeId: claim.outcomeId,
    protocolStatus: outcomeClassification.status,
    outcomeLabel: outcomeClassification.label,
    analysisStatus,
    evidence,
    reproduction,
    reportedPValue: claim.reportedPValue,
    sampleSize: claim.sampleSize,
    confidenceScore,
    riskLevel: confidenceScore >= 82 ? "low" : confidenceScore >= 64 ? "medium" : "high",
    reportingSignals,
    reviewerPrompt: buildReviewerPrompt(claim, outcomeClassification, reportingSignals)
  };
}

function classifyOutcome(outcomeId, protocol) {
  const primary = (protocol.primaryOutcomes || []).find((outcome) => outcome.id === outcomeId);
  if (primary) {
    return {
      status: "registered-primary",
      label: primary.label,
      expectedDirection: primary.expectedDirection
    };
  }

  const secondary = (protocol.secondaryOutcomes || []).find((outcome) => outcome.id === outcomeId);
  if (secondary) {
    return {
      status: "registered-secondary",
      label: secondary.label,
      expectedDirection: secondary.expectedDirection
    };
  }

  return {
    status: "unregistered",
    label: outcomeId,
    expectedDirection: null
  };
}

function classifyAnalysis(claim, plannedAnalysis) {
  if (!plannedAnalysis) {
    return {
      status: "posthoc-or-unregistered",
      method: null,
      alpha: null,
      message: "No planned analysis with this id exists in the registered protocol."
    };
  }

  const pValue = typeof claim.reportedPValue === "number" ? claim.reportedPValue : null;
  const withinAlpha = pValue === null || pValue <= plannedAnalysis.alpha;
  return {
    status: withinAlpha ? "matches-registered-analysis" : "registered-analysis-threshold-miss",
    method: plannedAnalysis.method,
    alpha: plannedAnalysis.alpha,
    message: withinAlpha
      ? "Claim uses a registered analysis and meets the registered alpha threshold."
      : "Claim uses a registered analysis but does not meet the registered alpha threshold."
  };
}

function scoreEvidence(claim, artifacts) {
  const evidenceArtifacts = (claim.evidenceArtifactIds || [])
    .map((id) => artifacts.get(id))
    .filter(Boolean);
  const types = new Set(evidenceArtifacts.map((artifact) => artifact.type));
  const score = clamp(
    evidenceArtifacts.reduce((sum, artifact) => sum + (ARTIFACT_WEIGHTS[artifact.type] || 8), 0),
    0,
    100
  );
  const missing = [];

  if (!types.has("raw-data")) missing.push("raw-data");
  if (!types.has("notebook")) missing.push("notebook");
  if (!types.has("figure") && !types.has("table")) missing.push("figure-or-table");

  return {
    score,
    status: missing.length === 0 ? "complete-trace" : "partial-trace",
    artifactIds: evidenceArtifacts.map((artifact) => artifact.id),
    artifactTypes: [...types].sort(),
    missing
  };
}

function traceReproduction(claim, reproducibility) {
  const run = (reproducibility.executionRuns || []).find((item) => item.analysisId === claim.analysisId);
  const checks = [
    {
      id: "environment-lock",
      passed: Boolean(reproducibility.environmentLocked),
      message: "Dependency environment is locked."
    },
    {
      id: "random-seed",
      passed: Boolean(reproducibility.randomSeedDocumented),
      message: "Random seed is documented."
    },
    {
      id: "execution-run",
      passed: Boolean(run),
      message: "Analysis has a recorded execution run."
    },
    {
      id: "execution-passed",
      passed: Boolean(run && run.status === "passed"),
      message: "Recorded run finished without warnings."
    }
  ];
  const passed = checks.filter((check) => check.passed).length;

  return {
    score: Math.round((passed / checks.length) * 100),
    status: passed === checks.length ? "reproduced" : passed >= 3 ? "reproducible-with-warnings" : "not-reproduced",
    run: run || null,
    checks
  };
}

function buildClaimReportingSignals(claim, outcomeClassification, analysisStatus, evidence, reproduction, study) {
  const signals = [];

  if (outcomeClassification.status === "unregistered") {
    signals.push(signal("unregistered-outcome", 18, "Claim outcome is not registered in the protocol."));
  }
  if (analysisStatus.status === "posthoc-or-unregistered") {
    signals.push(signal("posthoc-analysis", 14, "Claim references an unregistered or post-hoc analysis."));
  }
  if (evidence.status !== "complete-trace") {
    signals.push(signal("partial-evidence-trace", 12, `Missing evidence types: ${evidence.missing.join(", ")}.`));
  }
  if (reproduction.status !== "reproduced") {
    signals.push(signal("reproduction-warning", 12, "Reproducibility evidence is incomplete or warning-only."));
  }
  if (typeof claim.reportedPValue === "number" && claim.reportedPValue > 0.04 && claim.reportedPValue <= 0.055) {
    signals.push(signal("threshold-adjacent-pvalue", 8, "Reported p-value is close to the decision threshold."));
  }
  if (claim.sampleSize && study.protocol && study.protocol.minimumSampleSize && claim.sampleSize < study.protocol.minimumSampleSize) {
    signals.push(signal("underpowered-claim", 12, "Claim sample size is below registered minimum sample size."));
  }
  if (!claim.citationIds || claim.citationIds.length === 0) {
    signals.push(signal("missing-citation-context", 6, "Claim has no supporting citation context."));
  }
  if (hasNegativeResultForOutcome(study, claim.outcomeId) && outcomeClassification.status === "registered-primary") {
    signals.push(signal("negative-result-needs-interpretation", 9, "Registered outcome has a negative result that should be interpreted in the manuscript."));
  }

  return signals;
}

function findUnreportedProtocolOutcomes(study, tracedClaims) {
  const reported = new Set(tracedClaims.map((claim) => claim.outcomeId));
  const outcomes = [
    ...(study.protocol && study.protocol.primaryOutcomes ? study.protocol.primaryOutcomes : []).map((outcome) => ({
      ...outcome,
      priority: "primary"
    })),
    ...(study.protocol && study.protocol.secondaryOutcomes ? study.protocol.secondaryOutcomes : []).map((outcome) => ({
      ...outcome,
      priority: "secondary"
    }))
  ];

  return outcomes
    .filter((outcome) => !reported.has(outcome.id))
    .map((outcome) => ({
      outcomeId: outcome.id,
      label: outcome.label,
      priority: outcome.priority,
      action: `Add a manuscript result or explicit null/negative-result note for ${outcome.label}.`
    }));
}

function scoreSelectiveReporting(study, claims, unreportedOutcomes) {
  const highRiskClaims = claims.filter((claim) => claim.riskLevel === "high").length;
  const posthocClaims = claims.filter((claim) => claim.analysisStatus.status === "posthoc-or-unregistered").length;
  const unreportedPrimary = unreportedOutcomes.filter((outcome) => outcome.priority === "primary").length;
  const signals = [];

  if (highRiskClaims > 0) signals.push(`${highRiskClaims} high-risk claim(s) need reviewer attention.`);
  if (posthocClaims > 0) signals.push(`${posthocClaims} claim(s) use post-hoc or unregistered analyses.`);
  if (unreportedPrimary > 0) signals.push(`${unreportedPrimary} registered primary outcome(s) are not reported.`);
  if ((study.negativeResults || []).length > 0) signals.push("Negative-result summaries are present and should be linked in the manuscript.");

  return {
    score: clamp(100 - highRiskClaims * 20 - posthocClaims * 13 - unreportedPrimary * 18, 0, 100),
    status: signals.length === 0 ? "low-risk" : "review-needed",
    signals
  };
}

function scoreReproducibility(study, claims) {
  const claimScores = claims.map((claim) => claim.reproduction.score);
  const globalChecks = [
    Boolean(study.reproducibility && study.reproducibility.environmentLocked),
    Boolean(study.reproducibility && study.reproducibility.randomSeedDocumented),
    Boolean(study.reproducibility && study.reproducibility.dependencyManifest)
  ];
  const globalScore = Math.round((globalChecks.filter(Boolean).length / globalChecks.length) * 100);
  const score = Math.round((claimsAverage(claimScores) * 0.72) + globalScore * 0.28);

  return {
    score,
    status: score >= 85 ? "strong" : score >= 65 ? "warning" : "weak",
    dependencyManifest: study.reproducibility && study.reproducibility.dependencyManifest,
    runCount: study.reproducibility && study.reproducibility.executionRuns ? study.reproducibility.executionRuns.length : 0,
    runbook: buildRunbook(study, claims)
  };
}

function buildPeerReviewPacket(study, claims, unreportedOutcomes) {
  const actionItems = [];

  claims.forEach((claim) => {
    claim.reportingSignals.forEach((item) => {
      actionItems.push({
        claimId: claim.id,
        priority: item.penalty >= 14 ? "high" : "medium",
        check: item.id,
        prompt: item.message
      });
    });
  });

  unreportedOutcomes.forEach((outcome) => {
    actionItems.push({
      claimId: null,
      priority: outcome.priority === "primary" ? "high" : "medium",
      check: "unreported-registered-outcome",
      prompt: outcome.action
    });
  });

  return {
    reviewerTemplate: `${study.domain || "research"} protocol trace review`,
    summary: `${claims.length} claim(s), ${actionItems.length} reviewer action(s), ${unreportedOutcomes.length} unreported registered outcome(s).`,
    actionItems: actionItems.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))
  };
}

function buildResearchGapOpportunities(study, claims, unreportedOutcomes) {
  const opportunities = [];

  unreportedOutcomes.forEach((outcome) => {
    opportunities.push({
      id: `gap-${outcome.outcomeId}`,
      title: `Resolve protocol gap for ${outcome.label}`,
      rationale: "A registered outcome is absent from the manuscript, which is a direct opportunity for clearer reporting or follow-up work.",
      relevance: outcome.priority === "primary" ? 96 : 82
    });
  });

  claims
    .filter((claim) => claim.protocolStatus === "unregistered")
    .forEach((claim) => {
      opportunities.push({
        id: `gap-register-${claim.id}`,
        title: `Pre-register follow-up for ${claim.outcomeLabel}`,
        rationale: "The current manuscript makes an exploratory claim that should be validated in a future registered study.",
        relevance: claim.riskLevel === "high" ? 91 : 76
      });
    });

  return opportunities.sort((a, b) => b.relevance - a.relevance);
}

function buildRunbook(study, claims) {
  return [
    `Load dependency manifest: ${study.reproducibility && study.reproducibility.dependencyManifest ? study.reproducibility.dependencyManifest : "missing"}`,
    "Verify raw data checksums before executing notebooks.",
    ...claims.map((claim) => `Re-run ${claim.id}: ${claim.reproduction.status}.`)
  ];
}

function buildReviewerPrompt(claim, outcomeClassification, reportingSignals) {
  if (reportingSignals.length === 0) {
    return `Verify that ${claim.id} remains consistent with the registered ${outcomeClassification.status} outcome.`;
  }
  const topSignal = reportingSignals.slice().sort((a, b) => b.penalty - a.penalty)[0];
  return `Review ${claim.id}: ${topSignal.message}`;
}

function signal(id, penalty, message) {
  return { id, penalty, message };
}

function hasNegativeResultForOutcome(study, outcomeId) {
  return (study.negativeResults || []).some((item) => item.outcomeId === outcomeId);
}

function claimsAverage(claimsOrScores, key) {
  if (!claimsOrScores.length) return 0;
  const scores = key ? claimsOrScores.map((claim) => claim[key]) : claimsOrScores;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function priorityRank(priority) {
  return priority === "high" ? 0 : priority === "medium" ? 1 : 2;
}

function indexById(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function stableDigest(value) {
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

module.exports = {
  buildProtocolTraceReport,
  validateStudyPackage,
  stableDigest
};
