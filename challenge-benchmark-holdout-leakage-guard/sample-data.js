const leakagePolicy = {
  freezeWindowHours: 48,
  minHoldoutHashLength: 16,
  allowedReleaseChannels: ["scoring-service", "sealed-evaluator"],
  publicChannels: ["public-baseline", "documentation", "discussion-thread"],
}

const challenges = [
  {
    id: "CH-SAFE-001",
    title: "Protein stability private holdout scoring",
    submissionDeadline: "2026-05-30T23:59:00Z",
    scoringStartedAt: "2026-05-31T02:00:00Z",
    holdoutArtifacts: [
      { id: "HOLD-PS-1", hash: "0a3f9c2e8bd4412397ea", path: "sealed/protein-stability/holdout-v2.csv" },
    ],
    releaseEvents: [
      { artifactId: "HOLD-PS-1", channel: "sealed-evaluator", at: "2026-05-31T01:20:00Z", actor: "scoring-admin" },
    ],
    solverWorkspaceGrants: [
      { solverId: "team-alpha", paths: ["training/protein-stability/train.csv"], grantedAt: "2026-05-18T10:00:00Z" },
    ],
    publicBaselines: [
      { id: "BASE-PS-1", hash: "84c7131ef918aa0b11f1", channel: "public-baseline" },
    ],
    sponsorExceptions: [],
    submissions: [
      { solverId: "team-alpha", submittedAt: "2026-05-30T20:12:00Z", artifactHashes: ["84c7131ef918aa0b11f1"] },
    ],
  },
  {
    id: "CH-LEAK-002",
    title: "Climate forecast benchmark with accidental public release",
    submissionDeadline: "2026-06-05T23:59:00Z",
    scoringStartedAt: "2026-06-06T03:00:00Z",
    holdoutArtifacts: [
      { id: "HOLD-CF-7", hash: "ff00aa7711cc884422dd", path: "sealed/climate/region-7-holdout.parquet" },
    ],
    releaseEvents: [
      { artifactId: "HOLD-CF-7", channel: "documentation", at: "2026-06-03T14:00:00Z", actor: "sponsor-editor" },
      { artifactId: "HOLD-CF-7", channel: "sealed-evaluator", at: "2026-06-06T01:10:00Z", actor: "scoring-admin" },
    ],
    solverWorkspaceGrants: [
      { solverId: "team-beta", paths: ["sealed/climate/region-7-holdout.parquet"], grantedAt: "2026-06-02T08:00:00Z" },
    ],
    publicBaselines: [
      { id: "BASE-CF-2", hash: "ff00aa7711cc884422dd", channel: "public-baseline" },
    ],
    sponsorExceptions: [
      { id: "EXC-44", artifactId: "HOLD-CF-7", approved: false, reason: "Sponsor preview request after freeze" },
    ],
    submissions: [
      { solverId: "team-beta", submittedAt: "2026-06-05T22:30:00Z", artifactHashes: ["ff00aa7711cc884422dd"] },
    ],
  },
  {
    id: "CH-REVIEW-003",
    title: "Materials challenge with late sponsor exception",
    submissionDeadline: "2026-07-01T23:59:00Z",
    scoringStartedAt: "2026-07-02T04:00:00Z",
    holdoutArtifacts: [
      { id: "HOLD-MAT-3", hash: "9c73b1d4a4e74cb39d10", path: "sealed/materials/final-holdout.jsonl" },
    ],
    releaseEvents: [
      { artifactId: "HOLD-MAT-3", channel: "sealed-evaluator", at: "2026-07-02T02:00:00Z", actor: "scoring-admin" },
    ],
    solverWorkspaceGrants: [
      { solverId: "team-gamma", paths: ["training/materials/train.jsonl"], grantedAt: "2026-06-20T12:00:00Z" },
    ],
    publicBaselines: [
      { id: "BASE-MAT-1", hash: "0011aabbccddeeff0022", channel: "public-baseline" },
    ],
    sponsorExceptions: [
      { id: "EXC-80", artifactId: "HOLD-MAT-3", approved: true, approvedAt: "2026-06-30T18:00:00Z", reason: "Independent auditor inspected sealed hash manifest" },
    ],
    submissions: [
      { solverId: "team-gamma", submittedAt: "2026-07-01T21:00:00Z", artifactHashes: ["0011aabbccddeeff0022"] },
    ],
  },
  {
    id: "CH-HOLD-004",
    title: "Chemistry optimization challenge missing holdout hash",
    submissionDeadline: "2026-07-15T23:59:00Z",
    scoringStartedAt: "2026-07-16T03:00:00Z",
    holdoutArtifacts: [
      { id: "HOLD-CHEM-9", hash: "", path: "sealed/chemistry/holdout.sdf" },
    ],
    releaseEvents: [
      { artifactId: "HOLD-CHEM-9", channel: "sealed-evaluator", at: "2026-07-16T01:00:00Z", actor: "scoring-admin" },
    ],
    solverWorkspaceGrants: [],
    publicBaselines: [],
    sponsorExceptions: [],
    submissions: [],
  },
]

module.exports = {
  leakagePolicy,
  challenges,
}
