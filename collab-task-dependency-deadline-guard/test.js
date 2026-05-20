"use strict";

const assert = require("assert");
const {
  evaluateMilestoneReadiness,
  detectDependencyCycles,
  collaboratorLoad
} = require("./index");
const {
  milestone,
  collaborators,
  anchors,
  comments,
  tasks
} = require("./sample-data");

const audit = evaluateMilestoneReadiness({
  milestone,
  collaborators,
  anchors,
  comments,
  tasks
});

assert.strictEqual(audit.generatedBy, "collab-task-dependency-deadline-guard");
assert.strictEqual(audit.milestoneId, "ms-final-submission");
assert.strictEqual(audit.metrics.totalTasks, 5);
assert.ok(audit.metrics.blockedTasks >= 1, "fixture should contain blocked tasks");
assert.ok(audit.findings.some((finding) => finding.code === "blocked-tasks"));
assert.ok(audit.findings.some((finding) => finding.code === "assignee-overload"));
assert.ok(audit.taskEvaluations.find((task) => task.taskId === "t-3").incompleteDependencyIds.includes("t-1"));
assert.ok(audit.taskEvaluations.find((task) => task.taskId === "t-2").riskReasons.some((reason) => reason.includes("notebook output")));
assert.ok(audit.reviewerActions.every((action) => action.length > 20));

const cyclicTasks = [
  { id: "a", dependsOn: ["b"] },
  { id: "b", dependsOn: ["a"] }
];
assert.strictEqual(detectDependencyCycles(cyclicTasks).length, 1);

const load = collaboratorLoad(tasks, collaborators);
assert.ok(load.find((person) => person.collaboratorId === "u-luis").overloaded);

console.log("collab-task-dependency-deadline-guard tests passed");
