import { buildDashboard } from "./assistant.js";

const dashboard = buildDashboard();

if (dashboard.peerReview.findings.length < 1) {
  throw new Error("expected peer review findings");
}

if (dashboard.reproducibility.confidence < 70) {
  throw new Error("demo project should be mostly reproducible");
}

if (dashboard.researchGaps.opportunities.length !== 3) {
  throw new Error("expected three ranked research opportunities");
}

console.log(
  JSON.stringify(
    {
      peerReviewScore: dashboard.peerReview.score,
      reproducibilityConfidence: dashboard.reproducibility.confidence,
      topGap: dashboard.researchGaps.opportunities[0].title,
    },
    null,
    2,
  ),
);
