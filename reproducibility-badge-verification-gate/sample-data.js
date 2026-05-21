const badgePolicy = {
  badgeLevels: ["bronze", "silver", "gold"],
  minIndependentRunsByBadge: {
    bronze: 1,
    silver: 2,
    gold: 3,
  },
  allowedReproducerRoles: ["independent-reproducer", "community-reviewer", "external-methods-reviewer"],
  minArtifactCoverage: 1,
  minInstitutionsForMultiRunBadge: 2,
  maxRunAgeDays: 90,
  allowLowerBadgeRecommendation: true,
}

const projects = [
  {
    id: "RB-PASS-001",
    title: "Open enzyme model reproducibility packet",
    authors: [
      { id: "author-a", institution: "North Lab" },
      { id: "author-b", institution: "North Lab" },
    ],
    badgeRequest: {
      level: "silver",
      reviewedAt: "2026-05-21T18:35:00.000Z",
    },
    artifacts: [
      { id: "dataset", type: "dataset", checksum: "sha256:dataset-pass", version: "v1.0.0", required: true },
      { id: "analysis", type: "notebook", checksum: "sha256:notebook-pass", version: "v1.0.0", required: true },
      { id: "environment", type: "lockfile", checksum: "sha256:lock-pass", version: "v1.0.0", required: true },
    ],
    environments: [
      { id: "container", runtime: "python-3.12", digest: "sha256:env-pass", lockfileChecksum: "sha256:lock-pass" },
    ],
    reproductionRuns: [
      {
        id: "run-a",
        reproducerId: "rep-101",
        role: "independent-reproducer",
        institution: "West Methods Institute",
        relatedAuthorIds: [],
        recentCollaboratorAuthorIds: [],
        fundingRelationship: false,
        artifactChecks: [
          { artifactId: "dataset", checksumMatches: true },
          { artifactId: "analysis", checksumMatches: true },
          { artifactId: "environment", checksumMatches: true },
        ],
        environmentDigestMatches: true,
        outputDigestMatches: true,
        testsPassed: true,
        runLogChecksum: "sha256:run-a-log",
        disclosureSigned: true,
        completedAt: "2026-05-18T09:00:00.000Z",
      },
      {
        id: "run-b",
        reproducerId: "rep-202",
        role: "external-methods-reviewer",
        institution: "South Reproducibility Center",
        relatedAuthorIds: [],
        recentCollaboratorAuthorIds: [],
        fundingRelationship: false,
        artifactChecks: [
          { artifactId: "dataset", checksumMatches: true },
          { artifactId: "analysis", checksumMatches: true },
          { artifactId: "environment", checksumMatches: true },
        ],
        environmentDigestMatches: true,
        outputDigestMatches: true,
        testsPassed: true,
        runLogChecksum: "sha256:run-b-log",
        disclosureSigned: true,
        completedAt: "2026-05-19T11:30:00.000Z",
      },
    ],
  },
  {
    id: "RB-REV-002",
    title: "Ecology sampling reproducibility packet",
    authors: [
      { id: "author-c", institution: "Coastal University" },
    ],
    badgeRequest: {
      level: "silver",
      reviewedAt: "2026-05-21T18:35:00.000Z",
    },
    artifacts: [
      { id: "dataset", type: "dataset", checksum: "sha256:eco-dataset", version: "v1.1.0", required: true },
      { id: "script", type: "script", checksum: "sha256:eco-script", version: "v1.1.0", required: true },
    ],
    environments: [
      { id: "conda", runtime: "r-4.4", digest: "sha256:eco-env", lockfileChecksum: "sha256:eco-lock" },
    ],
    reproductionRuns: [
      {
        id: "run-c",
        reproducerId: "rep-303",
        role: "independent-reproducer",
        institution: "Mountain Stats Lab",
        relatedAuthorIds: [],
        recentCollaboratorAuthorIds: [],
        fundingRelationship: false,
        artifactChecks: [
          { artifactId: "dataset", checksumMatches: true },
          { artifactId: "script", checksumMatches: true },
        ],
        environmentDigestMatches: true,
        outputDigestMatches: true,
        testsPassed: true,
        runLogChecksum: "sha256:run-c-log",
        disclosureSigned: true,
        completedAt: "2026-05-20T08:00:00.000Z",
      },
    ],
  },
  {
    id: "RB-HOLD-003",
    title: "Conflicted review badge packet",
    authors: [
      { id: "author-d", institution: "North Lab" },
      { id: "author-e", institution: "North Lab" },
    ],
    badgeRequest: {
      level: "bronze",
      reviewedAt: "2026-05-21T18:35:00.000Z",
    },
    artifacts: [
      { id: "dataset", type: "dataset", checksum: "sha256:conflict-dataset", version: "v0.9.0", required: true },
      { id: "notebook", type: "notebook", checksum: "sha256:conflict-notebook", version: "v0.9.0", required: true },
    ],
    environments: [
      { id: "container", runtime: "python-3.11", digest: "sha256:conflict-env", lockfileChecksum: "sha256:conflict-lock" },
    ],
    reproductionRuns: [
      {
        id: "run-d",
        reproducerId: "author-d",
        role: "community-reviewer",
        institution: "North Lab",
        relatedAuthorIds: ["author-d"],
        recentCollaboratorAuthorIds: [],
        fundingRelationship: false,
        artifactChecks: [
          { artifactId: "dataset", checksumMatches: true },
          { artifactId: "notebook", checksumMatches: true },
        ],
        environmentDigestMatches: true,
        outputDigestMatches: true,
        testsPassed: true,
        runLogChecksum: "sha256:run-d-log",
        disclosureSigned: true,
        completedAt: "2026-05-20T10:00:00.000Z",
      },
      {
        id: "run-e",
        reproducerId: "rep-404",
        role: "independent-reproducer",
        institution: "East Review Lab",
        relatedAuthorIds: [],
        recentCollaboratorAuthorIds: ["author-e"],
        fundingRelationship: true,
        artifactChecks: [
          { artifactId: "dataset", checksumMatches: true },
          { artifactId: "notebook", checksumMatches: true },
        ],
        environmentDigestMatches: true,
        outputDigestMatches: true,
        testsPassed: true,
        runLogChecksum: "sha256:run-e-log",
        disclosureSigned: true,
        completedAt: "2026-05-19T10:00:00.000Z",
      },
    ],
  },
  {
    id: "RB-HOLD-004",
    title: "Artifact mismatch badge packet",
    authors: [
      { id: "author-f", institution: "Signal Bio Lab" },
    ],
    badgeRequest: {
      level: "bronze",
      reviewedAt: "2026-05-21T18:35:00.000Z",
    },
    artifacts: [
      { id: "dataset", type: "dataset", checksum: "", version: "v2.0.0", required: true },
      { id: "analysis", type: "notebook", checksum: "sha256:analysis-hold", version: "v2.0.0", required: true },
      { id: "results", type: "figure", checksum: "sha256:results-hold", version: "", required: true },
    ],
    environments: [
      { id: "container", runtime: "julia-1.11", digest: "", lockfileChecksum: "" },
    ],
    reproductionRuns: [
      {
        id: "run-f",
        reproducerId: "rep-505",
        role: "independent-reproducer",
        institution: "Open Repro Guild",
        relatedAuthorIds: [],
        recentCollaboratorAuthorIds: [],
        fundingRelationship: false,
        artifactChecks: [
          { artifactId: "dataset", checksumMatches: false },
          { artifactId: "analysis", checksumMatches: true },
          { artifactId: "results", checksumMatches: false },
        ],
        environmentDigestMatches: false,
        outputDigestMatches: false,
        testsPassed: false,
        runLogChecksum: "",
        disclosureSigned: false,
        completedAt: "2026-04-01T10:00:00.000Z",
      },
    ],
  },
]

module.exports = {
  badgePolicy,
  projects,
}
