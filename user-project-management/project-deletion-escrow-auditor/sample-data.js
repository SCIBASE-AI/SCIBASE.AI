const auditPolicy = {
  reviewDate: "2026-05-28T00:00:00Z",
  minimumEscrowHours: 72,
  minimumNoticeHours: 48,
};

const riskyProject = {
  id: "project-quantum-cell-archive",
  members: [
    { id: "user-owner", role: "owner", status: "active", mfaConfirmedAt: "" },
    { id: "user-editor", role: "editor", status: "active", mfaConfirmedAt: "2026-05-27T18:00:00Z" },
    { id: "user-reviewer", role: "reviewer", status: "active", mfaConfirmedAt: "2026-05-26T11:00:00Z" },
  ],
  publication: {
    doi: "10.1234/scibase.synthetic.11",
    indexed: true,
  },
  legalHold: {
    reason: "institutional records retention review",
  },
  activeReviews: ["peer-review-17", "grant-closeout-04"],
  childForks: [
    { id: "fork-private-1", visibility: "private", attributionMigrated: false },
  ],
  billing: {
    unsettledComputeCents: 1875,
  },
};

const riskyRequest = {
  action: "delete",
  requestedBy: "user-editor",
  escrowCreatedAt: "2026-05-28T00:00:00Z",
  scheduledAt: "2026-05-29T12:00:00Z",
  rollbackCheckpointId: "",
  exportBundleId: "",
  doiTombstonePlanned: false,
  redirectUrl: "",
  noticeSentAt: "2026-05-28T02:00:00Z",
  notifiedMemberIds: ["user-owner"],
};

const readyProject = {
  id: "project-open-catalyst-archive",
  members: [
    { id: "user-owner", role: "owner", status: "active", mfaConfirmedAt: "2026-05-28T10:00:00Z" },
    { id: "user-editor", role: "editor", status: "active", mfaConfirmedAt: "2026-05-27T18:00:00Z" },
  ],
  publication: {
    doi: "10.1234/scibase.synthetic.ready",
    indexed: true,
  },
  legalHold: null,
  activeReviews: [],
  childForks: [
    { id: "fork-public-1", visibility: "public", attributionMigrated: true },
  ],
  billing: {
    unsettledComputeCents: 0,
  },
};

const readyRequest = {
  action: "archive",
  requestedBy: "user-owner",
  escrowCreatedAt: "2026-05-28T00:00:00Z",
  scheduledAt: "2026-06-01T00:00:00Z",
  rollbackCheckpointId: "checkpoint-archive-v3",
  exportBundleId: "export-bundle-archive-v3",
  doiTombstonePlanned: true,
  redirectUrl: "https://scibase.example/projects/project-open-catalyst-archive/tombstone",
  noticeSentAt: "2026-05-28T00:00:00Z",
  notifiedMemberIds: ["user-editor"],
};

module.exports = {
  auditPolicy,
  readyProject,
  readyRequest,
  riskyProject,
  riskyRequest,
};
