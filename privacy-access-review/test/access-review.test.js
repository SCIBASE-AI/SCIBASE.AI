import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildAccessReviewCampaign,
  buildAuditEvidence,
  buildDashboard,
  buildProfilePrivacyReport,
  evaluateAccess,
  evaluateInvitationRisk
} from "../src/access-review.js";
import { reviewClock, sampleProject, sampleUsers } from "../src/sample-data.js";

test("allows an owner with MFA to download a restricted dataset", () => {
  const decision = evaluateAccess({
    project: sampleProject,
    users: sampleUsers,
    userKey: "owner",
    objectKey: "datasetRaw",
    action: "download",
    now: reviewClock
  });

  assert.equal(decision.allowed, true);
  assert.equal(decision.role, "owner");
  assert.match(decision.evidenceHash, /^[a-f0-9]{64}$/);
});

test("denies an external reviewer downloading restricted data without MFA", () => {
  const decision = evaluateAccess({
    project: sampleProject,
    users: sampleUsers,
    userKey: "externalReviewer",
    objectKey: "datasetRaw",
    action: "download",
    now: reviewClock
  });

  assert.equal(decision.allowed, false);
  assert.ok(decision.reasons.some((reason) => reason.includes("Membership status is invited")));
  assert.ok(decision.riskScore >= 50);
});

test("denies suspended viewer access", () => {
  const decision = evaluateAccess({
    project: sampleProject,
    users: sampleUsers,
    userKey: "viewer",
    objectKey: "manuscriptDraft",
    action: "read",
    now: reviewClock
  });

  assert.equal(decision.allowed, false);
  assert.deepEqual(decision.reasons, ["Membership status is suspended"]);
});

test("redacts anonymous reviewer profile in privacy report", () => {
  const report = buildProfilePrivacyReport(sampleUsers).find((entry) => entry.key === "externalReviewer");

  assert.equal(report.user.displayName, "Anonymous reviewer");
  assert.equal(report.user.institution, "redacted");
  assert.ok(report.findings.some((finding) => finding.includes("redact direct identity")));
});

test("flags stale contributor invitation for revocation", () => {
  const invite = evaluateInvitationRisk({
    project: sampleProject,
    users: sampleUsers,
    inviteKey: "staleContributorInvite",
    now: reviewClock
  });

  assert.equal(invite.status, "revoke");
  assert.ok(invite.findings.some((finding) => finding.message.includes("expired")));
  assert.ok(invite.riskScore >= 80);
});

test("builds immutable audit evidence with a chain hash", () => {
  const audit = buildAuditEvidence(sampleProject);

  assert.equal(audit.eventCount, sampleProject.auditEvents.length);
  assert.match(audit.chainHash, /^[a-f0-9]{64}$/);
  assert.ok(audit.events.every((event) => /^[a-f0-9]{64}$/.test(event.hash)));
});

test("access review campaign includes invitation and high-risk recommendations", () => {
  const campaign = buildAccessReviewCampaign({
    project: sampleProject,
    users: sampleUsers,
    now: reviewClock
  });

  assert.equal(campaign.projectId, sampleProject.id);
  assert.ok(campaign.decisionCount > 0);
  assert.ok(campaign.recommendations.some((item) => item.type === "revoke-invitation"));
});

test("dashboard summarizes privacy posture", () => {
  const dashboard = buildDashboard({ project: sampleProject, users: sampleUsers, now: reviewClock });

  assert.equal(dashboard.summary.members, sampleProject.memberships.length);
  assert.ok(dashboard.summary.profileReportsNeedingReview >= 1);
  assert.ok(dashboard.audit.chainHash);
});

test("throws on unknown access inputs", () => {
  assert.throws(
    () =>
      evaluateAccess({
        project: sampleProject,
        users: sampleUsers,
        userKey: "missing",
        objectKey: "datasetRaw",
        action: "read",
        now: reviewClock
      }),
    /Unknown user/
  );
});
