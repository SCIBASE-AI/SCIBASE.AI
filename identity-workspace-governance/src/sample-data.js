export const sampleUser = {
  id: "user-alina-chen",
  email: "alina.chen@example.edu",
  anonymous: false,
  mfaEnabled: true,
  linkedAccounts: [
    { provider: "orcid", subject: "0000-0002-1825-0097", verified: true },
    { provider: "github", subject: "alinachen-lab", verified: true },
    { provider: "google", subject: "alina.chen@example.edu", verified: true },
    { provider: "saml", subject: "researcher-991", institution: "Northbridge University", verified: true }
  ],
  profile: {
    name: "Alina Chen",
    institution: "Northbridge University",
    field: "Computational biology",
    bio: "Builds reproducible organoid analysis workflows.",
    keywords: ["organoids", "single-cell", "reproducibility"],
    visibility: "public",
    photoUrl: "https://example.edu/alina.jpg",
    orcidSync: {
      publications: 28,
      affiliations: ["Northbridge University", "Open Organoid Consortium"],
      grants: ["BIO-2026-114"]
    },
    activity: ["created project organoid-response", "reviewed project perturbation-qc"],
    metrics: {
      citations: 1410,
      downloads: 820,
      forks: 18,
      endorsements: 32,
      peerReviews: 11,
      reproducibilityScore: 91
    }
  }
};

export const sampleProject = {
  id: "project-organoid-response",
  title: "Organoid perturbation response atlas",
  visibility: "institutional-only",
  ownerId: "user-alina-chen",
  collaborators: [
    { userId: "user-alina-chen", role: "owner" },
    { userId: "user-data-analyst", role: "contributor" },
    { userId: "user-external-reviewer", role: "reviewer" }
  ],
  institutions: ["Northbridge University"],
  fundingSources: ["BIO-2026-114"],
  objects: [
    { id: "doc-manuscript", type: "document", policy: { read: ["viewer"], write: ["contributor"], download: ["viewer"] } },
    { id: "code-analysis", type: "code", policy: { read: ["viewer"], write: ["contributor"], download: ["contributor"] } },
    { id: "dataset-raw", type: "dataset", policy: { read: ["reviewer"], write: ["admin"], download: ["owner"] } }
  ],
  metadata: { field: "Computational biology", license: "restricted-review" },
  citations: ["doi:10.0000/organoid-atlas"],
  discussions: [{ id: "thread-1", title: "Validation cohort", comments: 4 }]
};

export const sampleInvitation = {
  id: "invite-reviewer",
  projectId: "project-organoid-response",
  email: "reviewer@example.org",
  role: "reviewer",
  objectIds: ["doc-manuscript", "dataset-raw"],
  expiresAt: "2026-06-01T00:00:00Z",
  createdBy: "user-alina-chen"
};

export const sampleAuditLog = [
  { at: "2026-05-01T10:00:00Z", actorId: "user-alina-chen", action: "project.created", target: "project-organoid-response" },
  { at: "2026-05-02T12:30:00Z", actorId: "user-alina-chen", action: "invite.created", target: "invite-reviewer" },
  { at: "2026-05-03T09:15:00Z", actorId: "user-external-reviewer", action: "object.read", target: "doc-manuscript" }
];
