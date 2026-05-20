"use strict";

module.exports = {
  projects: [
    {
      id: "project:neuro-alpha",
      title: "Neuro Alpha Collaboration",
      institutionId: "inst:western",
      visibility: "invitation-only"
    },
    {
      id: "project:materials-sensor",
      title: "Materials Sensor Working Group",
      institutionId: "inst:eastern",
      visibility: "institutional-only"
    }
  ],
  users: [
    {
      id: "user:owner-amy",
      name: "Amy Owner",
      type: "internal",
      institutionId: "inst:western",
      mfaEnabled: true,
      samlLinked: true,
      requiresSaml: true,
      orcidLinked: true,
      status: "active",
      projectRoles: {
        "project:neuro-alpha": "owner"
      }
    },
    {
      id: "user:ext-lee",
      name: "Lee External",
      type: "external",
      institutionId: "inst:guest",
      mfaEnabled: false,
      samlLinked: false,
      requiresSaml: false,
      orcidLinked: false,
      status: "active",
      externalAccessExpiresAt: "2026-05-19T18:00:00Z",
      projectRoles: {
        "project:neuro-alpha": "reviewer"
      }
    },
    {
      id: "user:admin-ray",
      name: "Ray Admin",
      type: "internal",
      institutionId: "inst:western",
      mfaEnabled: true,
      samlLinked: true,
      requiresSaml: true,
      orcidLinked: true,
      status: "active",
      projectRoles: {
        "project:neuro-alpha": "admin"
      }
    },
    {
      id: "user:inactive-jo",
      name: "Jo Inactive",
      type: "external",
      institutionId: "inst:eastern",
      mfaEnabled: true,
      samlLinked: false,
      requiresSaml: false,
      orcidLinked: true,
      status: "inactive",
      externalAccessExpiresAt: "2026-05-25T00:00:00Z",
      projectRoles: {
        "project:materials-sensor": "contributor"
      }
    }
  ],
  objects: [
    {
      id: "object:patient-counts",
      projectId: "project:neuro-alpha",
      title: "Restricted patient-derived count matrix",
      sensitivity: "restricted",
      downloadRequiresRole: "admin",
      license: "restricted",
      bulkThreshold: 10,
      expectedRoles: ["owner", "admin"]
    },
    {
      id: "object:review-notebook",
      projectId: "project:neuro-alpha",
      title: "Reviewer analysis notebook",
      sensitivity: "private",
      downloadRequiresRole: "reviewer",
      license: "CC-BY-4.0",
      bulkThreshold: 25,
      expectedRoles: ["owner", "admin", "reviewer"]
    },
    {
      id: "object:sensor-raw",
      projectId: "project:materials-sensor",
      title: "Embargoed sensor raw traces",
      sensitivity: "embargoed",
      downloadRequiresRole: "contributor",
      license: "restricted",
      bulkThreshold: 12,
      expectedRoles: ["owner", "admin", "contributor"]
    }
  ],
  events: [
    {
      id: "evt:001",
      type: "restricted_download",
      timestamp: "2026-05-20T02:10:00Z",
      projectId: "project:neuro-alpha",
      objectId: "object:patient-counts",
      actorId: "user:ext-lee",
      actorRole: "reviewer",
      requiresOrcid: true,
      ipReputation: "new_country",
      afterHours: true
    },
    {
      id: "evt:002",
      type: "bulk_download",
      timestamp: "2026-05-20T02:24:00Z",
      projectId: "project:neuro-alpha",
      objectId: "object:patient-counts",
      actorId: "user:ext-lee",
      actorRole: "reviewer",
      count: 42,
      afterHours: true
    },
    {
      id: "evt:003",
      type: "role_change",
      timestamp: "2026-05-20T02:31:00Z",
      projectId: "project:neuro-alpha",
      actorId: "user:admin-ray",
      targetUserId: "user:ext-lee",
      beforeRole: "reviewer",
      afterRole: "contributor",
      approvalTicket: null
    },
    {
      id: "evt:004",
      type: "object_permission_drift",
      timestamp: "2026-05-20T03:05:00Z",
      projectId: "project:neuro-alpha",
      objectId: "object:patient-counts",
      actorId: "user:admin-ray",
      observedRoles: ["owner", "admin", "reviewer", "contributor"]
    },
    {
      id: "evt:005",
      type: "data_export",
      timestamp: "2026-05-20T03:30:00Z",
      projectId: "project:materials-sensor",
      objectId: "object:sensor-raw",
      actorId: "user:inactive-jo",
      actorRole: "contributor",
      count: 6,
      afterHours: false
    },
    {
      id: "evt:006",
      type: "api_token_created",
      timestamp: "2026-05-20T04:00:00Z",
      projectId: "project:materials-sensor",
      objectId: "object:sensor-raw",
      actorId: "user:inactive-jo",
      actorRole: "contributor",
      ipReputation: "new_country"
    },
    {
      id: "evt:007",
      type: "project_visibility_change",
      timestamp: "2026-05-20T05:00:00Z",
      projectId: "project:neuro-alpha",
      actorId: "user:owner-amy",
      beforeVisibility: "invitation-only",
      afterVisibility: "institutional-only"
    }
  ]
};
