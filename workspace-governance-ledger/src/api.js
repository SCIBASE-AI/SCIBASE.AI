import { buildDemoReport } from "./demo.js";
import { projects, users } from "./sample-data.js";
import {
  buildAuditTrail,
  buildProjectSpace,
  buildResearcherProfile,
  createInvitation,
  evaluateAccess,
  summarizeWorkspaceGovernance
} from "./governance-ledger.js";

export function handleGovernanceRequest(route) {
  const project = projects[0];
  switch (route) {
    case "summary":
      return summarizeWorkspaceGovernance(users, projects);
    case "profile":
      return buildResearcherProfile(users[0]);
    case "project":
      return buildProjectSpace(project);
    case "access":
      return evaluateAccess(project, "user-noor", "edit", "data-cohort");
    case "invite":
      return createInvitation(project, {
        email: "external.reviewer@example.org",
        role: "reviewer",
        invitedBy: "user-ada",
        expiresAt: "2026-05-21T00:00:00Z"
      });
    case "audit":
      return buildAuditTrail(project);
    case "demo":
      return buildDemoReport();
    default:
      throw new Error(`Unknown route: ${route}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [route = "demo"] = process.argv.slice(2);
  console.log(JSON.stringify(handleGovernanceRequest(route), null, 2));
}
