const policy = {
  maxOverrideAgeDays: 90,
}

const projects = [
  {
    projectId: "oncology-collab",
    title: "Oncology Collaboration Workspace",
    roles: [
      { roleId: "owner", actions: ["read", "write", "download", "export", "execute", "publish", "comment"] },
      { roleId: "analyst", actions: ["read", "write", "download", "execute"] },
      { roleId: "reviewer", actions: ["read", "comment"] },
    ],
    members: [
      { memberId: "member-ada", roleIds: ["owner"] },
      { memberId: "member-ben", roleIds: ["analyst"] },
      { memberId: "member-cy", roleIds: ["reviewer"] },
    ],
    objects: [
      {
        objectId: "dataset-rna-human",
        objectType: "dataset",
        classification: "human_subject",
      },
      {
        objectId: "thread-blinded-review",
        objectType: "review_thread",
        classification: "anonymous_review",
      },
      {
        objectId: "notebook-qc",
        objectType: "notebook",
        classification: "restricted",
      },
    ],
    objectOverrides: [
      {
        overrideId: "override-dataset-deny-export",
        objectId: "dataset-rna-human",
        action: "export",
        effect: "deny",
        createdAt: "2026-05-01T10:00:00.000Z",
        reviewedAt: "2026-05-20T10:00:00.000Z",
      },
      {
        overrideId: "override-thread-legacy-read",
        objectId: "thread-blinded-review",
        memberId: "member-cy",
        action: "read",
        effect: "allow",
        createdAt: "2025-12-01T10:00:00.000Z",
        reviewedAt: "2025-12-15T10:00:00.000Z",
      },
      {
        overrideId: "override-notebook-deny-export",
        objectId: "notebook-qc",
        action: "export",
        effect: "deny",
        createdAt: "2026-05-01T10:00:00.000Z",
        reviewedAt: "2026-05-20T10:00:00.000Z",
      },
      {
        overrideId: "override-notebook-deny-execute-analyst",
        objectId: "notebook-qc",
        memberId: "member-ben",
        action: "execute",
        effect: "deny",
        createdAt: "2026-05-01T10:00:00.000Z",
        reviewedAt: "2026-05-20T10:00:00.000Z",
      },
      {
        overrideId: "override-notebook-deny-execute-owner",
        objectId: "notebook-qc",
        memberId: "member-ada",
        action: "execute",
        effect: "deny",
        createdAt: "2026-05-01T10:00:00.000Z",
        reviewedAt: "2026-05-20T10:00:00.000Z",
      },
    ],
    stewardApprovals: [
      {
        approvalId: "approval-dataset-export",
        objectId: "dataset-rna-human",
        action: "export",
        role: "data_steward",
        status: "approved",
        approvedAt: "2026-05-21T09:00:00.000Z",
      },
      {
        approvalId: "approval-notebook-read",
        objectId: "notebook-qc",
        action: "read",
        role: "data_steward",
        status: "approved",
        approvedAt: "2026-05-21T09:00:00.000Z",
      },
    ],
    pendingPermissionChanges: [
      {
        changeId: "change-dataset-download-ben",
        objectId: "dataset-rna-human",
        memberId: "member-ben",
        action: "download",
      },
      {
        changeId: "change-notebook-read-cy",
        objectId: "notebook-qc",
        memberId: "member-cy",
        action: "read",
      },
    ],
  },
  {
    projectId: "materials-open-methods",
    title: "Materials Open Methods Workspace",
    roles: [
      { roleId: "owner", actions: ["read", "write", "comment"] },
      { roleId: "collaborator", actions: ["read", "comment"] },
    ],
    members: [
      { memberId: "member-dee", roleIds: ["owner"] },
      { memberId: "member-eli", roleIds: ["collaborator"] },
    ],
    objects: [
      {
        objectId: "manuscript-methods",
        objectType: "manuscript",
        classification: "restricted",
      },
      {
        objectId: "dataset-public-calibration",
        objectType: "dataset",
        classification: "public",
      },
    ],
    objectOverrides: [
      {
        overrideId: "override-manuscript-deny-publish",
        objectId: "manuscript-methods",
        action: "publish",
        effect: "deny",
        createdAt: "2026-05-02T10:00:00.000Z",
        reviewedAt: "2026-05-20T10:00:00.000Z",
      },
    ],
    stewardApprovals: [
      {
        approvalId: "approval-manuscript-comment",
        objectId: "manuscript-methods",
        action: "comment",
        role: "data_steward",
        status: "approved",
        approvedAt: "2026-05-21T09:00:00.000Z",
      },
    ],
    pendingPermissionChanges: [
      {
        changeId: "change-manuscript-comment-eli",
        objectId: "manuscript-methods",
        memberId: "member-eli",
        action: "comment",
      },
    ],
  },
]

module.exports = {
  policy,
  projects,
}
