"use strict";

module.exports = {
  admin: {
    id: "admin:research-office",
    institutionId: "inst:western",
    allowedPrivateProjectIds: ["project:neuro-alpha"]
  },
  users: [
    {
      id: "user:amy-orcid",
      name: "Amy Chen",
      type: "researcher",
      institutionId: "inst:western",
      labId: "lab:neuro",
      orcid: "0000-0001-0000-0001"
    },
    {
      id: "user:amy-github",
      name: "Amy C.",
      type: "researcher",
      institutionId: "inst:western",
      labId: "lab:neuro",
      github: "amy-research"
    },
    {
      id: "user:ben",
      name: "Ben Patel",
      type: "researcher",
      institutionId: "inst:western",
      labId: "lab:materials",
      orcid: "0000-0002-0000-0002"
    },
    {
      id: "user:sync-bot",
      name: "Repository Sync Bot",
      type: "service",
      institutionId: "inst:western",
      labId: "lab:platform"
    },
    {
      id: "user:external",
      name: "External Reviewer",
      type: "researcher",
      institutionId: "inst:eastern",
      labId: "lab:external"
    }
  ],
  identityLinks: [
    {
      canonicalId: "researcher:amy-chen",
      userIds: ["user:amy-orcid", "user:amy-github"]
    }
  ],
  projects: [
    {
      id: "project:neuro-alpha",
      title: "Neuro Alpha",
      institutionId: "inst:western",
      labId: "lab:neuro",
      visibility: "private"
    },
    {
      id: "project:materials-sensor",
      title: "Materials Sensor",
      institutionId: "inst:western",
      labId: "lab:materials",
      visibility: "institutional-only"
    },
    {
      id: "project:external-secret",
      title: "External Private Study",
      institutionId: "inst:eastern",
      labId: "lab:external",
      visibility: "private"
    }
  ],
  events: [
    {
      id: "evt:001",
      type: "dataset_upload",
      timestamp: "2026-05-20T02:00:00Z",
      actorId: "user:amy-orcid",
      projectId: "project:neuro-alpha",
      creditMultiplier: 1.2,
      collaborationPair: ["lab:neuro", "lab:materials"]
    },
    {
      id: "evt:002",
      type: "code_commit",
      timestamp: "2026-05-20T02:15:00Z",
      actorId: "user:amy-github",
      projectId: "project:neuro-alpha",
      creditMultiplier: 1.1,
      collaborationPair: ["lab:neuro", "lab:materials"]
    },
    {
      id: "evt:003",
      type: "ai_review_generated",
      timestamp: "2026-05-20T02:30:00Z",
      actorId: "user:sync-bot",
      projectId: "project:neuro-alpha",
      creditMultiplier: 3,
      collaborationPair: ["lab:neuro", "lab:materials"]
    },
    {
      id: "evt:004",
      type: "repository_export",
      timestamp: "2026-05-20T02:45:00Z",
      actorId: "user:sync-bot",
      projectId: "project:materials-sensor",
      creditMultiplier: 2,
      collaborationPair: ["lab:neuro", "lab:materials"]
    },
    {
      id: "evt:005",
      type: "peer_review_completed",
      timestamp: "2026-05-20T03:00:00Z",
      actorId: "user:ben",
      projectId: "project:materials-sensor",
      creditMultiplier: 2.5,
      collaborationPair: ["lab:neuro", "lab:materials"]
    },
    {
      id: "evt:006",
      type: "manuscript_edit",
      timestamp: "2026-05-20T03:05:00Z",
      actorId: "user:amy-orcid",
      projectId: "project:neuro-alpha",
      creditMultiplier: 4,
      collaborationPair: ["lab:neuro", "lab:materials"]
    },
    {
      id: "evt:007",
      type: "dataset_upload",
      timestamp: "2026-05-20T03:20:00Z",
      actorId: "user:amy-github",
      projectId: "project:neuro-alpha",
      creditMultiplier: 3.5,
      collaborationPair: ["lab:neuro", "lab:materials"]
    },
    {
      id: "evt:008",
      type: "repository_export",
      timestamp: "2026-05-20T03:40:00Z",
      actorId: "user:external",
      projectId: "project:external-secret",
      creditMultiplier: 1
    }
  ]
};
