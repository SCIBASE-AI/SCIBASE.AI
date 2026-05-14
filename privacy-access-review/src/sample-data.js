export const sampleUsers = {
  owner: {
    id: "user-owner",
    name: "Dr. Mira Shah",
    profileMode: "public",
    institution: "Northbridge Institute",
    mfaEnabled: true,
    reputationScore: 92,
    identities: [
      { provider: "email", value: "mira@northbridge.example", verified: true },
      { provider: "orcid", value: "0000-0002-1825-0097", verified: true },
      { provider: "github", value: "mirashah", verified: true },
      { provider: "saml", value: "northbridge:mira", verified: true }
    ]
  },
  contributor: {
    id: "user-contributor",
    name: "Leo Chen",
    profileMode: "institutional",
    institution: "Northbridge Institute",
    mfaEnabled: true,
    reputationScore: 71,
    identities: [
      { provider: "email", value: "leo@northbridge.example", verified: true },
      { provider: "orcid", value: "0000-0003-4431-6788", verified: true },
      { provider: "github", value: "leochen-research", verified: true }
    ]
  },
  externalReviewer: {
    id: "user-external-reviewer",
    name: "Anonymous Reviewer 12",
    profileMode: "anonymous-review",
    institution: "External Review Board",
    mfaEnabled: false,
    reputationScore: 63,
    identities: [
      { provider: "email", value: "reviewer12@example-review.org", verified: true },
      { provider: "orcid", value: "0000-0001-1111-2222", verified: false }
    ]
  },
  viewer: {
    id: "user-viewer",
    name: "Public Reader",
    profileMode: "public",
    institution: null,
    mfaEnabled: false,
    reputationScore: 12,
    identities: [{ provider: "email", value: "reader@example.org", verified: true }]
  }
};

export const sampleProject = {
  id: "project-atmosphere",
  title: "Open Spectral Catalog for Nearby Exoplanet Atmospheres",
  visibility: "institutional-only",
  institution: "Northbridge Institute",
  ownerId: "user-owner",
  memberships: [
    { userId: "user-owner", role: "owner", status: "active" },
    { userId: "user-contributor", role: "contributor", status: "active" },
    { userId: "user-external-reviewer", role: "reviewer", status: "invited" },
    { userId: "user-viewer", role: "viewer", status: "suspended" }
  ],
  objects: {
    manuscriptDraft: {
      id: "manuscriptDraft",
      label: "Manuscript draft",
      type: "manuscript",
      sensitivity: "internal",
      allowedActionsByRole: {
        owner: ["read", "edit", "comment", "manage", "audit"],
        admin: ["read", "edit", "comment", "manage", "audit"],
        contributor: ["read", "edit", "comment"],
        reviewer: ["read", "comment", "review"],
        viewer: ["read"]
      }
    },
    datasetRaw: {
      id: "datasetRaw",
      label: "Raw spectra dataset",
      type: "dataset",
      sensitivity: "restricted",
      requiresMfa: true,
      allowedActionsByRole: {
        owner: ["read", "download", "edit", "manage", "audit"],
        admin: ["read", "download", "manage", "audit"],
        contributor: ["read", "download"],
        reviewer: ["read"],
        viewer: []
      }
    },
    blindedReview: {
      id: "blindedReview",
      label: "Double-blind review thread",
      type: "review",
      sensitivity: "anonymous",
      preserveAnonymity: true,
      allowedActionsByRole: {
        owner: ["read", "audit"],
        admin: ["read", "audit"],
        contributor: [],
        reviewer: ["read", "comment", "review"],
        viewer: []
      }
    },
    auditLog: {
      id: "auditLog",
      label: "Project audit log",
      type: "audit",
      sensitivity: "restricted",
      requiresMfa: true,
      allowedActionsByRole: {
        owner: ["read", "audit"],
        admin: ["read", "audit"],
        contributor: [],
        reviewer: [],
        viewer: []
      }
    }
  },
  invitations: {
    externalReviewInvite: {
      id: "externalReviewInvite",
      email: "reviewer12@example-review.org",
      role: "reviewer",
      invitedBy: "user-owner",
      expiresAt: "2026-05-21T00:00:00.000Z",
      objectScopes: ["manuscriptDraft", "blindedReview"],
      readOnly: true,
      requireMfaBeforeDownload: true
    },
    staleContributorInvite: {
      id: "staleContributorInvite",
      email: "contractor@unknown-lab.example",
      role: "contributor",
      invitedBy: "user-contributor",
      expiresAt: "2026-05-01T00:00:00.000Z",
      objectScopes: ["manuscriptDraft", "datasetRaw"],
      readOnly: false,
      requireMfaBeforeDownload: true
    }
  },
  auditEvents: [
    {
      id: "evt-001",
      actorId: "user-owner",
      action: "invite",
      objectId: "externalReviewInvite",
      timestamp: "2026-05-12T11:00:00.000Z",
      metadata: { role: "reviewer", expiresAt: "2026-05-21T00:00:00.000Z" }
    },
    {
      id: "evt-002",
      actorId: "user-external-reviewer",
      action: "read",
      objectId: "manuscriptDraft",
      timestamp: "2026-05-13T09:20:00.000Z",
      metadata: { ipClass: "external", sessionMfa: false }
    },
    {
      id: "evt-003",
      actorId: "user-viewer",
      action: "download-denied",
      objectId: "datasetRaw",
      timestamp: "2026-05-13T17:45:00.000Z",
      metadata: { reason: "suspended membership" }
    }
  ]
};

export const reviewClock = "2026-05-15T00:00:00.000Z";
