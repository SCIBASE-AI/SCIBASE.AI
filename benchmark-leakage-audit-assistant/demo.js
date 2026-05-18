const { auditBenchmarkLeakage } = require("./index.js");

const demoProject = {
  title: "NeuroImaging Benchmark Release Candidate",
  benchmark: {
    name: "NeuroBench-26",
    items: [
      {
        id: "nb26-hidden-17",
        title: "Hidden fMRI cohort sample",
        text: "Reserved NeuroBench-26 fMRI cohort with blinded diagnostic labels."
      }
    ]
  },
  datasets: {
    train: [
      {
        id: "train-cohort-13",
        source: "NeuroBench-26 pre-release mirror",
        text: "Reserved NeuroBench-26 fMRI cohort with blinded diagnostic labels."
      },
      {
        id: "subject-0042",
        source: "lab import",
        text: "Subject 0042 resting-state network features with quality-control notes."
      }
    ],
    validation: [
      {
        id: "subject-1182",
        source: "validation import",
        text: "Subject 1182 task-state network features with adjudicated QC status."
      }
    ],
    test: [
      {
        id: "subject-0042",
        source: "holdout import",
        text: "Subject 0042 resting-state network features with quality-control notes."
      }
    ]
  },
  split: {
    method: "manual export",
    seed: "",
    manifestHash: null
  },
  experiments: [
    {
      id: "exp-neuro-7",
      usedForSelection: "test",
      notes: "Selected final model using best test AUROC after evaluating four checkpoints."
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

const audit = auditBenchmarkLeakage(demoProject);

console.log(`Benchmark leakage audit: ${audit.summary.projectTitle}`);
console.log(`Decision: ${audit.summary.releaseDecision}`);
console.log(`Reproducibility confidence: ${audit.summary.reproducibilityConfidence}`);
console.log(`Findings: ${audit.summary.findingCount}`);
console.log("");

for (const finding of audit.findings) {
  console.log(`[${finding.severity.toUpperCase()}] ${finding.title}`);
  for (const evidence of finding.evidence) {
    console.log(`  - ${evidence}`);
  }
  console.log(`  Remediation: ${finding.remediation}`);
  console.log("");
}

console.log("Reviewer tasks:");
for (const task of audit.reviewerPacket.tasks) {
  console.log(`- ${task}`);
}
