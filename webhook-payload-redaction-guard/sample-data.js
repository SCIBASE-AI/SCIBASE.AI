const project = {
  asOfDate: "2026-05-23",
  policy: {
    allowedEventTypes: ["project.published", "dataset.deposited", "review.completed"],
    allowedTopLevelFields: ["eventId", "eventType", "occurredAt", "institutionId", "project", "dataset", "review", "signature"],
    piiFieldNames: ["email", "phone", "address", "fullName", "studentId", "employeeId"],
    blockedProjectFields: ["privateNotes", "internalReviewerComments", "billingAccountId"],
    requiredSignatureFields: ["algorithm", "keyId", "digest"],
    allowedRegions: ["US", "EU"],
    publicDatasetAccess: ["public", "embargoed-metadata-only"]
  },
  outboundEvents: [
    {
      eventId: "evt-001",
      eventType: "dataset.deposited",
      occurredAt: "2026-05-22T18:20:00Z",
      institutionId: "inst-northbridge",
      destination: { connector: "Invenio", region: "EU", purpose: "repository-sync" },
      project: {
        id: "proj-101",
        title: "Synthetic Proteomics Collaboration",
        visibility: "private",
        privateNotes: "IRB reviewer asked for delay",
        owner: { fullName: "Maya Chen", email: "maya@example.edu", orcid: "0000-0002-1111-2222" }
      },
      dataset: {
        id: "data-raw",
        access: "restricted",
        embargoUntil: "2026-08-01",
        downloadUrl: "https://storage.example/private/raw.csv",
        doi: ""
      },
      signature: { algorithm: "HMAC-SHA256", keyId: "", digest: "sha256:abc" },
      debugTrace: "internal-router-17"
    },
    {
      eventId: "evt-002",
      eventType: "project.published",
      occurredAt: "2026-05-22T18:25:00Z",
      institutionId: "inst-northbridge",
      destination: { connector: "DSpace", region: "US", purpose: "public-metadata" },
      project: {
        id: "proj-202",
        title: "Open Climate Notebook",
        visibility: "public",
        owner: { orcid: "0000-0003-3333-4444" }
      },
      dataset: {
        id: "data-open",
        access: "public",
        embargoUntil: null,
        downloadUrl: "https://doi.org/10.5281/zenodo.20260523",
        doi: "10.5281/zenodo.20260523"
      },
      signature: { algorithm: "HMAC-SHA256", keyId: "enterprise-prod-2026", digest: "sha256:def" }
    },
    {
      eventId: "evt-003",
      eventType: "review.completed",
      occurredAt: "2026-05-22T18:30:00Z",
      institutionId: "inst-northbridge",
      destination: { connector: "Moodle", region: "APAC", purpose: "course-sync" },
      project: {
        id: "proj-303",
        title: "Doctoral Research Review",
        visibility: "institutional-only",
        internalReviewerComments: "Reviewer identity must remain blinded"
      },
      review: {
        id: "rev-900",
        outcome: "approved",
        reviewer: { fullName: "Anonymous Reviewer", employeeId: "E-991" }
      },
      signature: { algorithm: "none", keyId: "test", digest: "" }
    }
  ]
};

module.exports = { project };
