"use strict"

const assert = require("node:assert/strict")
const { selectDomainReviewTemplate } = require("./index")

{
  const result = selectDomainReviewTemplate({
    manuscript: {
      title: "Randomized clinical trial of a sepsis biomarker",
      keywords: ["clinical", "trial", "patient"],
      artifacts: [
        { type: "manuscript", name: "paper.md" },
        { type: "data", name: "cohort.csv" },
        { type: "code", name: "analysis.py" },
      ],
      evidence: [{ id: "ev-primary-endpoint" }],
      claims: [{ id: "claim-survival", evidenceIds: ["ev-primary-endpoint"] }],
      reproducibility: {
        environment: "conda-lock.yml",
        runCommand: "python analysis.py",
        expectedOutputs: ["tables/primary.csv"],
      },
    },
  })

  assert.equal(result.domain, "clinical")
  assert.equal(result.status, "ready")
  assert.ok(result.prioritySections.includes("patient eligibility"))
  assert.match(result.auditDigest, /^[0-9a-f]{64}$/)
}

{
  const result = selectDomainReviewTemplate({
    manuscript: {
      title: "Transformer baseline for satellite image segmentation",
      keywords: ["model", "benchmark", "training", "ablation"],
      artifacts: [
        { type: "manuscript", name: "paper.md" },
        { type: "data", name: "dataset-card.json" },
        { type: "code", name: "train.py" },
      ],
      evidence: [{ id: "ev-split" }],
      claims: [{ id: "claim-sota", evidenceIds: ["ev-split"] }],
      reproducibility: {
        environment: "Dockerfile",
        runCommand: "python train.py --config baseline.yaml",
        expectedOutputs: ["metrics.json"],
      },
    },
  })

  assert.equal(result.domain, "machine-learning")
  assert.equal(result.status, "ready")
  assert.ok(result.prioritySections.includes("leakage risk"))
}

{
  const result = selectDomainReviewTemplate({
    manuscript: {
      title: "CRISPR screen identifies stress response genes",
      keywords: ["crispr", "cell", "gene", "replicate"],
      artifacts: [{ type: "manuscript", name: "paper.md" }],
      evidence: [{ id: "ev-figure-1" }],
      claims: [{ id: "claim-gene-hit", evidenceIds: [] }],
      reproducibility: {},
    },
  })

  assert.equal(result.domain, "wet-lab-biology")
  assert.equal(result.status, "blocked")
  assert.ok(result.blockers.includes("claim claim-gene-hit has no evidence anchors"))
  assert.ok(result.warnings.includes("missing data artifact"))
  assert.equal(result.reviewQuestions[0].section, "release blocker")
}

{
  const result = selectDomainReviewTemplate({
    manuscript: {
      title: "A reusable simulation workflow",
      keywords: ["simulation", "notebook", "dependency"],
      artifacts: [
        { type: "manuscript", name: "paper.md" },
        { type: "data", name: "input.json" },
        { type: "code", name: "notebook.ipynb" },
      ],
      evidence: [],
      claims: [],
      reproducibility: { environment: "Dockerfile", runCommand: "jupyter nbconvert --execute notebook.ipynb" },
    },
  })

  assert.equal(result.domain, "computational")
  assert.equal(result.status, "needs-review")
  assert.ok(result.warnings.includes("missing expected output manifest"))
  assert.ok(result.recommendedReviewerExpertise.includes("reproducibility"))
}

console.log("domain-review-template-selector tests passed")
