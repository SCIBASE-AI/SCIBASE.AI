import {
  buildAuditTrail,
  buildProjectSpace,
  buildResearcherProfile,
  createInvitation,
  evaluateAccess,
  summarizeWorkspaceGovernance
} from "./governance-ledger.js";
import { projects, users } from "./sample-data.js";

export function buildDemoReport() {
  const project = projects[0];
  return {
    summary: summarizeWorkspaceGovernance(users, projects),
    profile: buildResearcherProfile(users[0]),
    projectSpace: buildProjectSpace(project),
    access: [
      evaluateAccess(project, "user-noor", "review", "doc-manuscript"),
      evaluateAccess(project, "user-noor", "edit", "data-cohort")
    ],
    invitation: createInvitation(project, {
      email: "external.reviewer@example.org",
      role: "reviewer",
      invitedBy: "user-ada",
      expiresAt: "2026-05-21T00:00:00Z"
    }),
    auditTrail: buildAuditTrail(project)
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(buildDemoReport(), null, 2));
}
