const submissionBatch = {
  id: "bounty-submission-quarantine-2026-05-29",
  generatedAt: "2026-05-29T14:34:00.000Z",
  submissions: [
    {
      id: "sub-1",
      challengeId: "challenge-bio-17",
      teamId: "team-alpha",
      manifestComplete: true,
      artifactHashes: ["sha256:aa01", "sha256:bb02"],
      unsafeFlags: [],
      sponsorVisible: false,
      reviewerPreview: true,
      ipStatement: "solver-retains-until-paid"
    },
    {
      id: "sub-2",
      challengeId: "challenge-ml-04",
      teamId: "team-beta",
      manifestComplete: false,
      artifactHashes: ["sha256:cc03"],
      unsafeFlags: ["macro-enabled-document"],
      sponsorVisible: true,
      reviewerPreview: false,
      ipStatement: "missing"
    },
    {
      id: "sub-3",
      challengeId: "challenge-climate-09",
      teamId: "team-gamma",
      manifestComplete: true,
      artifactHashes: [],
      unsafeFlags: ["executable-binary"],
      sponsorVisible: false,
      reviewerPreview: true,
      ipStatement: "open-license-after-award"
    },
    {
      id: "sub-4",
      challengeId: "challenge-quantum-02",
      teamId: "team-delta",
      manifestComplete: true,
      artifactHashes: ["sha256:dd04"],
      unsafeFlags: [],
      sponsorVisible: false,
      reviewerPreview: true,
      ipStatement: "sponsor-transfer-on-payout"
    }
  ]
};

module.exports = { submissionBatch };
