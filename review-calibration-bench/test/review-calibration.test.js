const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  buildCalibrationBench,
  classifyDrift,
  validateCalibrationInput
} = require("../src/review-calibration");

const samplePath = path.join(__dirname, "..", "data", "sample-calibration.json");
const input = JSON.parse(fs.readFileSync(samplePath, "utf8"));
const report = buildCalibrationBench(input);

assert.equal(report.validation.status, "passed");
assert.equal(report.reviewerReports.length, 3);
assert.equal(report.dashboard.status, "coaching-needed");
assert.equal(report.dashboard.reviewerCount, 3);
assert.equal(report.dashboard.quarantinedReviewerCount, 1);
assert.ok(report.coachingQueue.some((action) => action.type === "reproducibility-blind-spot"));

const ada = report.reviewerReports.find((item) => item.reviewerId === "ada");
assert.equal(ada.calibrationScore, 0.925);
assert.equal(ada.reputationSignal.tier, "trusted-reviewer");
assert.equal(ada.coachingActions.length, 0);

const bohr = report.reviewerReports.find((item) => item.reviewerId === "bohr");
assert.equal(bohr.reproducibilityBlindSpot, true);
assert.equal(bohr.reputationSignal.tier, "needs-light-coaching");
assert.ok(bohr.coachingActions.some((action) => action.type === "leniency-calibration"));
assert.ok(bohr.coachingActions.some((action) => action.type === "reproducibility-blind-spot"));

const curie = report.reviewerReports.find((item) => item.reviewerId === "curie");
assert.equal(curie.reputationSignal.tier, "calibrated-reviewer");
assert.ok(curie.coachingActions.some((action) => action.type === "severity-calibration"));

assert.equal(report.leaderboard[0].reviewerId, "ada");
assert.equal(report.trustAdjustments.find((item) => item.reviewerId === "bohr").status, "quarantine-until-coached");
assert.equal(report.digest, buildCalibrationBench(input).digest);

assert.equal(classifyDrift(1, 1), "lenient");
assert.equal(classifyDrift(-1, 1), "severe");
assert.equal(classifyDrift(0.2, 1.5), "inconsistent");
assert.equal(classifyDrift(0.2, 0.3), "calibrated");

const incomplete = validateCalibrationInput({ programId: "draft" });
assert.equal(incomplete.status, "incomplete");
assert.ok(incomplete.missing.includes("rubric.criteria"));

console.log("review-calibration-bench tests passed");
