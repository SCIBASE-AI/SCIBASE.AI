"use strict"

const { selectDomainReviewTemplate } = require("./index")

const result = selectDomainReviewTemplate({
  manuscript: {
    title: "Transformer baseline for satellite image segmentation",
    keywords: ["model", "benchmark", "training", "ablation"],
    methods: ["dataset split", "baseline comparison", "validation"],
    artifacts: [
      { type: "manuscript", name: "paper.md" },
      { type: "data", name: "dataset-card.json" },
      { type: "code", name: "train.py" },
    ],
    evidence: [{ id: "ev-split" }, { id: "ev-ablation" }],
    claims: [
      { id: "claim-performance", evidenceIds: ["ev-split"] },
      { id: "claim-ablation", evidenceIds: ["ev-ablation"] },
    ],
    reproducibility: {
      environment: "Dockerfile",
      runCommand: "python train.py --config baseline.yaml",
      expectedOutputs: ["metrics.json", "ablation.csv"],
    },
  },
})

console.log("Domain Review Template Selector Demo")
console.log("====================================")
console.log(`status: ${result.status}`)
console.log(`domain: ${result.domain}`)
console.log(`template: ${result.templateId}`)
console.log(`first section: ${result.prioritySections[0]}`)
console.log(`review question count: ${result.reviewQuestions.length}`)
console.log(`expertise: ${result.recommendedReviewerExpertise.join(", ")}`)
console.log(`digest: ${result.auditDigest.slice(0, 16)}...`)
