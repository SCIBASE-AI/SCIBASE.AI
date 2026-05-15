"use strict";

const crypto = require("node:crypto");

const DEFAULT_REVIEW_WEIGHTS = Object.freeze({
  claimProtocolAlignment: 30,
  evidenceCoverage: 25,
  reproducibility: 25,
  citationReadiness: 10,
  gapNovelty: 10,
});

function stableHash(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = canonicalize(value[key]);
        return result;
      }, {});
  }
  return value;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value) {
  const stopWords = new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "in",
    "into",
    "is",
    "of",
    "on",
    "or",
    "our",
    "that",
    "the",
    "this",
    "to",
    "with",
  ]);

  return normalizeText(value)
    .split(" ")
    .map((token) => {
      if (token.endsWith("ies") && token.length > 5) return `${token.slice(0, -3)}y`;
      if (token.endsWith("ions") && token.length > 6) return token.slice(0, -1);
      if (token.endsWith("ing") && token.length > 6) return token.slice(0, -3);
      if (token.endsWith("ed") && token.length > 5) return token.slice(0, -2);
      if (token.endsWith("s") && token.length > 4) return token.slice(0, -1);
      return token;
    })
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

function overlapScore(left, right) {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let matches = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      matches += 1;
    }
  }

  return matches / Math.max(leftTokens.size, rightTokens.size);
}

function classifyRisk(score, thresholds = { low: 0.75, medium: 0.45 }) {
  if (score >= thresholds.low) return "low";
  if (score >= thresholds.medium) return "medium";
  return "high";
}

function bestMatch(item, candidates, textSelector) {
  let best = null;
  for (const candidate of candidates) {
    const score = overlapScore(item, textSelector(candidate));
    if (!best || score > best.score) {
      best = { candidate, score };
    }
  }
  return best || { candidate: null, score: 0 };
}

function traceClaimsToProtocol(bundle) {
  const claims = bundle.manuscript.claims || [];
  const commitments = bundle.protocol.commitments || [];

  return claims.map((claim) => {
    const match = bestMatch(claim.text, commitments, (commitment) =>
      [commitment.question, commitment.endpoint, commitment.analysisPlan]
        .filter(Boolean)
        .join(" ")
    );

    const driftSignals = [];
    if (claim.resultType === "primary" && match.score < 0.35) {
      driftSignals.push("primary claim has weak preregistered support");
    }
    const hasProtocolMatch = match.score >= 0.25;
    if (hasProtocolMatch && claim.direction && match.candidate?.expectedDirection && claim.direction !== match.candidate.expectedDirection) {
      driftSignals.push("claim direction differs from protocol expectation");
    }
    if (hasProtocolMatch && claim.population && match.candidate?.population && normalizeText(claim.population) !== normalizeText(match.candidate.population)) {
      driftSignals.push("claim population differs from protocol population");
    }

    const status = match.score >= 0.42 && driftSignals.length === 0
      ? "aligned"
      : match.score >= 0.25
        ? "review-needed"
        : "unregistered";

    return {
      claimId: claim.id,
      claim: claim.text,
      matchedCommitmentId: hasProtocolMatch ? match.candidate?.id || null : null,
      alignmentScore: round(match.score),
      status,
      driftSignals,
    };
  });
}

function buildEvidenceMap(bundle, claimTraces) {
  const artifacts = bundle.evidenceArtifacts || [];
  const citations = bundle.citations || [];

  return claimTraces.map((trace) => {
    const claim = bundle.manuscript.claims.find((item) => item.id === trace.claimId);
    const supportingArtifacts = artifacts
      .map((artifact) => ({
        artifactId: artifact.id,
        kind: artifact.kind,
        integrityHash: artifact.integrityHash || stableHash(artifact),
        score: overlapScore(claim.text, [artifact.title, artifact.description, artifact.findings].filter(Boolean).join(" ")),
      }))
      .filter((artifact) => artifact.score >= 0.2)
      .sort((left, right) => right.score - left.score);

    const supportingCitations = citations
      .map((citation) => ({
        citationId: citation.id,
        title: citation.title,
        styleReady: Boolean(citation.doi || citation.url),
        score: overlapScore(claim.text, [citation.title, citation.abstract, citation.keywords?.join(" ")].filter(Boolean).join(" ")),
      }))
      .filter((citation) => citation.score >= 0.18)
      .sort((left, right) => right.score - left.score);

    const evidenceScore = Math.min(1, supportingArtifacts.length * 0.28 + supportingCitations.length * 0.18);
    const blockers = [];

    if (supportingArtifacts.length === 0) blockers.push("no evidence artifact linked to claim");
    if (supportingCitations.length === 0) blockers.push("no supporting citation linked to claim");
    if (claim.resultType === "primary" && supportingArtifacts.length < 2) {
      blockers.push("primary claim should have at least two supporting artifacts");
    }

    return {
      claimId: trace.claimId,
      evidenceScore: round(evidenceScore),
      risk: classifyRisk(evidenceScore),
      supportingArtifacts: supportingArtifacts.slice(0, 3),
      supportingCitations: supportingCitations.slice(0, 3),
      blockers,
    };
  });
}

function evaluateReproducibility(bundle) {
  const pipeline = bundle.reproducibility || {};
  const checks = [
    {
      id: "raw-data",
      label: "Raw data is present or linked",
      passed: Boolean(pipeline.rawDataAvailable),
      weight: 18,
    },
    {
      id: "clean-pipeline",
      label: "Clean analysis pipeline is declared",
      passed: Boolean(pipeline.analysisCommand),
      weight: 20,
    },
    {
      id: "environment",
      label: "Execution environment is pinned",
      passed: Boolean(pipeline.containerImage || pipeline.condaEnvironment || pipeline.lockfile),
      weight: 18,
    },
    {
      id: "expected-output",
      label: "Expected outputs are declared with checksums",
      passed: Array.isArray(pipeline.expectedOutputs) && pipeline.expectedOutputs.every((item) => item.path && item.sha256),
      weight: 18,
    },
    {
      id: "attempt-history",
      label: "Previous reproducibility attempts are tracked",
      passed: Array.isArray(pipeline.attempts) && pipeline.attempts.length > 0,
      weight: 12,
    },
    {
      id: "test-set",
      label: "Validation or test dataset is available",
      passed: Boolean(pipeline.testDataAvailable),
      weight: 14,
    },
  ];

  const score = checks.reduce((sum, check) => sum + (check.passed ? check.weight : 0), 0);
  const failed = checks.filter((check) => !check.passed).map((check) => check.id);
  const lastAttempt = (pipeline.attempts || []).slice(-1)[0] || null;

  return {
    confidenceScore: score,
    confidenceBand: score >= 80 ? "strong" : score >= 55 ? "moderate" : "weak",
    checks,
    failed,
    lastAttempt,
    nextRunbookStep: failed.length === 0
      ? "Run the declared analysis command in a sandbox and attach output hashes."
      : `Resolve reproducibility gap: ${failed[0]}.`,
  };
}

function generatePeerReviewReport(bundle, claimTraces, evidenceMap, reproducibility) {
  const recommendations = [];

  for (const trace of claimTraces) {
    if (trace.status === "unregistered") {
      recommendations.push({
        severity: "high",
        topic: "Protocol drift",
        message: `Claim ${trace.claimId} is not linked to a preregistered protocol commitment.`,
      });
    } else if (trace.driftSignals.length > 0) {
      recommendations.push({
        severity: "medium",
        topic: "Protocol consistency",
        message: `Claim ${trace.claimId} needs review: ${trace.driftSignals.join("; ")}.`,
      });
    }
  }

  for (const evidence of evidenceMap) {
    if (evidence.blockers.length > 0) {
      recommendations.push({
        severity: evidence.risk === "high" ? "high" : "medium",
        topic: "Evidence coverage",
        message: `Claim ${evidence.claimId}: ${evidence.blockers.join("; ")}.`,
      });
    }
  }

  if (reproducibility.confidenceScore < 80) {
    recommendations.push({
      severity: reproducibility.confidenceScore < 55 ? "high" : "medium",
      topic: "Reproducibility",
      message: reproducibility.nextRunbookStep,
    });
  }

  const missingSections = ["ethics", "dataAvailability", "limitations"].filter(
    (section) => !bundle.manuscript.sections?.[section]
  );
  for (const section of missingSections) {
    recommendations.push({
      severity: section === "ethics" ? "medium" : "low",
      topic: "Manuscript completeness",
      message: `Add or verify the ${section} section before release.`,
    });
  }

  return {
    manuscriptId: bundle.manuscript.id,
    recommendationCount: recommendations.length,
    recommendations,
    releaseReadiness: recommendations.some((item) => item.severity === "high")
      ? "hold"
      : recommendations.some((item) => item.severity === "medium")
        ? "conditional"
        : "ready",
  };
}

function findResearchGaps(bundle) {
  const interests = bundle.userContext?.interests || [];
  const clusters = bundle.researchCorpus?.topicClusters || [];
  const limitations = bundle.manuscript.limitations || [];

  return clusters
    .map((cluster) => {
      const interestScore = Math.max(
        ...interests.map((interest) => overlapScore(interest, [cluster.topic, cluster.keywords?.join(" ")].join(" "))),
        0
      );
      const limitationScore = Math.max(
        ...limitations.map((limitation) => overlapScore(limitation, [cluster.topic, cluster.openQuestion].join(" "))),
        0
      );
      const replicationGap = cluster.replicationCount === 0
        ? 1
        : Math.max(0, 1 - cluster.replicationCount / Math.max(cluster.paperCount, 1));
      const activityScore = Math.min(1, cluster.paperCount / 50);
      const opportunityScore = 0.35 * interestScore + 0.25 * limitationScore + 0.25 * replicationGap + 0.15 * activityScore;

      return {
        topic: cluster.topic,
        openQuestion: cluster.openQuestion,
        opportunityScore: round(opportunityScore),
        why: [
          interestScore >= 0.25 ? "matches researcher interests" : null,
          limitationScore >= 0.2 ? "connects to manuscript limitations" : null,
          replicationGap >= 0.8 ? "low replication coverage" : null,
          activityScore >= 0.5 ? "active research area" : null,
        ].filter(Boolean),
      };
    })
    .filter((item) => item.opportunityScore >= 0.2)
    .sort((left, right) => right.opportunityScore - left.opportunityScore)
    .slice(0, 5);
}

function computeReadinessScore(claimTraces, evidenceMap, reproducibility, gaps, weights = DEFAULT_REVIEW_WEIGHTS) {
  const alignment = claimTraces.length === 0
    ? 0
    : claimTraces.reduce((sum, trace) => sum + (trace.status === "aligned" ? 1 : trace.status === "review-needed" ? 0.55 : 0), 0) / claimTraces.length;
  const evidence = evidenceMap.length === 0
    ? 0
    : evidenceMap.reduce((sum, item) => sum + item.evidenceScore, 0) / evidenceMap.length;
  const reproducibilityScore = reproducibility.confidenceScore / 100;
  const citationReadiness = evidenceMap.length === 0
    ? 0
    : evidenceMap.reduce((sum, item) => sum + (item.supportingCitations.some((citation) => citation.styleReady) ? 1 : 0), 0) / evidenceMap.length;
  const gapNovelty = gaps.length > 0 ? Math.min(1, gaps[0].opportunityScore + 0.2) : 0.2;

  const score =
    alignment * weights.claimProtocolAlignment +
    evidence * weights.evidenceCoverage +
    reproducibilityScore * weights.reproducibility +
    citationReadiness * weights.citationReadiness +
    gapNovelty * weights.gapNovelty;

  return Math.round(score);
}

function analyzeResearchAssistantSuite(bundle) {
  validateBundle(bundle);

  const claimTraces = traceClaimsToProtocol(bundle);
  const evidenceMap = buildEvidenceMap(bundle, claimTraces);
  const reproducibility = evaluateReproducibility(bundle);
  const researchGaps = findResearchGaps(bundle);
  const peerReview = generatePeerReviewReport(bundle, claimTraces, evidenceMap, reproducibility);
  const readinessScore = computeReadinessScore(claimTraces, evidenceMap, reproducibility, researchGaps);

  return {
    assistantRunId: `rar-${stableHash({
      manuscript: bundle.manuscript.id,
      protocol: bundle.protocol.id,
      generatedAt: bundle.generatedAt || "deterministic",
    }).slice(0, 12)}`,
    readinessScore,
    releaseDecision: readinessScore >= 82 && peerReview.releaseReadiness === "ready"
      ? "ready-for-release"
      : readinessScore >= 65 && peerReview.releaseReadiness !== "hold"
        ? "needs-targeted-review"
        : "hold-for-revision",
    claimTraces,
    evidenceMap,
    reproducibility,
    peerReview,
    researchGaps,
    auditDigest: stableHash({ claimTraces, evidenceMap, reproducibility, researchGaps }),
  };
}

function validateBundle(bundle) {
  const requiredTopLevel = ["manuscript", "protocol", "evidenceArtifacts", "reproducibility"];
  for (const key of requiredTopLevel) {
    if (!bundle || !bundle[key]) {
      throw new Error(`missing required bundle field: ${key}`);
    }
  }
  if (!Array.isArray(bundle.manuscript.claims)) {
    throw new Error("manuscript.claims must be an array");
  }
  if (!Array.isArray(bundle.protocol.commitments)) {
    throw new Error("protocol.commitments must be an array");
  }
  if (!Array.isArray(bundle.evidenceArtifacts)) {
    throw new Error("evidenceArtifacts must be an array");
  }
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

module.exports = {
  analyzeResearchAssistantSuite,
  buildEvidenceMap,
  classifyRisk,
  computeReadinessScore,
  evaluateReproducibility,
  findResearchGaps,
  generatePeerReviewReport,
  normalizeText,
  overlapScore,
  stableHash,
  traceClaimsToProtocol,
};
