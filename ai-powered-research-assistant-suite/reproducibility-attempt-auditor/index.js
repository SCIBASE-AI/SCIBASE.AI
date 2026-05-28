const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const RULES = {
  MISSING_RAW_DATA: {
    severity: "high",
    penalty: 18,
    recommendation: "Require persistent raw dataset access before computing a public reproducibility confidence score.",
  },
  DATASET_DIGEST_MISMATCH: {
    severity: "high",
    penalty: 16,
    recommendation: "Block publication until the stored dataset digest matches the digest used by the reproduced run.",
  },
  MISSING_TEST_SET: {
    severity: "medium",
    penalty: 10,
    recommendation: "Attach the reviewer test set or mark the result as not independently reproducible.",
  },
  STALE_REPRO_ATTEMPT: {
    severity: "medium",
    penalty: 8,
    recommendation: "Run a fresh reproducibility attempt with the current environment and artifact manifests.",
  },
  FAILED_LATEST_ATTEMPT: {
    severity: "high",
    penalty: 20,
    recommendation: "Resolve the latest failed run before surfacing assistant-generated confidence claims.",
  },
  DEPENDENCY_LOCK_DRIFT: {
    severity: "high",
    penalty: 14,
    recommendation: "Rebuild the environment from the declared lock digest or refresh the project manifest.",
  },
  UNPINNED_DEPENDENCY: {
    severity: "medium",
    penalty: 7,
    recommendation: "Pin dependency versions before enabling one-click reproduction.",
  },
  MISSING_STAGE_ENVIRONMENT: {
    severity: "medium",
    penalty: 9,
    recommendation: "Connect every executable stage to a declared environment manifest.",
  },
  MISSING_STAGE_INPUT: {
    severity: "medium",
    penalty: 8,
    recommendation: "Declare all dataset and artifact inputs required to reproduce each pipeline stage.",
  },
  OUTPUT_ARTIFACT_DIGEST_MISMATCH: {
    severity: "high",
    penalty: 15,
    recommendation: "Regenerate the artifact or correct the expected digest before marking the run reproducible.",
  },
  RESULT_MISMATCH: {
    severity: "high",
    penalty: 17,
    recommendation: "Reconcile reported manuscript values with reproduced outputs before assistant endorsement.",
  },
  RUN_VARIANCE_EXCEEDS_TOLERANCE: {
    severity: "high",
    penalty: 14,
    recommendation: "Investigate non-determinism, seed handling, and unstable dependencies before approving the result.",
  },
  MISSING_RANDOM_SEED: {
    severity: "medium",
    penalty: 6,
    recommendation: "Record random seeds for stochastic analysis stages and rerun the pipeline.",
  },
  PRIOR_REPRO_FAILURE: {
    severity: "medium",
    penalty: 8,
    recommendation: "Link the failed prior attempt to a resolved remediation before raising confidence.",
  },
  INSUFFICIENT_SUCCESSFUL_ATTEMPTS: {
    severity: "medium",
    penalty: 8,
    recommendation: "Require the configured number of successful independent attempts before release.",
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

function parseDate(value) {
  const time = Date.parse(value || "");
  return Number.isFinite(time) ? time : 0;
}

function daysBetween(later, earlier) {
  return Math.floor((parseDate(later) - parseDate(earlier)) / 86400000);
}

function byId(items) {
  return new Map((items || []).map((item) => [item.id, item]));
}

function getPath(source, pathExpression) {
  return String(pathExpression || "")
    .split(".")
    .filter(Boolean)
    .reduce((current, segment) => (current && Object.prototype.hasOwnProperty.call(current, segment) ? current[segment] : undefined), source);
}

function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function latestAttempt(attempts, preferredAttemptId) {
  if (!attempts || attempts.length === 0) return null;
  if (preferredAttemptId) {
    const found = attempts.find((attempt) => attempt.id === preferredAttemptId);
    if (found) return found;
  }
  return attempts.slice().sort((a, b) => parseDate(b.completedAt) - parseDate(a.completedAt))[0];
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

function auditDatasets(packet, latest, context) {
  const datasets = packet.datasets || [];
  const latestDigests = latest ? latest.datasetDigests || {} : {};

  for (const dataset of datasets) {
    if (dataset.required && dataset.role === "raw" && !dataset.available) {
      addFinding(
        context.findings,
        "MISSING_RAW_DATA",
        `Required raw dataset ${dataset.id} is not available to the reproducibility runner.`,
        { datasetId: dataset.id, access: dataset.access, reason: dataset.unavailableReason || "not provided" },
      );
    }

    const observed = dataset.observedDigest || latestDigests[dataset.id];
    if (dataset.expectedDigest && observed && dataset.expectedDigest !== observed) {
      addFinding(
        context.findings,
        "DATASET_DIGEST_MISMATCH",
        `Dataset ${dataset.id} digest does not match the declared project manifest.`,
        { datasetId: dataset.id, expectedDigest: dataset.expectedDigest, observedDigest: observed },
      );
    }
  }

  for (const testSetId of packet.policies.requiredTestSets || []) {
    const testSet = datasets.find((dataset) => dataset.id === testSetId);
    if (!testSet || !testSet.available) {
      addFinding(
        context.findings,
        "MISSING_TEST_SET",
        `Reviewer test set ${testSetId} is missing or unavailable.`,
        { testSetId, present: Boolean(testSet), available: Boolean(testSet && testSet.available) },
      );
    }
  }
}

function auditEnvironment(packet, latest, context) {
  if (!latest) return;
  const environments = byId(packet.environments || []);
  const environment = environments.get(latest.environmentId);

  if (latest.status === "failed") {
    addFinding(
      context.findings,
      "FAILED_LATEST_ATTEMPT",
      `Latest reproducibility attempt ${latest.id} failed.`,
      { attemptId: latest.id, failureReason: latest.failureReason || "not recorded" },
    );
  }

  if (!environment) {
    addFinding(
      context.findings,
      "MISSING_STAGE_ENVIRONMENT",
      `Latest attempt ${latest.id} references undeclared environment ${latest.environmentId}.`,
      { attemptId: latest.id, environmentId: latest.environmentId },
    );
    return;
  }

  if (environment.lockDigest && latest.environmentLockDigest && environment.lockDigest !== latest.environmentLockDigest) {
    addFinding(
      context.findings,
      "DEPENDENCY_LOCK_DRIFT",
      `Latest attempt ${latest.id} used a different dependency lock digest than the project manifest.`,
      {
        attemptId: latest.id,
        declaredLockDigest: environment.lockDigest,
        actualLockDigest: latest.environmentLockDigest,
      },
    );
  }

  for (const dependency of environment.declaredDependencies || []) {
    if (!dependency.pinned) {
      addFinding(
        context.findings,
        "UNPINNED_DEPENDENCY",
        `Dependency ${dependency.name} is not pinned in environment ${environment.id}.`,
        { environmentId: environment.id, dependency: dependency.name, version: dependency.version || "unbounded" },
      );
    }
  }
}

function auditPipeline(packet, latest, context) {
  if (!latest) return;
  const environments = byId(packet.environments || []);
  const datasets = byId(packet.datasets || []);
  const artifacts = byId(packet.expectedArtifacts || []);

  for (const stage of packet.pipelineStages || []) {
    if (!stage.environmentId || !environments.has(stage.environmentId)) {
      addFinding(
        context.findings,
        "MISSING_STAGE_ENVIRONMENT",
        `Pipeline stage ${stage.id} is missing a valid executable environment.`,
        { stageId: stage.id, environmentId: stage.environmentId || null },
      );
    }

    const inputIds = [...(stage.inputDatasetIds || []), ...(stage.inputArtifactIds || [])];
    for (const inputId of inputIds) {
      if (!datasets.has(inputId) && !artifacts.has(inputId)) {
        addFinding(
          context.findings,
          "MISSING_STAGE_INPUT",
          `Pipeline stage ${stage.id} references missing input ${inputId}.`,
          { stageId: stage.id, inputId },
        );
      }
    }
  }

  const producedDigests = latest.artifactDigests || {};
  for (const artifact of packet.expectedArtifacts || []) {
    const producedDigest = producedDigests[artifact.id];
    if (!producedDigest && artifact.required !== false) {
      addFinding(
        context.findings,
        "OUTPUT_ARTIFACT_DIGEST_MISMATCH",
        `Required artifact ${artifact.id} was not produced by the latest attempt.`,
        { artifactId: artifact.id, expectedDigest: artifact.expectedDigest, producedDigest: null },
      );
    } else if (producedDigest && artifact.expectedDigest && producedDigest !== artifact.expectedDigest) {
      addFinding(
        context.findings,
        "OUTPUT_ARTIFACT_DIGEST_MISMATCH",
        `Artifact ${artifact.id} digest differs from the expected reproducible output.`,
        { artifactId: artifact.id, expectedDigest: artifact.expectedDigest, producedDigest },
      );
    }
  }
}

function auditReportedResults(packet, latest, context) {
  if (!latest) return;

  for (const result of packet.reportedResults || []) {
    const actual = getPath(latest.outputs || {}, result.metricPath);
    if (typeof actual !== "number") {
      addFinding(
        context.findings,
        "RESULT_MISMATCH",
        `Reported result ${result.id} is missing from the latest reproduced outputs.`,
        { resultId: result.id, metricPath: result.metricPath, expected: result.expected, actual: null },
      );
      continue;
    }

    const delta = Math.abs(actual - result.expected);
    if (delta > result.tolerance) {
      addFinding(
        context.findings,
        "RESULT_MISMATCH",
        `Reported result ${result.id} differs from the reproduced value beyond tolerance.`,
        {
          resultId: result.id,
          label: result.label,
          expected: result.expected,
          actual,
          tolerance: result.tolerance,
          delta: round(delta, 5),
        },
      );
    }
  }
}

function auditRunVariance(packet, latest, context) {
  const attempts = (packet.attempts || []).filter((attempt) => attempt.status === "success");
  const minimum = packet.policies.minSuccessfulAttempts || 1;
  if (attempts.length < minimum) {
    addFinding(
      context.findings,
      "INSUFFICIENT_SUCCESSFUL_ATTEMPTS",
      `Only ${attempts.length} successful reproducibility attempt(s) are recorded; ${minimum} are required.`,
      { successfulAttempts: attempts.length, required: minimum },
    );
  }

  if (latest && latest.requiresSeed && (latest.seed === null || latest.seed === undefined)) {
    addFinding(
      context.findings,
      "MISSING_RANDOM_SEED",
      `Latest attempt ${latest.id} did not record a random seed for a stochastic pipeline.`,
      { attemptId: latest.id, seed: latest.seed || null },
    );
  }

  for (const result of packet.reportedResults || []) {
    const values = attempts
      .map((attempt) => ({ attemptId: attempt.id, value: getPath(attempt.outputs || {}, result.metricPath) }))
      .filter((entry) => typeof entry.value === "number");
    if (values.length < 2) continue;

    const rawValues = values.map((entry) => entry.value);
    const min = Math.min(...rawValues);
    const max = Math.max(...rawValues);
    const spread = max - min;
    const tolerance = result.reproducibilityTolerance || result.tolerance;
    if (spread > tolerance) {
      addFinding(
        context.findings,
        "RUN_VARIANCE_EXCEEDS_TOLERANCE",
        `Repeated runs for ${result.id} vary beyond the configured reproducibility tolerance.`,
        {
          resultId: result.id,
          tolerance,
          min: round(min, 5),
          max: round(max, 5),
          spread: round(spread, 5),
          attempts: values,
        },
      );
    }
  }
}

function auditPriorAttempts(packet, context) {
  for (const prior of packet.priorAttempts || []) {
    if (prior.status === "failed" && !prior.resolvedBy) {
      addFinding(
        context.findings,
        "PRIOR_REPRO_FAILURE",
        `Prior reproducibility attempt ${prior.id} failed without a linked remediation.`,
        { attemptId: prior.id, reviewer: prior.reviewer || "unknown", reason: prior.reason || "not recorded" },
      );
    }
  }
}

function auditFreshness(packet, latest, nowIso, context) {
  if (!latest || !latest.completedAt) return;
  const maxAge = packet.policies.maxAttemptAgeDays || 30;
  const ageDays = daysBetween(nowIso, latest.completedAt);
  if (ageDays > maxAge) {
    addFinding(
      context.findings,
      "STALE_REPRO_ATTEMPT",
      `Latest reproducibility attempt is ${ageDays} days old, exceeding the ${maxAge}-day policy.`,
      { attemptId: latest.id, completedAt: latest.completedAt, ageDays, maxAttemptAgeDays: maxAge },
    );
  }
}

function summarizeFindings(findings) {
  const counts = { high: 0, medium: 0, low: 0 };
  for (const finding of findings) counts[finding.severity] += 1;
  return counts;
}

function computeDecision(score, severityCounts) {
  if (severityCounts.high > 0 || score < 65) return "hold-public-release";
  if (severityCounts.medium > 0 || score < 85) return "needs-human-review";
  return "ready-for-release";
}

function auditReproducibility(packet, options = {}) {
  if (!packet || typeof packet !== "object") throw new TypeError("packet must be an object");
  const policies = packet.policies || {};
  const normalizedPacket = { ...packet, policies };
  const nowIso = options.now || "2026-05-28T20:15:00.000Z";
  const latest = latestAttempt(normalizedPacket.attempts || [], options.attemptId);
  const context = { findings: [] };

  if (!latest) {
    addFinding(context.findings, "INSUFFICIENT_SUCCESSFUL_ATTEMPTS", "No reproducibility attempts are recorded.", {
      successfulAttempts: 0,
      required: policies.minSuccessfulAttempts || 1,
    });
  } else {
    auditFreshness(normalizedPacket, latest, nowIso, context);
  }

  auditDatasets(normalizedPacket, latest, context);
  auditEnvironment(normalizedPacket, latest, context);
  auditPipeline(normalizedPacket, latest, context);
  auditReportedResults(normalizedPacket, latest, context);
  auditRunVariance(normalizedPacket, latest, context);
  auditPriorAttempts(normalizedPacket, context);

  const totalPenalty = context.findings.reduce((sum, finding) => sum + finding.penalty, 0);
  const confidenceScore = Math.max(0, 100 - totalPenalty);
  const severityCounts = summarizeFindings(context.findings);
  const decision = computeDecision(confidenceScore, severityCounts);
  const evidenceDigest = digest({
    projectId: normalizedPacket.projectId,
    latestAttemptId: latest ? latest.id : null,
    findings: context.findings,
    reportedResults: normalizedPacket.reportedResults || [],
  });

  return {
    projectId: normalizedPacket.projectId,
    title: normalizedPacket.title,
    generatedAt: nowIso,
    latestAttemptId: latest ? latest.id : null,
    decision,
    confidenceScore,
    severityCounts,
    findingCount: context.findings.length,
    evidenceDigest,
    summary: {
      datasets: (normalizedPacket.datasets || []).length,
      environments: (normalizedPacket.environments || []).length,
      pipelineStages: (normalizedPacket.pipelineStages || []).length,
      attempts: (normalizedPacket.attempts || []).length,
      priorAttempts: (normalizedPacket.priorAttempts || []).length,
      reportedResults: (normalizedPacket.reportedResults || []).length,
    },
    findings: context.findings,
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
    `# Reproducibility Attempt Audit`,
    "",
    `Project: ${report.title || report.projectId}`,
    `Decision: ${report.decision}`,
    `Confidence score: ${report.confidenceScore}/100`,
    `Latest attempt: ${report.latestAttemptId || "none"}`,
    `Evidence digest: ${report.evidenceDigest}`,
    "",
    "## Scope",
    "",
    `Datasets: ${report.summary.datasets}`,
    `Environments: ${report.summary.environments}`,
    `Pipeline stages: ${report.summary.pipelineStages}`,
    `Attempts: ${report.summary.attempts}`,
    `Prior attempts: ${report.summary.priorAttempts}`,
    `Reported results: ${report.summary.reportedResults}`,
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
  const scoreWidth = Math.max(0, Math.min(1, report.confidenceScore / 100)) * 560;
  const colors = {
    "ready-for-release": "#168a4a",
    "needs-human-review": "#b7791f",
    "hold-public-release": "#b91c1c",
  };
  const color = colors[report.decision] || "#334155";
  const topFindings = report.findings.slice(0, 5);
  const findingRows = topFindings
    .map(
      (finding, index) =>
        `<text x="72" y="${342 + index * 36}" fill="#334155" font-family="Arial, sans-serif" font-size="20">${escapeXml(
          finding.code,
        )}: ${escapeXml(finding.message).slice(0, 92)}</text>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" fill="#f8fafc"/>
  <rect x="48" y="44" width="1184" height="632" rx="18" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="72" y="98" fill="#0f172a" font-family="Arial, sans-serif" font-size="34" font-weight="700">Reproducibility Attempt Auditor</text>
  <text x="72" y="140" fill="#475569" font-family="Arial, sans-serif" font-size="22">${escapeXml(report.title || report.projectId)}</text>
  <text x="72" y="198" fill="${color}" font-family="Arial, sans-serif" font-size="32" font-weight="700">${escapeXml(
    report.decision,
  )}</text>
  <text x="72" y="242" fill="#334155" font-family="Arial, sans-serif" font-size="22">Confidence ${report.confidenceScore}/100 · findings ${
    report.findingCount
  } · digest ${escapeXml(report.evidenceDigest)}</text>
  <rect x="72" y="270" width="560" height="24" rx="12" fill="#e2e8f0"/>
  <rect x="72" y="270" width="${scoreWidth}" height="24" rx="12" fill="${color}"/>
  <text x="72" y="324" fill="#0f172a" font-family="Arial, sans-serif" font-size="24" font-weight="700">Top findings</text>
  ${findingRows}
  <text x="72" y="642" fill="#64748b" font-family="Arial, sans-serif" font-size="18">Synthetic data only. No credentials, private manuscripts, external APIs, or live execution sandboxes.</text>
</svg>
`;
}

function writeAuditReports(report, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, "reproducibility-attempt-audit.json");
  const markdownPath = path.join(outputDir, "reproducibility-attempt-audit.md");
  const svgPath = path.join(outputDir, "reproducibility-attempt-summary.svg");

  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, createMarkdownReport(report));
  fs.writeFileSync(svgPath, createSummarySvg(report));

  return { jsonPath, markdownPath, svgPath };
}

module.exports = {
  RULES,
  auditReproducibility,
  createMarkdownReport,
  createSummarySvg,
  digest,
  stableStringify,
  writeAuditReports,
};
