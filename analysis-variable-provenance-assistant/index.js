const crypto = require("crypto");

const FLAG_WEIGHTS = {
  UNDEFINED_VARIABLE: 30,
  PIPELINE_MISSING: 20,
  UNIT_DRIFT: 12,
  COHORT_FILTER_MISSING: 12,
  INCOMPLETE_DERIVATION_LINEAGE: 12,
  TRANSFORM_HASH_STALE: 15,
  NONDETERMINISTIC_PIPELINE: 12,
  PIPELINE_TEST_FAILING: 18,
  FAILED_REPRODUCIBILITY_ATTEMPT: 25,
};

function auditVariableProvenance({
  manuscript,
  dataDictionary,
  pipelines,
  reproducibilityAttempts = [],
  generatedAt = new Date().toISOString(),
}) {
  if (!manuscript || !Array.isArray(manuscript.analyses)) {
    throw new Error("manuscript.analyses is required");
  }
  if (!dataDictionary || !Array.isArray(dataDictionary.variables)) {
    throw new Error("dataDictionary.variables is required");
  }
  if (!Array.isArray(pipelines)) {
    throw new Error("pipelines must be an array");
  }

  const dictionary = buildDictionaryIndex(dataDictionary.variables);
  const pipelineByOutput = buildPipelineIndex(pipelines);
  const attemptsByAnalysis = groupBy(reproducibilityAttempts, "analysisId");
  const analysisPackets = manuscript.analyses.map((analysis) =>
    auditAnalysis({
      analysis,
      dictionary,
      pipelineByOutput,
      attempts: attemptsByAnalysis.get(analysis.id) || [],
      generatedAt,
    })
  );

  const audit = {
    generatedAt,
    projectId: manuscript.projectId,
    title: manuscript.title,
    domain: manuscript.domain,
    analysisPackets,
  };
  audit.reviewerReport = buildReviewerReport(audit);
  return audit;
}

function auditAnalysis({ analysis, dictionary, pipelineByOutput, attempts, generatedAt }) {
  const findings = [];
  const flags = [];

  for (const variable of analysis.variables || []) {
    const normalizedName = normalize(variable.name);
    const dictionaryEntry = dictionary.get(normalizedName);

    if (!dictionaryEntry) {
      addFinding(findings, flags, {
        analysisId: analysis.id,
        variableName: variable.name,
        flag: "UNDEFINED_VARIABLE",
        severity: "high",
        message: `${variable.name} is used in the manuscript but is not defined in the data dictionary.`,
        reviewerAction: `Define ${variable.name} in the project data dictionary before review.`,
        generatedAt,
      });
      if (!pipelineByOutput.has(normalizedName)) {
        addFinding(findings, flags, {
          analysisId: analysis.id,
          variableName: variable.name,
          flag: "PIPELINE_MISSING",
          severity: "high",
          message: `${variable.name} has no producing pipeline transform.`,
          reviewerAction: `Attach a producing transform or mark ${variable.name} as externally sourced.`,
          generatedAt,
        });
      }
      continue;
    }

    if (variable.unit && dictionaryEntry.unit && normalizeUnit(variable.unit) !== normalizeUnit(dictionaryEntry.unit)) {
      addFinding(findings, flags, {
        analysisId: analysis.id,
        variableName: dictionaryEntry.id,
        flag: "UNIT_DRIFT",
        severity: "medium",
        message: `${dictionaryEntry.id} is reported as ${variable.unit} but the data dictionary uses ${dictionaryEntry.unit}.`,
        reviewerAction: `Reconcile ${dictionaryEntry.id} units between manuscript and data dictionary.`,
        generatedAt,
      });
    }

    if (
      analysis.requiredCohortFilter &&
      Array.isArray(dictionaryEntry.allowedCohorts) &&
      !dictionaryEntry.allowedCohorts.includes(analysis.cohort)
    ) {
      addFinding(findings, flags, {
        analysisId: analysis.id,
        variableName: dictionaryEntry.id,
        flag: "COHORT_FILTER_MISSING",
        severity: "medium",
        message: `${dictionaryEntry.id} is not listed for cohort ${analysis.cohort}.`,
        reviewerAction: `Document why ${dictionaryEntry.id} can be used for ${analysis.cohort}.`,
        generatedAt,
      });
    }

    const pipeline = pipelineByOutput.get(normalize(dictionaryEntry.id));
    if (!pipeline) {
      addFinding(findings, flags, {
        analysisId: analysis.id,
        variableName: dictionaryEntry.id,
        flag: "PIPELINE_MISSING",
        severity: "high",
        message: `${dictionaryEntry.id} has no producing pipeline transform.`,
        reviewerAction: `Attach a producing transform for ${dictionaryEntry.id}.`,
        generatedAt,
      });
      continue;
    }

    const missingLineageInputs = (dictionaryEntry.lineage || []).filter(
      (parent) => !(pipeline.inputs || []).map(normalize).includes(normalize(parent))
    );
    if (missingLineageInputs.length > 0) {
      addFinding(findings, flags, {
        analysisId: analysis.id,
        variableName: dictionaryEntry.id,
        flag: "INCOMPLETE_DERIVATION_LINEAGE",
        severity: "medium",
        message: `${dictionaryEntry.id} lineage omits ${missingLineageInputs.join(", ")} from transform ${pipeline.id}.`,
        reviewerAction: `Add ${missingLineageInputs.join(", ")} to ${pipeline.id} lineage for ${dictionaryEntry.id}.`,
        generatedAt,
      });
    }

    if (analysis.requiredCohortFilter && pipeline.cohortFilter !== analysis.requiredCohortFilter) {
      addFinding(findings, flags, {
        analysisId: analysis.id,
        variableName: dictionaryEntry.id,
        flag: "COHORT_FILTER_MISSING",
        severity: "medium",
        message: `${pipeline.id} cohort filter does not match ${analysis.requiredCohortFilter}.`,
        reviewerAction: `Align ${pipeline.id} cohort filter with ${analysis.id}.`,
        generatedAt,
      });
    }

    if (analysis.reportedTransformHash && pipeline.currentHash !== analysis.reportedTransformHash) {
      addFinding(findings, flags, {
        analysisId: analysis.id,
        variableName: dictionaryEntry.id,
        flag: "TRANSFORM_HASH_STALE",
        severity: "medium",
        message: `${pipeline.id} hash changed from ${analysis.reportedTransformHash} to ${pipeline.currentHash}.`,
        reviewerAction: `Re-run ${analysis.id} or explain the ${pipeline.id} hash change.`,
        generatedAt,
      });
    }

    if (pipeline.deterministic === false) {
      addFinding(findings, flags, {
        analysisId: analysis.id,
        variableName: dictionaryEntry.id,
        flag: "NONDETERMINISTIC_PIPELINE",
        severity: "medium",
        message: `${pipeline.id} is marked non-deterministic.`,
        reviewerAction: `Stabilize ${pipeline.id} seeds or document accepted variance.`,
        generatedAt,
      });
    }

    if (pipeline.testStatus && pipeline.testStatus !== "pass") {
      addFinding(findings, flags, {
        analysisId: analysis.id,
        variableName: dictionaryEntry.id,
        flag: "PIPELINE_TEST_FAILING",
        severity: "high",
        message: `${pipeline.id} has test status ${pipeline.testStatus}.`,
        reviewerAction: `Fix ${pipeline.id} tests before relying on ${dictionaryEntry.id}.`,
        generatedAt,
      });
    }
  }

  for (const attempt of attempts.filter((item) => item.status !== "pass")) {
    addFinding(findings, flags, {
      analysisId: analysis.id,
      variableName: "*analysis*",
      flag: "FAILED_REPRODUCIBILITY_ATTEMPT",
      severity: "high",
      message: `${analysis.id} has a ${attempt.status} reproducibility attempt: ${attempt.reason}`,
      reviewerAction: `Re-run or explain failed reproducibility attempt from ${attempt.attemptedAt}.`,
      generatedAt,
    });
  }

  const riskPenalty = flags.reduce((total, flag) => total + (FLAG_WEIGHTS[flag] || 5), 0);
  const reproducibilityConfidence = Math.max(0, 100 - riskPenalty);

  return {
    analysisId: analysis.id,
    claim: analysis.claim,
    cohort: analysis.cohort,
    flags,
    findings,
    reviewerActions: findings.map((finding) => finding.reviewerAction),
    reproducibilityConfidence,
    decision: reproducibilityConfidence >= 80
      ? "ready_for_review"
      : reproducibilityConfidence >= 60
        ? "needs_author_clarification"
        : "hold_for_provenance_fix",
  };
}

function buildReviewerReport(audit) {
  const packets = audit.analysisPackets || [];
  const allFindings = packets.flatMap((packet) => packet.findings || []);
  const counts = {
    analyses: packets.length,
    highRiskAnalyses: packets.filter((packet) => packet.reproducibilityConfidence < 70).length,
    undefinedVariables: countFlags(allFindings, "UNDEFINED_VARIABLE"),
    unitDriftFindings: countFlags(allFindings, "UNIT_DRIFT"),
    failedReproducibilityLinks: countFlags(allFindings, "FAILED_REPRODUCIBILITY_ATTEMPT"),
  };

  const priorityActions = [];
  if (counts.highRiskAnalyses > 0) {
    priorityActions.push(
      `Resolve ${formatCount(counts.highRiskAnalyses, "high-risk analysis provenance packet")} before pre-submission review.`
    );
  }
  if (counts.undefinedVariables > 0) {
    priorityActions.push(
      `Define ${formatCount(counts.undefinedVariables, "manuscript variable")} in the project data dictionary.`
    );
  }
  if (counts.failedReproducibilityLinks > 0) {
    priorityActions.push(
      `Re-run or explain ${formatCount(counts.failedReproducibilityLinks, "failed reproducibility attempt")} linked to manuscript analyses.`
    );
  }

  return { counts, priorityActions };
}

function createFindingDigest(finding) {
  const stableFacts = {
    analysisId: finding.analysisId,
    variableName: finding.variableName,
    flag: finding.flag,
    severity: finding.severity,
    message: finding.message,
    reviewerAction: finding.reviewerAction,
  };
  return `avpa_${crypto.createHash("sha256").update(JSON.stringify(stableFacts)).digest("hex").slice(0, 24)}`;
}

function addFinding(findings, flags, finding) {
  const completeFinding = {
    ...finding,
  };
  completeFinding.digest = createFindingDigest(completeFinding);
  findings.push(completeFinding);
  if (!flags.includes(finding.flag)) {
    flags.push(finding.flag);
  }
}

function buildDictionaryIndex(variables) {
  const index = new Map();
  for (const variable of variables) {
    index.set(normalize(variable.id), variable);
    for (const alias of variable.aliases || []) {
      index.set(normalize(alias), variable);
    }
  }
  return index;
}

function buildPipelineIndex(pipelines) {
  const index = new Map();
  for (const pipeline of pipelines) {
    for (const output of pipeline.outputs || []) {
      index.set(normalize(output), pipeline);
    }
  }
  return index;
}

function groupBy(items, key) {
  const grouped = new Map();
  for (const item of items) {
    const value = item[key];
    if (!grouped.has(value)) {
      grouped.set(value, []);
    }
    grouped.get(value).push(item);
  }
  return grouped;
}

function countFlags(findings, flag) {
  return findings.filter((finding) => finding.flag === flag).length;
}

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function normalizeUnit(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
}

function formatCount(count, label) {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

module.exports = {
  auditVariableProvenance,
  buildReviewerReport,
  createFindingDigest,
};
