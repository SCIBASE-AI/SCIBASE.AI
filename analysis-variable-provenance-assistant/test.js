const assert = require("assert");

const {
  auditVariableProvenance,
  buildReviewerReport,
  createFindingDigest,
} = require("./index");

const generatedAt = "2026-05-20T12:30:00.000Z";

const manuscript = {
  projectId: "SCI-GLUCOSE-17",
  title: "Inflammation and glucose variability in post-acute cohorts",
  domain: "clinical trials",
  analyses: [
    {
      id: "analysis-primary",
      claim: "Inflammation score predicts glucose variability in the post-acute cohort.",
      cohort: "post-acute",
      variables: [
        { name: "inflammation_score", unit: "score", role: "predictor" },
        { name: "glucose_variability", unit: "mg/dL", role: "outcome" },
      ],
      requiredCohortFilter: "post_acute == true",
      reportedTransformHash: "sha256:old-glucose-transform",
    },
    {
      id: "analysis-secondary",
      claim: "Novel sleep fragmentation index explains residual variance.",
      cohort: "sleep-substudy",
      variables: [
        { name: "sleep_fragmentation_index", unit: "index", role: "predictor" },
      ],
      requiredCohortFilter: "sleep_substudy == true",
      reportedTransformHash: "sha256:sleep-transform",
    },
  ],
};

const dataDictionary = {
  variables: [
    {
      id: "inflammation_score",
      aliases: ["inflammation score", "crp_il6_score"],
      unit: "score",
      dataset: "derived_biomarkers.csv",
      lineage: ["crp_mg_l", "il6_pg_ml"],
      allowedCohorts: ["post-acute", "all"],
    },
    {
      id: "glucose_variability",
      aliases: ["glucose variability", "gv"],
      unit: "mmol/L",
      dataset: "wearable_glucose.csv",
      lineage: [],
      allowedCohorts: ["post-acute"],
    },
  ],
};

const pipelines = [
  {
    id: "biomarker-transform",
    outputs: ["inflammation_score"],
    inputs: ["crp_mg_l"],
    cohortFilter: "post_acute == true",
    currentHash: "sha256:biomarker-transform",
    deterministic: true,
    testStatus: "pass",
  },
  {
    id: "glucose-transform",
    outputs: ["glucose_variability"],
    inputs: ["glucose_reading"],
    cohortFilter: "post_acute == true",
    currentHash: "sha256:new-glucose-transform",
    deterministic: false,
    testStatus: "fail",
  },
];

const reproducibilityAttempts = [
  {
    analysisId: "analysis-primary",
    status: "fail",
    reason: "Output variance changed after glucose transform rerun.",
    attemptedAt: "2026-05-18T09:00:00.000Z",
  },
];

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

test("audits variable provenance risks with reviewer-ready actions", () => {
  const audit = auditVariableProvenance({
    manuscript,
    dataDictionary,
    pipelines,
    reproducibilityAttempts,
    generatedAt,
  });

  const primary = audit.analysisPackets.find((packet) => packet.analysisId === "analysis-primary");
  assert(primary, "expected primary analysis packet");
  assert(primary.flags.includes("UNIT_DRIFT"));
  assert(primary.flags.includes("INCOMPLETE_DERIVATION_LINEAGE"));
  assert(primary.flags.includes("TRANSFORM_HASH_STALE"));
  assert(primary.flags.includes("NONDETERMINISTIC_PIPELINE"));
  assert(primary.flags.includes("FAILED_REPRODUCIBILITY_ATTEMPT"));
  assert(primary.reviewerActions.some((action) => action.includes("glucose_variability")));
  assert(primary.reproducibilityConfidence < 70);

  const secondary = audit.analysisPackets.find((packet) => packet.analysisId === "analysis-secondary");
  assert(secondary, "expected secondary analysis packet");
  assert.deepStrictEqual(secondary.flags, ["UNDEFINED_VARIABLE", "PIPELINE_MISSING"]);
  assert(secondary.reviewerActions.some((action) => action.includes("Define sleep_fragmentation_index")));
});

test("builds a deterministic suite-level reviewer report", () => {
  const audit = auditVariableProvenance({
    manuscript,
    dataDictionary,
    pipelines,
    reproducibilityAttempts,
    generatedAt,
  });
  const report = buildReviewerReport(audit);

  assert.deepStrictEqual(report.counts, {
    analyses: 2,
    highRiskAnalyses: 2,
    undefinedVariables: 1,
    unitDriftFindings: 1,
    failedReproducibilityLinks: 1,
  });
  assert.deepStrictEqual(report.priorityActions, [
    "Resolve 2 high-risk analysis provenance packets before pre-submission review.",
    "Define 1 manuscript variable in the project data dictionary.",
    "Re-run or explain 1 failed reproducibility attempt linked to manuscript analyses.",
  ]);
});

test("creates stable finding digests from finding facts", () => {
  const audit = auditVariableProvenance({
    manuscript,
    dataDictionary,
    pipelines,
    reproducibilityAttempts,
    generatedAt,
  });
  const finding = audit.analysisPackets[0].findings[0];

  const first = createFindingDigest(finding);
  const second = createFindingDigest({ ...finding, reviewerAction: finding.reviewerAction });

  assert.strictEqual(first, second);
  assert.match(first, /^avpa_[a-f0-9]{24}$/);
});
