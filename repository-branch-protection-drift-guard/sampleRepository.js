module.exports = {
  id: "project-repo-neuro-77",
  branches: [
    {
      name: "release/v1.2-dataset",
      releaseCandidate: true,
      requiredStatusChecks: ["reproducibility-pipeline", "export-manifest"],
      requiredApprovingReviews: 1,
      requireSignedCommits: false,
      allowForcePushes: false,
      allowDeletions: true,
      allowAdminBypass: true,
      adminBypassExceptionId: ""
    },
    {
      name: "preprint/v1.1",
      releaseCandidate: true,
      requiredStatusChecks: ["reproducibility-pipeline", "citation-metadata", "export-manifest"],
      requiredApprovingReviews: 2,
      requireSignedCommits: true,
      allowForcePushes: false,
      allowDeletions: false,
      allowAdminBypass: false
    },
    {
      name: "experiment/new-hypothesis",
      releaseCandidate: false,
      requiredStatusChecks: [],
      requiredApprovingReviews: 0,
      requireSignedCommits: false,
      allowForcePushes: true,
      allowDeletions: true,
      allowAdminBypass: true
    }
  ],
  exportBundles: [
    { id: "export-v1.2", branch: "release/v1.2-dataset", status: "ready" },
    { id: "export-v1.1", branch: "preprint/v1.1", status: "ready" }
  ]
};
