"use strict";

const assert = require("node:assert/strict");
const {
  buildAuditAnomalyMonitor,
  buildReviewerMarkdown,
  scoreEvent
} = require("./index");
const sampleData = require("./sample-data");

const report = buildAuditAnomalyMonitor(sampleData);

assert.equal(report.stats.projectCount, 2);
assert.equal(report.stats.eventCount, 7);
assert.ok(report.stats.criticalCount >= 2);
assert.ok(report.stats.heldExportCount >= 1);

const topEvent = report.scoredEvents[0];
assert.equal(topEvent.eventId, "evt:001");
assert.equal(topEvent.severity, "critical");
assert.equal(topEvent.recommendedAction, "freeze_access_and_open_security_review");
assert.ok(topEvent.reasons.includes("MFA not enabled"));
assert.ok(topEvent.reasons.includes("external collaborator access is expired"));
assert.ok(topEvent.reasons.includes("restricted object touched"));
assert.ok(topEvent.reasons.includes("role reviewer is below required admin"));

const driftEvent = report.scoredEvents.find((event) => event.eventId === "evt:004");
assert.ok(driftEvent.reasons.some((reason) => reason.includes("object permission drift")));
assert.ok(["high", "critical"].includes(driftEvent.severity));

const roleChange = report.scoredEvents.find((event) => event.eventId === "evt:003");
assert.ok(roleChange.reasons.includes("external collaborator gained contributor-or-higher role"));
assert.ok(roleChange.reasons.includes("role change lacks approval ticket"));

const materialsPacket = report.projectPackets.find((packet) => packet.projectId === "project:materials-sensor");
assert.equal(materialsPacket.holdExport, true);
assert.ok(materialsPacket.ownerQueue.length >= 1);

const markdown = buildReviewerMarkdown(report);
assert.ok(markdown.includes("Project Access Audit Anomaly Packet"));
assert.ok(markdown.includes("Neuro Alpha Collaboration"));
assert.ok(markdown.includes("Materials Sensor Working Group"));

const context = {
  users: new Map(sampleData.users.map((user) => [user.id, user])),
  projects: new Map(sampleData.projects.map((project) => [project.id, project])),
  objects: new Map(sampleData.objects.map((object) => [object.id, object])),
  events: sampleData.events
};
const lowRisk = scoreEvent(
  {
    id: "evt:low",
    type: "project_visibility_change",
    timestamp: "2026-05-20T09:00:00Z",
    projectId: "project:neuro-alpha",
    actorId: "user:owner-amy"
  },
  context
);
assert.equal(lowRisk.severity, "low");
assert.equal(lowRisk.recommendedAction, "retain_for_audit");

console.log("project-access-audit-anomaly-monitor tests passed");
