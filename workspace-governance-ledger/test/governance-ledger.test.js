import assert from "node:assert/strict";
import test from "node:test";
import { handleGovernanceRequest } from "../src/api.js";
import { buildDemoReport } from "../src/demo.js";
import { projects, users } from "../src/sample-data.js";
import {
  buildAuditTrail,
  buildProjectSpace,
  buildResearcherProfile,
  calculateReputation,
  createInvitation,
  evaluateAccess,
  summarizeWorkspaceGovernance
} from "../src/governance-ledger.js";

test("builds researcher profiles with linked identities and reputation", () => {
  const profile = buildResearcherProfile(users[0]);

  assert.equal(profile.mfaEnabled, true);
  assert.equal(profile.linkedIdentities.length, 2);
  assert.equal(profile.reputation.score, calculateReputation(users[0]).score);
});

test("summarizes project spaces and workspace governance", () => {
  const projectSpace = buildProjectSpace(projects[0]);
  const summary = summarizeWorkspaceGovernance(users, projects);

  assert.equal(projectSpace.datasets, 1);
  assert.equal(summary.userCount, 2);
  assert.equal(summary.mfaAdoptionRate, 50);
});

test("evaluates RBAC and object-level permissions", () => {
  const reviewAccess = evaluateAccess(projects[0], "user-noor", "review", "doc-manuscript");
  const editAccess = evaluateAccess(projects[0], "user-noor", "edit", "data-cohort");

  assert.equal(reviewAccess.allowed, true);
  assert.equal(editAccess.allowed, false);
});

test("creates invitations and audit trails", () => {
  const invitation = createInvitation(projects[0], {
    email: "Reviewer@Example.org",
    role: "reviewer",
    invitedBy: "user-ada",
    expiresAt: "2026-05-21T00:00:00Z"
  });
  const audit = buildAuditTrail(projects[0]);

  assert.equal(invitation.email, "reviewer@example.org");
  assert.equal(audit.length, 3);
  assert.equal(audit[0].sequence, 1);
});

test("demo and API expose reviewer surfaces", () => {
  const report = buildDemoReport();
  const apiAccess = handleGovernanceRequest("access");

  assert.equal(report.summary.projectCount, 2);
  assert.equal(report.access[0].allowed, true);
  assert.equal(apiAccess.reason, "requires_contributor");
});
