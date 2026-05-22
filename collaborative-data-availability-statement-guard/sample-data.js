const project = {
  asOfDate: "2026-05-22",
  manuscript: {
    id: "ms-collab-astro-042",
    title: "Joint Galaxy Morphology Review",
    targetJournal: "Synthetic Journal of Open Science",
    exportDeadline: "2026-05-25",
    sections: [
      {
        id: "methods",
        title: "Methods",
        text:
          "The study used a synthetic morphology corpus with reviewer-only raw tables and a scripted notebook pipeline."
      },
      {
        id: "data-availability",
        title: "Data Availability",
        text:
          "Processed tables are available at Zenodo accession ZEN-2026-7788 after acceptance. Raw human-derived review notes are restricted and released as de-identified summaries only."
      },
      {
        id: "code-availability",
        title: "Code Availability",
        text:
          "Analysis notebooks are available at GitHub repository synthetic-lab/galaxy-review under the MIT license."
      }
    ],
    citations: [
      { id: "cite-dataset", kind: "dataset", accessionId: "ZEN-2026-7788", sectionId: "data-availability" },
      { id: "cite-notebook", kind: "code", accessionId: "GH-synthetic-lab-galaxy-review", sectionId: "code-availability" }
    ]
  },
  collaborators: [
    { id: "alice", role: "corresponding-author", approval: "approved", approvedAt: "2026-05-20" },
    { id: "devon", role: "data-steward", approval: "pending", approvedAt: null },
    { id: "mira", role: "code-owner", approval: "approved", approvedAt: "2026-05-21" }
  ],
  editorState: {
    lastExportAttemptAt: "2026-05-22T15:20:00Z",
    unresolvedComments: [
      {
        id: "comment-17",
        sectionId: "data-availability",
        severity: "blocking",
        text: "Confirm reviewer-only link expiry before export."
      }
    ],
    pendingChanges: [
      { id: "change-9", sectionId: "data-availability", authorId: "devon", status: "unmerged" }
    ]
  },
  repositories: [
    {
      id: "repo-data-processed",
      label: "Processed synthetic tables",
      kind: "dataset",
      accessionId: "ZEN-2026-7788",
      provider: "Zenodo",
      access: "embargoed",
      releaseDate: "2026-06-05",
      reviewerLinkExpiresAt: "2026-05-23",
      license: "CC-BY-4.0",
      containsHumanDerivedData: false,
      deidentificationEvidenceId: null,
      checksum: "sha256:3e1a9bff5781"
    },
    {
      id: "repo-data-raw",
      label: "Reviewer note extracts",
      kind: "dataset",
      accessionId: "",
      provider: "Institutional vault",
      access: "restricted",
      releaseDate: null,
      reviewerLinkExpiresAt: "2026-05-19",
      license: "",
      containsHumanDerivedData: true,
      deidentificationEvidenceId: "",
      checksum: "sha256:rawnotes9"
    },
    {
      id: "repo-code-notebooks",
      label: "Notebook pipeline",
      kind: "code",
      accessionId: "GH-synthetic-lab-galaxy-review",
      provider: "GitHub",
      access: "public",
      releaseDate: "2026-05-20",
      reviewerLinkExpiresAt: null,
      license: "MIT",
      containsHumanDerivedData: false,
      deidentificationEvidenceId: null,
      checksum: "sha256:notebook221"
    }
  ],
  policy: {
    requiredSections: ["data-availability", "code-availability"],
    requiredApproverRoles: ["corresponding-author", "data-steward", "code-owner"],
    acceptedDatasetLicenses: ["CC-BY-4.0", "CC0-1.0", "ODC-BY-1.0"],
    acceptedCodeLicenses: ["MIT", "Apache-2.0", "BSD-3-Clause"],
    reviewerLinkMinimumDays: 5,
    publicReleaseGraceDays: 7
  }
};

module.exports = { project };
