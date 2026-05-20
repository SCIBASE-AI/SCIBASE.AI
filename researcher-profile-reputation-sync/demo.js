"use strict";

const { evaluateResearcherProfiles } = require("./index");

const report = evaluateResearcherProfiles({
  profiles: [
    {
      userId: "researcher-001",
      displayName: "Dr. Mira Choi",
      profileMode: "public",
      field: "computational biology",
      emailVerified: true,
      orcidId: "0000-0002-1825-0097",
      orcidLastSyncedAt: "2026-05-15",
      fundedResearcher: true,
      affiliations: [
        {
          institution: "Seoul Bioinformatics Institute",
          role: "Principal Investigator",
          primary: true,
          verified: true,
          verifiedAt: "2026-05-10",
        },
      ],
      grants: [{ grantId: "NRF-2026-RNA-01", funder: "National Research Foundation", verified: true }],
      activityFeed: [
        { id: "activity-publication", kind: "publication", visibility: "public", projectVisibility: "public" },
        { id: "activity-private-note", kind: "project_note", visibility: "private", projectVisibility: "private" },
      ],
      reputationMetrics: {
        citationCount: 128,
        downloadCount: 4320,
        forkCount: 17,
        endorsementCount: 8,
        reproducibilityScore: 0.91,
        lastComputedAt: "2026-05-18",
      },
    },
    {
      userId: "researcher-privacy-hold",
      displayName: "Dr. Private Reviewer",
      profileMode: "private",
      field: "materials science",
      emailVerified: false,
      orcidId: "0000-0001-5109-3700",
      orcidLastSyncedAt: "2026-03-01",
      affiliations: [{ institution: "Unverified Lab", primary: true, verified: false }],
      activityFeed: [
        { id: "activity-leak", kind: "project_note", visibility: "public", projectVisibility: "private" },
      ],
      reputationMetrics: {
        citationCount: 4,
        downloadCount: 10,
        forkCount: 0,
        endorsementCount: 0,
        reproducibilityScore: 0.42,
        lastComputedAt: "2026-04-01",
      },
    },
    {
      profileMode: "anonymous_review",
      displayName: "Dr. Mira Choi",
      emailVerified: true,
      orcidId: "bad-orcid",
      affiliations: [{ primary: true, verified: true }],
      activityFeed: [
        {
          id: "review-activity",
          kind: "peer_review",
          visibility: "public",
          projectVisibility: "public",
          identityHint: "Choi lab mentioned in review text",
        },
      ],
      reputationMetrics: {
        citationCount: 1,
        downloadCount: 1,
        forkCount: 1,
        endorsementCount: 1,
        reproducibilityScore: 1.2,
        lastComputedAt: "2026-05-18",
      },
    },
  ],
});

console.log("Researcher Profile Reputation Sync Demo");
console.log("=======================================");
console.log(`profiles: ${report.profileCount}`);
console.log(`ready: ${report.totals.readyCount}, held: ${report.totals.heldCount}, blocked: ${report.totals.blockedCount}`);
console.log(`affiliations: ${report.totals.affiliations}`);
console.log(`grants: ${report.totals.grants}`);
console.log(`activity items: ${report.totals.activityItems}`);
console.log(`audit digest: ${report.auditDigest.slice(0, 16)}...`);

for (const evaluation of report.evaluations) {
  console.log(`- ${evaluation.userId || "(missing-user)"}: ${evaluation.status}, mode ${evaluation.profileMode}`);
}
