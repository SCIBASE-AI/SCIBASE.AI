import { mkdirSync, writeFileSync } from "node:fs";
import { evaluateReviewerCalibration, renderMarkdownReport } from "../src/calibration.js";

const packet = {
  projectId: "proj-neuro-118",
  manuscriptId: "ms-gapfinder-204",
  domainTemplate: "neuroscience",
  reviewMode: "public",
  reviews: [
    {
      reviewerId: "rev-stat",
      template: "neuroscience",
      recommendation: "major_revision",
      scores: { clarity: 3, rigor: 2, novelty: 4, reproducibility: 2 },
      claimChecks: [
        { claimId: "claim-primary-endpoint", evidenceIds: ["fig-2", "table-1"] },
        { claimId: "claim-causal-language", evidenceIds: ["methods-4"] },
        { claimId: "claim-replication", evidenceIds: [] }
      ]
    },
    {
      reviewerId: "rev-domain",
      template: "neuroscience",
      recommendation: "minor_revision",
      scores: { clarity: 4, rigor: 4, novelty: 4, reproducibility: 3 },
      claimChecks: [
        { claimId: "claim-primary-endpoint", evidenceIds: ["fig-2"] },
        { claimId: "claim-causal-language", evidenceIds: [] },
        { claimId: "claim-replication", evidenceIds: ["supp-1"] }
      ]
    },
    {
      reviewerId: "rev-methods",
      template: "clinical_trials",
      recommendation: "reject",
      scores: { clarity: 2, rigor: 1, novelty: 3, reproducibility: 1 },
      claimChecks: [
        { claimId: "claim-primary-endpoint", evidenceIds: ["table-1"] },
        { claimId: "claim-causal-language", evidenceIds: [] },
        { claimId: "claim-replication", evidenceIds: [] }
      ]
    }
  ]
};

mkdirSync("reports", { recursive: true });
const result = evaluateReviewerCalibration(packet);
writeFileSync("reports/reviewer-calibration-report.json", `${JSON.stringify(result, null, 2)}\n`);
writeFileSync("reports/reviewer-calibration-report.md", renderMarkdownReport(result));
console.log(JSON.stringify(result, null, 2));
