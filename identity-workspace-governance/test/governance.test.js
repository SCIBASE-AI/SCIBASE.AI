import assert from "node:assert/strict";
import { test } from "node:test";
import {
  appendAuditEvent,
  buildGovernanceDashboard,
  buildIdentityRecord,
  buildProjectSpace,
  buildResearcherProfile,
  createInvitation,
  evaluateAccess,
  isInvitationActive
} from "../src/governance.js";
import { sampleAuditLog, sampleInvitation, sampleProject, sampleUser } from "../src/sample-data.js";

test("identity record captures linked providers and institutional MFA assurance", () => {
  const identity = buildIdentityRecord(sampleUser);

  assert.equal(identity.assuranceLevel, "institutional-mfa");
  assert.equal(identity.hasInstitutionalLogin, true);
  assert.ok(identity.verifiedProviders.includes("orcid"));
  assert.ok(identity.verifiedProviders.includes("github"));
});

test("researcher profile includes ORCID sync and reputation score", () => {
  const profile = buildResearcherProfile(sampleUser);

  assert.equal(profile.syncedFromOrcid, true);
  assert.ok(profile.reputationScore > 60);
  assert.equal(profile.institution, "Northbridge University");
});

test("project space exposes object policy index and governance metadata", () => {
  const project = buildProjectSpace(sampleProject);

  assert.equal(project.counts.objects, 3);
  assert.equal(project.objectIndex["dataset-raw"].type, "dataset");
  assert.deepEqual(project.governance.institutions, ["Northbridge University"]);
});

test("access engine allows owner reads and protects restricted raw data by policy", () => {
  const manuscript = evaluateAccess({ project: sampleProject, user: sampleUser, objectId: "doc-manuscript", action: "read" });
  const rawData = evaluateAccess({ project: sampleProject, user: sampleUser, objectId: "dataset-raw", action: "download" });

  assert.equal(manuscript.allowed, true);
  assert.equal(rawData.allowed, true);
  assert.equal(rawData.role, "owner");
});

test("access engine denies anonymous institutional-only workspace access", () => {
  const anonymous = { ...sampleUser, id: "anon", anonymous: true, linkedAccounts: [], mfaEnabled: false };
  const result = evaluateAccess({ project: sampleProject, user: anonymous, objectId: "doc-manuscript", action: "read" });

  assert.equal(result.allowed, false);
  assert.equal(result.reason, "project-visibility-denied");
});

test("invitations and audit log remain inspectable", () => {
  const invite = createInvitation(sampleInvitation);
  const audit = appendAuditEvent(sampleAuditLog, {
    actorId: sampleUser.id,
    action: "object.download.requested",
    target: "dataset-raw"
  });

  assert.equal(isInvitationActive(invite), true);
  assert.equal(invite.status, "pending");
  assert.equal(audit.length, sampleAuditLog.length + 1);
});

test("dashboard combines profile, project, access, invitation, and audit state", () => {
  const dashboard = buildGovernanceDashboard({
    user: sampleUser,
    project: sampleProject,
    invitation: sampleInvitation,
    auditLog: sampleAuditLog
  });

  assert.equal(dashboard.identity.assuranceLevel, "institutional-mfa");
  assert.equal(dashboard.invitation.active, true);
  assert.ok(dashboard.summary.allowedActions > 0);
});
