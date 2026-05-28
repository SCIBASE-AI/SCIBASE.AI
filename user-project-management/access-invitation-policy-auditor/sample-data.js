"use strict";

const projectAccessPacket = {
  id: "project-clinical-dataset",
  title: "Clinical Biomarker Collaboration Workspace",
  visibility: "institutional-only",
  institutionDomain: "northstar.edu",
  auditTime: "2026-05-28T20:00:00Z",
  policy: {
    externalInactivityLimitDays: 30,
  },
  restrictedDatasets: ["dataset-phi-raw", "dataset-consent-linkage"],
  identities: [
    {
      userId: "owner-maya",
      orcidVerified: true,
      samlVerified: true,
      institutionDomain: "northstar.edu",
    },
    {
      userId: "external-ravi",
      orcidVerified: false,
      samlVerified: false,
      institutionDomain: "",
    },
    {
      userId: "guest-anon",
      orcidVerified: false,
      samlVerified: false,
      institutionDomain: "",
    },
    {
      userId: "partner-lee",
      orcidVerified: true,
      samlVerified: true,
      institutionDomain: "partnerlab.org",
    },
  ],
  invitations: [
    {
      id: "invite-001",
      userId: "external-ravi",
      status: "active",
      requestedRole: "reviewer",
      role: "admin",
      ownerApprovalId: "",
      expiresAt: "2026-05-20T00:00:00Z",
    },
    {
      id: "invite-002",
      userId: "partner-lee",
      status: "active",
      requestedRole: "viewer",
      role: "contributor",
      ownerApprovalId: "approval-123",
      expiresAt: "2026-06-10T00:00:00Z",
    },
  ],
  memberships: [
    {
      userId: "owner-maya",
      role: "owner",
      external: false,
      anonymous: false,
      lastActiveAt: "2026-05-28T18:00:00Z",
    },
    {
      userId: "external-ravi",
      role: "admin",
      external: true,
      anonymous: false,
      lastActiveAt: "2026-04-01T18:00:00Z",
    },
    {
      userId: "guest-anon",
      role: "viewer",
      external: true,
      anonymous: true,
      lastActiveAt: "2026-05-27T18:00:00Z",
    },
    {
      userId: "partner-lee",
      role: "contributor",
      external: true,
      anonymous: false,
      lastActiveAt: "2026-05-26T18:00:00Z",
    },
  ],
  objectPermissions: [
    {
      id: "rule-001",
      userId: "external-ravi",
      objectType: "dataset",
      objectId: "dataset-phi-raw",
      action: "download",
      effect: "allow",
    },
    {
      id: "rule-002",
      userId: "partner-lee",
      objectType: "dataset",
      objectId: "dataset-consent-linkage",
      action: "view",
      effect: "allow",
    },
    {
      id: "rule-003",
      userId: "owner-maya",
      objectType: "code",
      objectId: "analysis-notebook",
      action: "edit",
      effect: "allow",
    },
  ],
  auditLog: [
    { key: "invite:invite-002", at: "2026-05-18T10:00:00Z" },
    { key: "member:owner-maya:owner", at: "2026-05-01T10:00:00Z" },
    { key: "member:partner-lee:contributor", at: "2026-05-18T10:00:00Z" },
    { key: "object:rule-003", at: "2026-05-19T10:00:00Z" },
  ],
};

module.exports = {
  projectAccessPacket,
};
