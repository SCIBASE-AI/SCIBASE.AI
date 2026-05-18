const { evaluatePricingExperiment } = require("./index.js");

const experiment = {
  title: "Enterprise AI Compute Price Lift",
  hypothesis: "",
  cohorts: [
    {
      name: "new-pricing",
      exposurePercent: 42,
      priceMultiplier: 1.35,
      entitlementsRemoved: ["priority-support", "included-compute-pack"],
      grandfathering: false
    }
  ],
  economics: {
    grossMarginFloorPercent: 55,
    projectedGrossMarginPercent: 41
  },
  rollout: {
    maxExposurePercent: 25,
    rollbackMetric: "",
    rollbackThreshold: null,
    owner: "revenue-ops"
  },
  billing: {
    invoiceCopyReviewed: false,
    customerNoticeDays: 3,
    taxTreatmentReviewed: false
  },
  audit: {
    approvalRecords: [],
    revenueRecognitionNotes: ""
  }
};

const result = evaluatePricingExperiment(experiment);

console.log(`Pricing experiment guard: ${result.summary.experimentTitle}`);
console.log(`Decision: ${result.summary.launchDecision}`);
console.log(`Finance readiness: ${result.summary.financeReadiness}`);
console.log(`Findings: ${result.summary.findingCount}`);
console.log("");

for (const finding of result.findings) {
  console.log(`[${finding.severity.toUpperCase()}] ${finding.title}`);
  for (const evidence of finding.evidence) {
    console.log(`  - ${evidence}`);
  }
  console.log(`  Remediation: ${finding.remediation}`);
  console.log("");
}

console.log("Finance actions:");
for (const action of result.financePacket.requiredActions) {
  console.log(`- ${action}`);
}
