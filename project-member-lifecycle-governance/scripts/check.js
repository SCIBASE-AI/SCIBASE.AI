"use strict";

const workspace = require("../data/sample-workspace.json");
const { evaluateWorkspace } = require("../src/member-lifecycle");

const evaluation = evaluateWorkspace(workspace, { now: "2026-05-15T00:00:00.000Z" });

if (evaluation.summary.projectCount !== 3) {
  throw new Error(`Expected 3 projects, found ${evaluation.summary.projectCount}`);
}
if (evaluation.summary.transferPlanCount < 2) {
  throw new Error("Expected at least two transfer plans");
}
if (evaluation.summary.invitationRevocationCount < 2) {
  throw new Error("Expected stale/sponsored invitation revocations");
}
if (!evaluation.projects.some((project) => project.blockers.some((blocker) => blocker.code === "missing-active-owner"))) {
  throw new Error("Expected missing active owner blocker");
}
if (!evaluation.projects.every((project) => project.auditEvents.every((event) => event.digest))) {
  throw new Error("Expected every audit event to include a digest");
}

console.log(
  `check passed: ${evaluation.summary.projectCount} projects, ${evaluation.summary.transferPlanCount} transfer plans, ${evaluation.summary.grantRevocationCount} grant revocations`
);
