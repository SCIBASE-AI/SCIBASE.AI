const project = {
  asOfDate: "2026-05-22",
  workspace: {
    id: "proj-visible-221",
    title: "Synthetic Proteomics Collaboration",
    currentVisibility: "institutional-only",
    requestedVisibility: "public",
    requestedBy: "user-owner",
    requestedAt: "2026-05-22T17:15:00Z"
  },
  policy: {
    allowedPublicObjectKinds: ["manuscript", "readme", "citation", "public-code"],
    requiredApproverRoles: ["owner", "data-steward", "institution-admin"],
    sensitiveLabels: ["restricted-data", "human-derived", "partner-confidential", "anonymous-review"],
    publicProfileRequiresConsent: true,
    minimumAuditEvents: 4,
    requiredAuditActions: [
      "visibility-requested",
      "object-reviewed",
      "institution-approved",
      "public-release-approved"
    ]
  },
  collaborators: [
    { id: "user-owner", role: "owner", consent: "approved", consentAt: "2026-05-21", profilePublic: true },
    { id: "user-steward", role: "data-steward", consent: "pending", consentAt: null, profilePublic: false },
    { id: "user-admin", role: "institution-admin", consent: "approved", consentAt: "2026-05-20", profilePublic: true },
    { id: "user-partner", role: "external-partner", consent: "missing", consentAt: null, profilePublic: false }
  ],
  objects: [
    {
      id: "obj-manuscript",
      kind: "manuscript",
      title: "Draft manuscript",
      permission: "read",
      labels: [],
      publicReady: true,
      ownerId: "user-owner"
    },
    {
      id: "obj-dataset-raw",
      kind: "dataset",
      title: "Raw participant proteomics table",
      permission: "download",
      labels: ["restricted-data", "human-derived"],
      publicReady: false,
      ownerId: "user-steward"
    },
    {
      id: "obj-code",
      kind: "public-code",
      title: "Analysis notebook",
      permission: "edit",
      labels: [],
      publicReady: true,
      ownerId: "user-owner"
    },
    {
      id: "obj-review",
      kind: "comment-thread",
      title: "Anonymous reviewer discussion",
      permission: "read",
      labels: ["anonymous-review"],
      publicReady: false,
      ownerId: "user-partner"
    }
  ],
  holds: [
    { id: "hold-irb", kind: "IRB", status: "active", objectIds: ["obj-dataset-raw"], expiresAt: "2026-08-01" },
    { id: "hold-funder", kind: "funder-embargo", status: "active", objectIds: ["obj-manuscript"], expiresAt: "2026-06-15" }
  ],
  externalAccess: [
    { id: "invite-1", collaboratorId: "user-partner", access: "read", expiresAt: "2026-06-01", allowsRedistribution: false },
    { id: "invite-2", collaboratorId: "unknown-consultant", access: "download", expiresAt: "2026-06-15", allowsRedistribution: false }
  ],
  auditEvents: [
    { id: "audit-1", actorId: "user-owner", action: "visibility-requested", at: "2026-05-22T17:15:00Z" },
    { id: "audit-2", actorId: "user-admin", action: "institution-approved", at: "2026-05-22T17:18:00Z" }
  ]
};

module.exports = { project };
