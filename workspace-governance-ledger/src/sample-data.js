export const users = [
  {
    id: "user-ada",
    displayName: "Ada Rivera",
    institution: "Northbridge Institute",
    fields: ["climate health", "reproducibility"],
    profileVisibility: "public",
    linkedIdentities: [
      { provider: "orcid", verified: true, externalId: "0000-0002-1825-0097" },
      { provider: "github", verified: true, externalId: "adarivera" }
    ],
    authFactors: [{ type: "password", active: true }, { type: "totp", active: true }],
    metrics: { downloads: 1240, peerReviews: 17, reproducibilityScore: 94, endorsements: 11 }
  },
  {
    id: "user-noor",
    displayName: "Noor Chen",
    institution: "Cell Systems Lab",
    fields: ["single cell methods"],
    profileVisibility: "private",
    linkedIdentities: [
      { provider: "saml", verified: true, externalId: "northbridge:noor" },
      { provider: "orcid", verified: false, externalId: "0000-0003-1111-2222" }
    ],
    authFactors: [{ type: "password", active: true }],
    metrics: { downloads: 620, peerReviews: 8, reproducibilityScore: 82, endorsements: 5 }
  }
];

export const projects = [
  {
    id: "project-heat-health",
    title: "Urban Heat and Respiratory Health",
    visibility: "public",
    metadata: {
      doi: "10.5555/scibase.heat-health",
      funding: "NSF-OPEN-2026",
      keywords: ["heat", "public health"]
    },
    memberships: [
      { userId: "user-ada", role: "owner" },
      { userId: "user-noor", role: "reviewer" }
    ],
    resources: [
      { id: "doc-manuscript", kind: "document", title: "Main manuscript" },
      { id: "data-cohort", kind: "dataset", title: "Hospital cohort", permissions: { edit: ["user-ada"] } },
      { id: "code-analysis", kind: "code", title: "Analysis scripts" }
    ],
    discussions: [{ id: "thread-1", title: "Reviewer notes" }],
    auditEvents: [
      { actorId: "user-ada", action: "created_project", target: "project-heat-health", timestamp: "2026-05-14T02:00:00Z" },
      { actorId: "user-ada", action: "granted_reviewer", target: "user-noor", timestamp: "2026-05-14T02:20:00Z" },
      { actorId: "user-noor", action: "opened_review", target: "doc-manuscript", timestamp: "2026-05-14T02:45:00Z" }
    ]
  },
  {
    id: "project-cell-atlas",
    title: "Single Cell Atlas Methods Note",
    visibility: "institutional",
    metadata: {
      doi: "10.5555/scibase.cell-atlas",
      funding: "NIH-PUBLIC-ACCESS",
      keywords: ["single cell", "protocol"]
    },
    memberships: [{ userId: "user-noor", role: "owner" }],
    resources: [
      { id: "doc-note", kind: "document", title: "Methods note" },
      { id: "data-counts", kind: "dataset", title: "Count matrix" }
    ],
    discussions: [],
    auditEvents: [
      { actorId: "user-noor", action: "created_project", target: "project-cell-atlas", timestamp: "2026-05-14T03:00:00Z" }
    ]
  }
];
