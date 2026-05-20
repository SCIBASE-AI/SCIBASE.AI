"use strict";

const assert = require("node:assert/strict");
const {
  buildDashboardAttributionMonitor,
  buildReviewerMarkdown,
  eventCredit,
  visibleToAdmin
} = require("./index");
const sampleData = require("./sample-data");

const report = buildDashboardAttributionMonitor(sampleData);

assert.equal(report.stats.eventCount, 8);
assert.ok(report.stats.anomalyCount >= 5);
assert.ok(report.stats.highSeverityCount >= 2);
assert.equal(report.stats.serviceAccountEvents, 2);
assert.equal(report.stats.hiddenBoundaryEvents, 1);
assert.equal(report.reviewPacket.holdExecutiveDashboard, true);

const kinds = new Set(report.anomalies.map((item) => item.kind));
assert.ok(kinds.has("service_account_credit"));
assert.ok(kinds.has("private_project_boundary"));
assert.ok(kinds.has("duplicate_identity_credit"));
assert.ok(kinds.has("collaboration_inflation"));
assert.ok(kinds.has("usage_spike"));

const amy = report.metrics.researcherCredits.find((item) => item.researcherId === "researcher:amy-chen");
assert.ok(amy.credit > 100);

const serviceCredit = report.credits.find((item) => item.actorId === "user:sync-bot");
assert.equal(serviceCredit.dashboardCredit, 0);
assert.equal(serviceCredit.serviceAccount, true);

const hiddenCredit = report.credits.find((item) => item.eventId === "evt:008");
assert.equal(hiddenCredit.privateBoundary, true);

const users = new Map(sampleData.users.map((user) => [user.id, user]));
const projects = new Map(sampleData.projects.map((project) => [project.id, project]));
const admin = sampleData.admin;
assert.equal(visibleToAdmin(projects.get("project:neuro-alpha"), admin), true);
assert.equal(visibleToAdmin(projects.get("project:external-secret"), admin), false);

const credit = eventCredit(sampleData.events[1], {
  users,
  projects,
  identityLinks: sampleData.identityLinks,
  admin
});
assert.equal(credit.canonicalResearcherId, "researcher:amy-chen");
assert.equal(credit.duplicateAlias, true);

const markdown = buildReviewerMarkdown(report);
assert.ok(markdown.includes("Enterprise Dashboard Attribution Review"));
assert.ok(markdown.includes("Executive dashboard hold: yes"));
assert.ok(markdown.includes("service_account_credit"));

console.log("enterprise-dashboard-attribution-anomaly-monitor tests passed");
