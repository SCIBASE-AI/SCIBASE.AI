"use strict";

const invitationPacket = {
  projectId: "proj-human-atlas-17",
  evaluatedAt: "2026-05-20T12:00:00Z",
  allowedDomains: ["university.edu", "clinic.org", "partner-lab.net"],
  rolePolicy: {
    allowedGuestRoles: ["viewer", "commenter", "replication-runner"],
    sensitiveRoles: ["admin", "data-exporter", "billing-owner"],
  },
  inviters: [
    { userId: "u-owner", roles: ["owner"], active: true },
    { userId: "u-coauthor", roles: ["commenter"], active: true },
    { userId: "u-left", roles: ["owner"], active: false },
  ],
  invitations: [
    {
      inviteId: "inv-001",
      email: "ana@university.edu",
      role: "commenter",
      invitedBy: "u-owner",
      createdAt: "2026-05-18T09:00:00Z",
      expiresAt: "2026-05-25T09:00:00Z",
    },
    {
      inviteId: "inv-002",
      email: "vendor@unknown.ai",
      role: "data-exporter",
      invitedBy: "u-owner",
      createdAt: "2026-05-02T09:00:00Z",
      expiresAt: "2026-05-09T09:00:00Z",
    },
    {
      inviteId: "inv-003",
      email: "ana@university.edu",
      role: "viewer",
      invitedBy: "u-coauthor",
      createdAt: "2026-05-19T09:00:00Z",
      expiresAt: "2026-05-26T09:00:00Z",
    },
    {
      inviteId: "inv-004",
      email: "casey@clinic.org",
      role: "admin",
      invitedBy: "u-left",
      createdAt: "2026-05-19T11:00:00Z",
      expiresAt: "2026-05-26T11:00:00Z",
    },
  ],
};

module.exports = { invitationPacket };
