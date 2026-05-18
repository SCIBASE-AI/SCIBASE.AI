const assert = require("node:assert/strict");
const { evaluatePricingExperiment } = require("./index.js");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

const riskyExperiment = {
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

const safeExperiment = {
  title: "Pro Annual Discount Copy Test",
  hypothesis: "Annual discount positioning improves conversion without lowering margin.",
  cohorts: [
    {
      name: "control",
      exposurePercent: 50,
      priceMultiplier: 1,
      entitlementsRemoved: [],
      grandfathering: true
    },
    {
      name: "variant",
      exposurePercent: 10,
      priceMultiplier: 0.95,
      entitlementsRemoved: [],
      grandfathering: true
    }
  ],
  economics: {
    grossMarginFloorPercent: 60,
    projectedGrossMarginPercent: 74
  },
  rollout: {
    maxExposurePercent: 20,
    rollbackMetric: "gross margin below 60% or refund requests above 2%",
    rollbackThreshold: "2 consecutive days",
    owner: "growth-finance"
  },
  billing: {
    invoiceCopyReviewed: true,
    customerNoticeDays: 30,
    taxTreatmentReviewed: true
  },
  audit: {
    approvalRecords: ["finance-approval-2026-05-18", "legal-review-2026-05-18"],
    revenueRecognitionNotes: "Discount is applied prospectively and deferred revenue remains unchanged."
  }
};

test("blocks risky pricing experiments with missing controls, margin breach, entitlement regressions, and weak rollback", () => {
  const result = evaluatePricingExperiment(riskyExperiment);
  const types = result.findings.map((finding) => finding.type);

  assert.equal(result.summary.launchDecision, "block");
  assert.ok(types.includes("missing_hypothesis_or_control"));
  assert.ok(types.includes("margin_floor_breach"));
  assert.ok(types.includes("entitlement_regression"));
  assert.ok(types.includes("rollback_gap"));
  assert.ok(types.includes("billing_notice_gap"));
  assert.ok(result.financePacket.requiredActions.some((action) => action.includes("control cohort")));
});

test("approves a bounded experiment with controls, margin headroom, notice, and audit evidence", () => {
  const result = evaluatePricingExperiment(safeExperiment);

  assert.equal(result.summary.launchDecision, "approve");
  assert.equal(result.summary.findingCount, 0);
  assert.equal(result.summary.financeReadiness, "high");
  assert.deepEqual(result.findings, []);
  assert.ok(result.financePacket.requiredActions.includes("Proceed with monitored launch."));
});

test("emits audit-ready findings with owner-facing remediation", () => {
  const result = evaluatePricingExperiment(riskyExperiment);

  for (const finding of result.findings) {
    assert.ok(finding.id);
    assert.ok(["critical", "high", "medium"].includes(finding.severity));
    assert.ok(finding.evidence.length > 0);
    assert.ok(finding.remediation.length > 10);
  }
});
