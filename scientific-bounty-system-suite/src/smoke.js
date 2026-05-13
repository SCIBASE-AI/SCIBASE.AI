import assert from "node:assert/strict";
import { buildDashboard } from "./system.js";

const dashboard = buildDashboard();

assert.equal(dashboard.challenge.status, "publishable");
assert.equal(dashboard.submission.status, "ready-for-review");
assert.equal(dashboard.arbitration.awardRecommendation, "award-final-milestone");
assert.equal(dashboard.payouts.payoutStatus, "ready-for-sponsor-approval");
assert.equal(dashboard.payouts.teamRoutes.reduce((total, route) => total + route.amount, 0), 45000);

console.log(
  JSON.stringify(
    {
      challengeReadiness: dashboard.challenge.readinessScore,
      packageScore: dashboard.submission.packageScore,
      arbitrationScore: dashboard.arbitration.totalScore,
      finalPayoutPool: dashboard.payouts.milestone.pool,
    },
    null,
    2,
  ),
);
