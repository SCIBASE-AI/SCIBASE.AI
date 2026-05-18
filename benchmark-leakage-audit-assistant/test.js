const assert = require("node:assert/strict");
const { auditBenchmarkLeakage } = require("./index.js");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

const contaminatedProject = {
  title: "Protein Stability Leaderboard Study",
  benchmark: {
    name: "ProteinBench",
    items: [
      {
        id: "pb-42",
        title: "Thermal stability mutation panel",
        text: "A held-out thermal stability mutation panel for ProteinBench."
      }
    ]
  },
  datasets: {
    train: [
      {
        id: "train-001",
        source: "ProteinBench public leaderboard mirror",
        text: "A held-out thermal stability mutation panel for ProteinBench."
      },
      {
        id: "dup-777",
        source: "lab notebook",
        text: "Kinase mutant A had a melting temperature shift of 2.4 C."
      }
    ],
    validation: [
      {
        id: "val-009",
        source: "internal split",
        text: "Independent validation measurement for kinase mutant B."
      }
    ],
    test: [
      {
        id: "dup-777",
        source: "final holdout",
        text: "Kinase mutant A had a melting temperature shift of 2.4 C."
      }
    ]
  },
  split: {
    method: "manual spreadsheet split",
    seed: null,
    manifestHash: ""
  },
  experiments: [
    {
      id: "exp-main",
      usedForSelection: "test",
      notes: "Selected the final checkpoint using best test accuracy after three tuning rounds."
    }
  ],
  artifacts: {
    rawDataManifest: true,
    splitManifest: false,
    environmentLock: false,
    codeArchive: true,
    preregistration: false
  }
};

const cleanProject = {
  title: "Blind Materials Benchmark",
  benchmark: {
    name: "MatBench Blind",
    items: [
      {
        id: "mat-test-1",
        title: "Hidden elastic modulus sample",
        text: "Elastic modulus holdout measurement kept in a locked benchmark set."
      }
    ]
  },
  datasets: {
    train: [
      {
        id: "mat-train-1",
        source: "2024 lab training corpus",
        text: "Training-only polymer synthesis run with public features."
      }
    ],
    validation: [
      {
        id: "mat-val-1",
        source: "validation split",
        text: "Validation-only polymer synthesis run for model selection."
      }
    ],
    test: [
      {
        id: "mat-test-shadow",
        source: "sealed holdout",
        text: "Different blinded polymer synthesis run for final reporting."
      }
    ]
  },
  split: {
    method: "stratified hash split",
    seed: 20260518,
    manifestHash: "sha256:3bf44d1e2c"
  },
  experiments: [
    {
      id: "exp-clean",
      usedForSelection: "validation",
      notes: "Hyperparameters were chosen on validation data before one final holdout evaluation."
    }
  ],
  artifacts: {
    rawDataManifest: true,
    splitManifest: true,
    environmentLock: true,
    codeArchive: true,
    preregistration: true
  }
};

test("flags train/test overlap, benchmark contamination, held-out tuning, weak split provenance, and missing artifacts", () => {
  const audit = auditBenchmarkLeakage(contaminatedProject);
  const types = audit.findings.map((finding) => finding.type);

  assert.equal(audit.summary.releaseDecision, "block");
  assert.equal(audit.summary.severityCounts.critical, 1);
  assert.ok(types.includes("train_test_overlap"));
  assert.ok(types.includes("benchmark_contamination"));
  assert.ok(types.includes("heldout_tuning"));
  assert.ok(types.includes("split_provenance_gap"));
  assert.ok(types.includes("reproducibility_gap"));
  assert.ok(
    audit.reviewerPacket.tasks.some((task) =>
      task.toLowerCase().includes("rebuild the split")
    )
  );
});

test("returns a pass decision for a clean project with complete reproducibility evidence", () => {
  const audit = auditBenchmarkLeakage(cleanProject);

  assert.equal(audit.summary.releaseDecision, "pass");
  assert.equal(audit.summary.findingCount, 0);
  assert.equal(audit.summary.reproducibilityConfidence, "high");
  assert.deepEqual(audit.findings, []);
  assert.ok(audit.reviewerPacket.keyRisks.includes("No benchmark leakage signals detected."));
});

test("emits reviewer-ready evidence and remediation text for each finding", () => {
  const audit = auditBenchmarkLeakage(contaminatedProject);

  for (const finding of audit.findings) {
    assert.ok(finding.id);
    assert.ok(["critical", "high", "medium", "low"].includes(finding.severity));
    assert.ok(finding.title.length > 10);
    assert.ok(finding.evidence.length > 0);
    assert.ok(finding.remediation.length > 10);
  }
});
