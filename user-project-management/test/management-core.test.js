import test from "node:test";
import assert from "node:assert/strict";
import {
  authenticateIdentity,
  buildProjectDashboard,
  computeReputation,
  createProjectSpace,
  demoWorkspace,
  evaluateAccess,
  inviteCollaborator,
  syncOrcidProfile
} from "../src/management-core.js";

test("authenticates linked identities with MFA", () => {
  const ok = authenticateIdentity({ provider: "ORCID", identifier: demoWorkspace.users[0].orcid, mfaCode: "123456" });
  const missingMfa = authenticateIdentity({ provider: "ORCID", identifier: demoWorkspace.users[0].orcid });

  assert.equal(ok.authenticated, true);
  assert.equal(missingMfa.authenticated, false);
  assert.equal(missingMfa.reason, "mfa_required");
});

test("syncs ORCID profile data and computes reputation", () => {
  const sync = syncOrcidProfile("user-alice");
  const reputation = computeReputation("user-alice");

  assert.equal(sync.orcid, demoWorkspace.users[0].orcid);
  assert.ok(sync.importedPublications.length >= 2);
  assert.ok(reputation.score > 100);
});

test("creates project spaces and evaluates object-level permissions", () => {
  const { workspace, project } = createProjectSpace({ title: "Metabolomics validation", ownerId: "user-alice", tags: ["metabolomics"] });
  const ownerAccess = evaluateAccess({ userId: "user-alice", projectId: project.id, action: "archive" }, workspace);
  const contributorAccess = evaluateAccess({ userId: "user-mateo", projectId: "project-organoid-response", action: "edit_code", objectType: "code" });

  assert.equal(project.visibility, "private");
  assert.equal(ownerAccess.granted, true);
  assert.equal(contributorAccess.granted, true);
});

test("invites collaborators with audit logs and builds dashboard payload", () => {
  const workspace = inviteCollaborator({
    actorId: "user-alice",
    projectId: "project-organoid-response",
    principalId: "external-statistician",
    role: "Reviewer",
    scope: "documents"
  });
  const project = workspace.projects[0];
  const dashboard = buildProjectDashboard(workspace);

  assert.ok(project.collaborators.includes("external-statistician"));
  assert.ok(project.auditLog.some((entry) => entry.action === "access.invited"));
  assert.equal(dashboard.auth.authenticated, true);
  assert.ok(dashboard.policyChecks.length >= 3);
});
