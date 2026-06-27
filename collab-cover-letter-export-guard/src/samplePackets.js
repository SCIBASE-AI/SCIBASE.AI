export const cleanSubmissionPacket = {
  id: "submission-ready-cover-letter",
  manuscript: {
    versionHash: "ms-v9-6f2a",
    title: "Longitudinal biomarker stability in synthetic cohort data",
    claims: {
      novelty: "First preregistered multi-site synthetic stability analysis in this cohort.",
      ethics: "Synthetic-only data with no human participant identifiers.",
      dataAvailability: "Synthetic data and analysis code are available in the linked repository.",
      conflicts: "The authors declare no competing interests.",
    },
    finalEditedAt: "2026-06-21T12:00:00Z",
  },
  coverLetter: {
    manuscriptHash: "ms-v9-6f2a",
    editedAt: "2026-06-21T12:08:00Z",
    correspondingAuthorApproval: {
      authorId: "author-1",
      approvedHash: "ms-v9-6f2a",
      approvedAt: "2026-06-21T12:12:00Z",
    },
    coauthorApprovals: [
      { authorId: "author-2", approvedHash: "ms-v9-6f2a", approvedAt: "2026-06-21T12:20:00Z" },
      { authorId: "author-3", approvedHash: "ms-v9-6f2a", approvedAt: "2026-06-21T12:21:00Z" },
    ],
    statements: {
      novelty: "First preregistered multi-site synthetic stability analysis in this cohort.",
      ethics: "Synthetic-only data with no human participant identifiers.",
      dataAvailability: "Synthetic data and analysis code are available in the linked repository.",
      conflicts: "The authors declare no competing interests.",
    },
    editorNotes: [
      "We believe the study fits the journal scope because it demonstrates reproducible synthetic cohort validation.",
    ],
    privateCommentExports: [],
  },
  collaborators: [
    { authorId: "author-1", role: "corresponding-author" },
    { authorId: "author-2", role: "coauthor" },
    { authorId: "author-3", role: "coauthor" },
  ],
};

export const riskySubmissionPacket = {
  id: "submission-blocked-cover-letter",
  manuscript: {
    versionHash: "ms-v11-aa30",
    title: "Model-assisted detection of assay drift in synthetic submissions",
    claims: {
      novelty: "A synthetic benchmark for assay drift detection across three labs.",
      ethics: "Synthetic samples only; no patient identifiers are included.",
      dataAvailability: "Synthetic data will be released after editorial acceptance.",
      conflicts: "Author B consults for LabScale Analytics.",
    },
    finalEditedAt: "2026-06-22T18:40:00Z",
  },
  coverLetter: {
    manuscriptHash: "ms-v10-21bd",
    editedAt: "2026-06-22T17:45:00Z",
    correspondingAuthorApproval: {
      authorId: "author-1",
      approvedHash: "ms-v10-21bd",
      approvedAt: "2026-06-22T17:50:00Z",
    },
    coauthorApprovals: [
      { authorId: "author-2", approvedHash: "ms-v10-21bd", approvedAt: "2026-06-22T17:51:00Z" },
    ],
    statements: {
      novelty: "The first assay drift detector validated in live clinical data.",
      ethics: "No ethics statement is required.",
      dataAvailability: "All raw data are publicly available now.",
      conflicts: "The authors declare no competing interests.",
    },
    editorNotes: [
      "Private reviewer note: Reviewer 2 questioned whether the synthetic cohort is sufficient.",
      "Please consider this despite the unresolved collaborator comment in section 4.",
    ],
    privateCommentExports: [
      {
        commentId: "c-private-77",
        section: "Results",
        text: "Internal note: do not disclose LabScale consulting until legal confirms wording.",
      },
    ],
  },
  collaborators: [
    { authorId: "author-1", role: "corresponding-author" },
    { authorId: "author-2", role: "coauthor" },
    { authorId: "author-3", role: "coauthor" },
  ],
};
