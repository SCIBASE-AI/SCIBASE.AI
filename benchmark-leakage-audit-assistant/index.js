const crypto = require("node:crypto");

const SEVERITIES = ["critical", "high", "medium", "low"];
const REQUIRED_ARTIFACTS = [
  "rawDataManifest",
  "splitManifest",
  "environmentLock",
  "codeArchive",
  "preregistration"
];

function auditBenchmarkLeakage(project) {
  const normalized = normalizeProject(project);
  const findings = [
    ...findTrainTestOverlap(normalized),
    ...findBenchmarkContamination(normalized),
    ...findHeldoutTuning(normalized),
    ...findSplitProvenanceGaps(normalized),
    ...findReproducibilityGaps(normalized)
  ];

  const severityCounts = countSeverities(findings);
  const summary = {
    projectTitle: normalized.title,
    findingCount: findings.length,
    severityCounts,
    releaseDecision: decideRelease(severityCounts),
    reproducibilityConfidence: scoreReproducibility(findings)
  };

  return {
    summary,
    findings,
    reviewerPacket: buildReviewerPacket(summary, findings)
  };
}

function normalizeProject(project) {
  if (!project || typeof project !== "object") {
    throw new TypeError("auditBenchmarkLeakage expects a project object");
  }

  const datasets = project.datasets || {};

  return {
    title: project.title || "Untitled research project",
    benchmark: project.benchmark || { name: "", items: [] },
    datasets: {
      train: Array.isArray(datasets.train) ? datasets.train : [],
      validation: Array.isArray(datasets.validation) ? datasets.validation : [],
      test: Array.isArray(datasets.test) ? datasets.test : []
    },
    split: project.split || {},
    experiments: Array.isArray(project.experiments) ? project.experiments : [],
    artifacts: project.artifacts || {}
  };
}

function findTrainTestOverlap(project) {
  const trainFingerprints = new Map();
  const trainIds = new Map();

  for (const record of project.datasets.train) {
    const id = normalizeValue(record.id);
    if (id) trainIds.set(id, record);
    trainFingerprints.set(fingerprintRecord(record), record);
  }

  const overlaps = [];
  for (const testRecord of project.datasets.test) {
    const id = normalizeValue(testRecord.id);
    const fingerprint = fingerprintRecord(testRecord);
    const trainRecord = trainIds.get(id) || trainFingerprints.get(fingerprint);

    if (trainRecord) {
      overlaps.push({
        trainId: trainRecord.id || "unknown-train-id",
        testId: testRecord.id || "unknown-test-id",
        snippet: compactText(testRecord.text || testRecord.title || testRecord.source || "")
      });
    }
  }

  if (overlaps.length === 0) return [];

  return [
    finding({
      type: "train_test_overlap",
      severity: "critical",
      title: "Training records overlap with the final evaluation split",
      evidence: overlaps.map(
        (overlap) =>
          `Train ${overlap.trainId} matches test ${overlap.testId}: ${overlap.snippet}`
      ),
      remediation:
        "Rebuild the split from source data, remove duplicated records from the training corpus, and rerun the final holdout once."
    })
  ];
}

function findBenchmarkContamination(project) {
  const benchmarkTerms = [
    project.benchmark.name,
    ...safeArray(project.benchmark.items).flatMap((item) => [
      item.id,
      item.title,
      item.text
    ])
  ]
    .map(normalizeText)
    .filter((term) => term.length >= 8);

  const contaminated = [];
  for (const record of project.datasets.train) {
    const recordText = normalizeText(
      [record.source, record.title, record.text].filter(Boolean).join(" ")
    );
    const matchedTerm = benchmarkTerms.find((term) => recordText.includes(term));

    if (matchedTerm) {
      contaminated.push(
        `Training record ${record.id || "unknown"} contains benchmark signal "${truncate(
          matchedTerm,
          80
        )}".`
      );
    }
  }

  if (contaminated.length === 0) return [];

  return [
    finding({
      type: "benchmark_contamination",
      severity: "high",
      title: "Training corpus appears to contain benchmark material",
      evidence: contaminated,
      remediation:
        "Remove benchmark mirrors and leaderboard-derived content from training, then document an exclusion rule for future ingestion."
    })
  ];
}

function findHeldoutTuning(project) {
  const riskyExperiments = project.experiments.filter(hasHeldoutTuningRisk);

  if (riskyExperiments.length === 0) return [];

  return [
    finding({
      type: "heldout_tuning",
      severity: "high",
      title: "Final holdout data was used during model selection",
      evidence: riskyExperiments.map(
        (experiment) =>
          `${experiment.id || "unnamed experiment"}: ${compactText(
            experiment.notes || experiment.usedForSelection || experiment.tunedOn || ""
          )}`
      ),
      remediation:
        "Move model and checkpoint selection to validation data, freeze the chosen configuration, and rerun the untouched holdout once."
    })
  ];
}

function hasHeldoutTuningRisk(experiment) {
  const selectionSource = normalizeText(
    [experiment.usedForSelection, experiment.tunedOn].filter(Boolean).join(" ")
  );
  if (/\b(test|holdout|held out|held out|heldout)\b/.test(selectionSource)) {
    return true;
  }

  const notes = normalizeText(experiment.notes);
  return (
    /\b(test|holdout|heldout)\b.{0,40}\b(select|selected|selection|tune|tuned|checkpoint|best)\b/.test(notes) ||
    /\b(select|selected|selection|tune|tuned|checkpoint|best)\b.{0,40}\b(test|holdout|heldout)\b/.test(notes)
  );
}

function findSplitProvenanceGaps(project) {
  const gaps = [];
  if (!project.split.method) gaps.push("split method is missing");
  if (project.split.seed === null || project.split.seed === undefined || project.split.seed === "") {
    gaps.push("split seed is missing");
  }
  if (!project.split.manifestHash) gaps.push("split manifest hash is missing");

  if (gaps.length === 0) return [];

  return [
    finding({
      type: "split_provenance_gap",
      severity: "medium",
      title: "Dataset split provenance is not reproducible",
      evidence: gaps,
      remediation:
        "Record the deterministic split method, seed, and manifest hash so reviewers can recreate train/validation/test membership."
    })
  ];
}

function findReproducibilityGaps(project) {
  const missing = REQUIRED_ARTIFACTS.filter((artifact) => !project.artifacts[artifact]);
  if (missing.length === 0) return [];

  return [
    finding({
      type: "reproducibility_gap",
      severity: missing.length >= 3 ? "high" : "medium",
      title: "Reproducibility packet is missing required evidence",
      evidence: missing.map((artifact) => `${artifact} is absent`),
      remediation:
        "Attach the missing manifests, lockfiles, code archive, and preregistration evidence before release review."
    })
  ];
}

function finding(input) {
  return {
    id: `${input.type}-${hash(input.evidence.join("|")).slice(0, 8)}`,
    type: input.type,
    severity: input.severity,
    title: input.title,
    evidence: input.evidence,
    remediation: input.remediation
  };
}

function buildReviewerPacket(summary, findings) {
  if (findings.length === 0) {
    return {
      keyRisks: ["No benchmark leakage signals detected."],
      tasks: ["Proceed with normal scientific peer review."],
      questions: ["Have reviewers independently confirmed benchmark access controls?"]
    };
  }

  return {
    keyRisks: findings.map((item) => `${item.severity.toUpperCase()}: ${item.title}`),
    tasks: findings.map((item) => item.remediation),
    questions: [
      `Can the team reproduce the ${summary.projectTitle} split from immutable inputs?`,
      "Was the final holdout evaluated exactly once after model selection froze?",
      "Are benchmark and leaderboard mirrors excluded from every training corpus?"
    ]
  };
}

function countSeverities(findings) {
  const counts = Object.fromEntries(SEVERITIES.map((severity) => [severity, 0]));
  for (const item of findings) counts[item.severity] += 1;
  return counts;
}

function decideRelease(counts) {
  if (counts.critical > 0 || counts.high > 1) return "block";
  if (counts.high === 1 || counts.medium > 0) return "needs-remediation";
  return "pass";
}

function scoreReproducibility(findings) {
  if (findings.some((item) => item.type === "reproducibility_gap" && item.severity === "high")) {
    return "low";
  }
  if (findings.some((item) => item.type === "reproducibility_gap" || item.type === "split_provenance_gap")) {
    return "medium";
  }
  return "high";
}

function fingerprintRecord(record) {
  return hash(normalizeText([record.title, record.text].filter(Boolean).join(" ")));
}

function hash(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeValue(value) {
  return String(value || "").trim().toLowerCase();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function compactText(value) {
  return truncate(String(value).replace(/\s+/g, " ").trim(), 120);
}

function truncate(value, length) {
  return value.length > length ? `${value.slice(0, length - 3)}...` : value;
}

module.exports = {
  auditBenchmarkLeakage
};
