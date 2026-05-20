"use strict";

const assert = require("assert/strict");
const { evaluateResearcherProfiles } = require("./index");

function baseProfile(overrides = {}) {
  return {
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
    grants: [
      {
        grantId: "NRF-2026-RNA-01",
        funder: "National Research Foundation",
        verified: true,
      },
    ],
    activityFeed: [
      {
        id: "activity-publication",
        kind: "publication",
        visibility: "public",
        projectVisibility: "public",
      },
      {
        id: "activity-private-note",
        kind: "project_note",
        visibility: "private",
        projectVisibility: "private",
      },
    ],
    reputationMetrics: {
      citationCount: 128,
      downloadCount: 4320,
      forkCount: 17,
      endorsementCount: 8,
      reproducibilityScore: 0.91,
      lastComputedAt: "2026-05-18",
    },
    ...overrides,
  };
}

{
  const report = evaluateResearcherProfiles({ profiles: [baseProfile()] });
  const evaluation = report.evaluations[0];

  assert.equal(report.profileCount, 1);
  assert.equal(evaluation.status, "ready");
  assert.equal(evaluation.verifiedAffiliationCount, 1);
  assert.equal(evaluation.reputationSummary.citationCount, 128);
  assert.match(evaluation.auditDigest, /^[a-f0-9]{64}$/);
  assert.match(report.auditDigest, /^[a-f0-9]{64}$/);
}

{
  const first = evaluateResearcherProfiles({ profiles: [baseProfile()] });
  const second = evaluateResearcherProfiles({ profiles: [baseProfile()] });

  assert.equal(first.auditDigest, second.auditDigest);
}

{
  const report = evaluateResearcherProfiles({
    profiles: [
      baseProfile({
        emailVerified: false,
        orcidLastSyncedAt: "2026-03-01",
        affiliations: [{ institution: "Unverified Lab", primary: true, verified: false }],
        reputationMetrics: {
          citationCount: 4,
          downloadCount: 10,
          forkCount: 0,
          endorsementCount: 0,
          reproducibilityScore: 0.42,
          lastComputedAt: "2026-04-01",
        },
      }),
    ],
  });

  const findings = report.evaluations[0].findings.map((finding) => finding.code);
  assert.equal(report.evaluations[0].status, "held");
  assert.ok(findings.includes("email_not_verified"));
  assert.ok(findings.includes("stale_orcid_sync"));
  assert.ok(findings.includes("unverified_primary_affiliation"));
  assert.ok(findings.includes("low_reproducibility_score"));
  assert.ok(findings.includes("stale_reputation_metrics"));
}

{
  const report = evaluateResearcherProfiles({
    profiles: [
      baseProfile({
        profileMode: "private",
        activityFeed: [
          {
            id: "activity-leak",
            kind: "project_note",
            visibility: "public",
            projectVisibility: "private",
          },
        ],
      }),
    ],
  });

  const findings = report.evaluations[0].findings.map((finding) => finding.code);
  assert.equal(report.evaluations[0].status, "held");
  assert.ok(findings.includes("private_project_activity_leak"));
  assert.ok(findings.includes("private_profile_activity_visibility"));
}

{
  const report = evaluateResearcherProfiles({
    profiles: [
      baseProfile({
        profileMode: "anonymous_review",
        displayName: "Dr. Mira Choi",
        anonymousReviewEscrowId: undefined,
        activityFeed: [
          {
            id: "review-activity",
            kind: "peer_review",
            visibility: "public",
            projectVisibility: "public",
            identityHint: "Choi lab mentioned in review text",
          },
        ],
      }),
    ],
  });

  const findings = report.evaluations[0].findings.map((finding) => finding.code);
  assert.equal(report.evaluations[0].status, "held");
  assert.ok(findings.includes("missing_anonymous_review_escrow"));
  assert.ok(findings.includes("anonymous_mode_public_name"));
  assert.ok(findings.includes("anonymous_activity_identity_hint"));
  assert.equal(report.evaluations[0].displayName, null);
}

{
  const report = evaluateResearcherProfiles({
    profiles: [
      baseProfile({
        userId: undefined,
        profileMode: "global",
        orcidId: "not-orcid",
        affiliations: [{ primary: true, verified: true }],
        reputationMetrics: {
          citationCount: 1,
          downloadCount: 1,
          forkCount: 1,
          endorsementCount: 1,
          reproducibilityScore: 1.2,
          lastComputedAt: "2026-05-18",
        },
      }),
    ],
  });

  const findings = report.evaluations[0].findings.map((finding) => finding.code);
  assert.equal(report.evaluations[0].status, "blocked");
  assert.ok(findings.includes("missing_user_id"));
  assert.ok(findings.includes("invalid_profile_mode"));
  assert.ok(findings.includes("invalid_orcid_format"));
  assert.ok(findings.includes("missing_affiliation_institution"));
  assert.ok(findings.includes("invalid_reproducibility_score"));
}

{
  assert.throws(
    () =>
      evaluateResearcherProfiles({
        profiles: [
          baseProfile({
            reputationMetrics: {
              citationCount: -1,
              downloadCount: 0,
              forkCount: 0,
              endorsementCount: 0,
              reproducibilityScore: 0.9,
              lastComputedAt: "2026-05-18",
            },
          }),
        ],
      }),
    /citationCount must be a non-negative integer/
  );
}

console.log("researcher-profile-reputation-sync tests passed");
