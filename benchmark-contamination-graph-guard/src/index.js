"use strict";

const CONTAMINATION_EDGE_TYPES = new Set([
  "trained_on",
  "pretrained_on",
  "fine_tuned_on",
  "label_source",
  "derived_from",
  "augmented_from",
  "leaked_from"
]);

const BENCHMARK_EDGE_TYPES = new Set([
  "evaluated_on",
  "claims_sota_on",
  "recommended_for",
  "compared_against"
]);

function list(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function parseDate(value) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time) : null;
}

function daysBetween(startValue, endValue) {
  const start = parseDate(startValue);
  const end = parseDate(endValue);
  if (!start || !end) return null;
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function finding(code, severity, message, evidence, remediation) {
  return { code, severity, message, evidence, remediation };
}

function normalizePacket(packet) {
  return {
    id: packet.id,
    title: packet.title || "Untitled benchmark graph packet",
    reviewDate: packet.reviewDate || "2026-08-15",
    model: packet.model || {},
    benchmark: packet.benchmark || {},
    graphEdges: list(packet.graphEdges),
    splitEvidence: packet.splitEvidence || {},
    recommendation: packet.recommendation || {},
    safeguards: packet.safeguards || {}
  };
}

function edgeType(edge) {
  return normalizeText(edge.type).replace(/\s+/g, "_");
}

function sameNode(a, b) {
  return normalizeText(a) && normalizeText(a) === normalizeText(b);
}

function edgeTouches(edge, nodeId) {
  return sameNode(edge.source, nodeId) || sameNode(edge.target, nodeId);
}

function evidenceHashSet(values) {
  return new Set(list(values).map(normalizeText).filter(Boolean));
}

function intersectSets(left, right) {
  return [...left].filter((item) => right.has(item));
}

function contaminationEdges(packet) {
  const modelId = packet.model.id;
  return packet.graphEdges.filter((edge) => (
    edgeTouches(edge, modelId) &&
    CONTAMINATION_EDGE_TYPES.has(edgeType(edge))
  ));
}

function benchmarkClaimEdges(packet) {
  const benchmarkId = packet.benchmark.id;
  return packet.graphEdges.filter((edge) => (
    edgeTouches(edge, benchmarkId) &&
    BENCHMARK_EDGE_TYPES.has(edgeType(edge))
  ));
}

function hasDirectTrainingBenchmarkOverlap(packet) {
  const benchmarkId = normalizeText(packet.benchmark.id);
  return contaminationEdges(packet).some((edge) => (
    sameNode(edge.source, benchmarkId) ||
    sameNode(edge.target, benchmarkId) ||
    sameNode(edge.datasetId, benchmarkId)
  ));
}

function splitOverlap(packet) {
  const training = evidenceHashSet(packet.splitEvidence.trainingHashes);
  const evaluation = evidenceHashSet(packet.splitEvidence.evaluationHashes);
  return intersectSets(training, evaluation);
}

function labelSourceOverlap(packet) {
  const trainingLabels = evidenceHashSet(packet.splitEvidence.trainingLabelSources);
  const benchmarkLabels = evidenceHashSet(packet.splitEvidence.benchmarkLabelSources);
  return intersectSets(trainingLabels, benchmarkLabels);
}

function benchmarkReleasedAfterTrainingCutoff(packet) {
  const trainingCutoff = parseDate(packet.model.trainingCutoff);
  const benchmarkRelease = parseDate(packet.benchmark.releaseDate);
  if (!trainingCutoff || !benchmarkRelease) return false;
  return benchmarkRelease > trainingCutoff;
}

function hasIndependentHoldoutEvidence(packet) {
  return (
    packet.splitEvidence.independentHoldout === true &&
    packet.splitEvidence.splitChecksumPresent === true &&
    packet.splitEvidence.evaluationLockedBeforeTraining === true
  );
}

function scoreFindings(findings) {
  const score = findings.reduce((total, item) => {
    if (item.severity === "critical") return total + 35;
    if (item.severity === "major") return total + 22;
    return total + 10;
  }, 0);
  return Math.min(100, score);
}

function decisionFor(findings) {
  if (findings.some((item) => item.severity === "critical")) return "HOLD";
  if (findings.some((item) => item.severity === "major")) return "REVIEW";
  return "PUBLISH";
}

function analyzePacket(input) {
  const packet = normalizePacket(input);
  const findings = [];
  const benchmarkEdges = benchmarkClaimEdges(packet);
  const contamination = contaminationEdges(packet);
  const splitCollisions = splitOverlap(packet);
  const labelCollisions = labelSourceOverlap(packet);

  if (benchmarkEdges.length === 0) {
    findings.push(finding(
      "NO_BENCHMARK_CLAIM_EDGE",
      "major",
      "The graph packet lacks an explicit benchmark claim edge for the model evaluation.",
      { model: packet.model.id || null, benchmark: packet.benchmark.id || null },
      "Add an evaluated_on or claims_sota_on edge with source DOI and split evidence before recommendation publication."
    ));
  }

  if (hasDirectTrainingBenchmarkOverlap(packet)) {
    findings.push(finding(
      "DIRECT_TRAINING_BENCHMARK_OVERLAP",
      "critical",
      "The model graph links training or pretraining data directly to the claimed benchmark.",
      {
        model: packet.model.id,
        benchmark: packet.benchmark.id,
        edges: contamination.map((edge) => ({ type: edge.type, source: edge.source, target: edge.target, datasetId: edge.datasetId || null }))
      },
      "Suppress clean-benchmark claims and mark the evaluation as contaminated until an independent holdout is supplied."
    ));
  }

  if (splitCollisions.length > 0) {
    findings.push(finding(
      "TRAIN_EVAL_SPLIT_HASH_COLLISION",
      "critical",
      "Training and evaluation split hashes overlap.",
      { collisions: splitCollisions },
      "Hold the benchmark edge, regenerate split manifests, and require a locked evaluation set before publication."
    ));
  }

  if (labelCollisions.length > 0) {
    findings.push(finding(
      "LABEL_SOURCE_LEAKAGE",
      "critical",
      "Training labels and benchmark labels share a source that can leak answers into evaluation.",
      { collisions: labelCollisions },
      "Block recommendation paths that cite this benchmark as independent evidence until label provenance is separated."
    ));
  }

  if (!benchmarkReleasedAfterTrainingCutoff(packet) && packet.benchmark.releaseDate && packet.model.trainingCutoff) {
    findings.push(finding(
      "BENCHMARK_PREDATES_TRAINING_CUTOFF",
      "major",
      "The benchmark was released before the model training cutoff, increasing contamination risk.",
      { benchmarkReleaseDate: packet.benchmark.releaseDate, modelTrainingCutoff: packet.model.trainingCutoff },
      "Require explicit exclusion evidence or downgrade the graph edge confidence."
    ));
  }

  if (!hasIndependentHoldoutEvidence(packet)) {
    findings.push(finding(
      "INDEPENDENT_HOLDOUT_EVIDENCE_MISSING",
      "major",
      "The packet lacks complete independent holdout evidence for the benchmark claim.",
      {
        independentHoldout: packet.splitEvidence.independentHoldout || false,
        splitChecksumPresent: packet.splitEvidence.splitChecksumPresent || false,
        evaluationLockedBeforeTraining: packet.splitEvidence.evaluationLockedBeforeTraining || false
      },
      "Attach split checksums and locked evaluation-set evidence before publishing entity-page or recommendation claims."
    ));
  }

  if (
    findings.length > 0 &&
    packet.recommendation.publishToEntityPage === true &&
    packet.safeguards.freezeRecommendations !== true
  ) {
    findings.push(finding(
      "UNSAFE_RECOMMENDATION_PATH_NOT_FROZEN",
      "critical",
      "Entity-page or recommendation publication is enabled while contamination risk is unresolved.",
      {
        publishToEntityPage: packet.recommendation.publishToEntityPage,
        freezeRecommendations: packet.safeguards.freezeRecommendations || false
      },
      "Freeze graph recommendation paths and entity-page benchmark badges until contamination review is resolved."
    ));
  }

  const decision = decisionFor(findings);
  return {
    id: packet.id,
    title: packet.title,
    decision,
    riskScore: scoreFindings(findings),
    benchmarkClaimEdges: benchmarkEdges.length,
    contaminationEdges: contamination.length,
    findings,
    recommendedActions: buildRecommendedActions(decision, findings)
  };
}

function buildRecommendedActions(decision, findings) {
  if (decision === "PUBLISH") {
    return ["Publish benchmark graph edge and recommendation with normal provenance metadata."];
  }

  const actions = [
    "Attach contamination findings to the graph curation queue.",
    "Downgrade or suppress benchmark-confidence badges until evidence is resolved.",
    "Generate a reviewer packet with split, label-source, and edge-provenance evidence."
  ];

  if (findings.some((item) => item.code === "UNSAFE_RECOMMENDATION_PATH_NOT_FROZEN")) {
    actions.unshift("Freeze model recommendation paths and entity-page benchmark badges.");
  }

  return actions;
}

function analyzeBenchmarkPackets(packets) {
  const results = list(packets).map(analyzePacket);
  const counts = results.reduce((acc, item) => {
    acc[item.decision] = (acc[item.decision] || 0) + 1;
    return acc;
  }, { PUBLISH: 0, REVIEW: 0, HOLD: 0 });

  return {
    generatedAt: new Date().toISOString(),
    totalPackets: results.length,
    counts,
    results
  };
}

module.exports = {
  analyzePacket,
  analyzeBenchmarkPackets,
  daysBetween,
  splitOverlap,
  labelSourceOverlap
};
