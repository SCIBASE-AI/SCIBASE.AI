const fs = require("node:fs");
const path = require("node:path");
const { buildCalibrationBench } = require("../src/review-calibration");

const samplePath = path.join(__dirname, "..", "data", "sample-calibration.json");
const input = JSON.parse(fs.readFileSync(samplePath, "utf8"));
const report = buildCalibrationBench(input);

console.log(`Program: ${report.programId}`);
console.log(`Status: ${report.dashboard.status}`);
console.log(`Reviewers calibrated: ${report.dashboard.reviewerCount}`);
console.log(`Coaching actions: ${report.dashboard.coachingActionCount}`);
console.log(`Quarantined reviewers: ${report.dashboard.quarantinedReviewerCount}`);
console.log(`Top reviewer: ${report.leaderboard[0].reviewerId} (${report.leaderboard[0].tier})`);
console.log(`Top action: ${report.dashboard.topAction}`);
console.log(`Digest: ${report.digest}`);
