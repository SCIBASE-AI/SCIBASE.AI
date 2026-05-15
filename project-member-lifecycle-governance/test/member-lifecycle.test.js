"use strict";

const assert = require("node:assert/strict");
const { describe, it } = require("node:test");
const workspace = require("../data/sample-workspace.json");
const { evaluateWorkspace, userRiskScore, verifiedIdentityCount } = require("../src/member-lifecycle");

describe("project member lifecycle governance", () => {
  it("scores departing and inactive users higher than verified active users", () => {
    const maya = workspace.users.find((user) => user.id === "user-maya");
    const ibrahim = workspace.users.find((user) => user.id === "user-ibrahim");
    const victor = workspace.users.find((user) => user.id === "user-victor");

    assert.equal(verifiedIdentityCount(maya), 2);
    assert.ok(userRiskScore(ibrahim) > userRiskScore(maya));
    assert.ok(userRiskScore(victor) > userRiskScore(maya));
  });

  it("creates a ready owner transfer plan when an active maintainer can receive ownership", () => {
    const evaluation = evaluateWorkspace(workspace, { now: "2026-05-15T00:00:00.000Z" });
    const project = evaluation.projects.find((item) => item.id === "project-organoid-map");
    const ownerPlan = project.transferPlans.find((plan) => plan.userId === "user-ibrahim");

    assert.equal(ownerPlan.reason, "owner-continuity");
    assert.equal(ownerPlan.status, "ready");
    assert.equal(ownerPlan.replacementUserId, "user-noor");
    assert.ok(project.objectTransferActions.some((action) => action.objectId === "dataset-organoid"));
  });

  it("blocks offboarding when a project would be left without an active owner", () => {
    const evaluation = evaluateWorkspace(workspace, { now: "2026-05-15T00:00:00.000Z" });
    const project = evaluation.projects.find((item) => item.id === "project-climate-sensors");

    assert.equal(project.activeOwnerCount, 0);
    assert.ok(project.blockers.some((blocker) => blocker.code === "missing-active-owner"));
    assert.ok(project.objectTransferActions.some((action) => action.action === "quarantine-until-owner-assigned"));
  });

  it("revokes stale invitations and invitations sponsored by departing users", () => {
    const evaluation = evaluateWorkspace(workspace, { now: "2026-05-15T00:00:00.000Z" });
    const neuroProject = evaluation.projects.find((item) => item.id === "project-neuro-atlas");
    const orgProject = evaluation.projects.find((item) => item.id === "project-organoid-map");

    assert.equal(neuroProject.invitationActions.find((invite) => invite.invitationId === "invite-ext-01").action, "revoke");
    assert.equal(neuroProject.invitationActions.find((invite) => invite.invitationId === "invite-ext-02").action, "keep");
    assert.equal(orgProject.invitationActions.find((invite) => invite.invitationId === "invite-lab-03").action, "revoke");
  });

  it("produces deterministic audit digests for review evidence", () => {
    const first = evaluateWorkspace(workspace, { now: "2026-05-15T00:00:00.000Z" });
    const second = evaluateWorkspace(workspace, { now: "2026-05-15T00:00:00.000Z" });
    const firstDigest = first.projects[0].auditEvents[0].digest;
    const secondDigest = second.projects[0].auditEvents[0].digest;

    assert.equal(firstDigest, secondDigest);
    assert.match(firstDigest, /^[a-f0-9]{24}$/);
    assert.ok(first.summary.grantRevocationCount >= 4);
  });
});
