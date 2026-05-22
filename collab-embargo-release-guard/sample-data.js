"use strict";

const unsafeWorkspace = {
  policy: {
    reviewMode: "double_blind",
    releaseClock: {
      timezone: "America/New_York",
      notBefore: "2026-06-01T13:00:00Z",
    },
    embargoes: [
      {
        id: "embargo-dataset-alpha",
        label: "Partner hospital dataset embargo",
        endsAt: "2026-06-15T16:00:00Z",
        timezone: "America/New_York",
        artifactIds: ["dataset-alpha", "supplement-lab-notes"],
      },
    ],
  },
  sections: [
    {
      id: "intro",
      latestVersion: "v5",
      approvedVersion: "v5",
      blindReviewRequired: true,
      exportText: "We study a private cohort.",
    },
    {
      id: "methods",
      latestVersion: "v8",
      approvedVersion: "v7",
      blindReviewRequired: true,
      exportText: "Corresponding author: Dr. Rivera, Example University.",
    },
    {
      id: "results",
      latestVersion: "v3",
      approvedVersion: "v3",
      blindReviewRequired: true,
      exportText: "Results reference dataset alpha.",
    },
  ],
  artifacts: [
    {
      id: "figure-main",
      title: "Main blinded figure",
      classification: "public",
      digest: "sha256:figure-main",
    },
    {
      id: "dataset-alpha",
      title: "Partner hospital dataset alpha",
      classification: "embargoed",
      digest: "sha256:dataset-alpha-raw",
    },
    {
      id: "supplement-lab-notes",
      title: "Lab notes with institution identifiers",
      classification: "restricted",
      digest: "sha256:supplement-lab-notes",
      releaseTreatment: "full",
    },
  ],
  threads: [
    {
      id: "thread-editorial-ready",
      sectionId: "intro",
      visibility: "journal_editor",
      unresolved: false,
      blocksRelease: false,
    },
    {
      id: "thread-private-sponsor",
      sectionId: "methods",
      visibility: "private",
      unresolved: true,
      blocksRelease: true,
    },
  ],
  releasePackage: {
    id: "release-alpha-double-blind",
    channel: "journal-submission",
    releaseAt: "2026-06-01T12:00:00Z",
    metadata: {
      title: "Collaborative Study Alpha",
      authors: ["A. Rivera", "J. Chen"],
      affiliations: ["Example University"],
      correspondingAuthor: "a.rivera@example.edu",
    },
    sectionIds: ["intro", "methods", "results"],
    sections: [
      { id: "intro", version: "v5" },
      { id: "methods", version: "v6" },
      { id: "results", version: "v3" },
    ],
    artifactIds: ["figure-main", "dataset-alpha", "supplement-lab-notes"],
    threadIds: ["thread-editorial-ready", "thread-private-sponsor"],
    includePresenceSnapshots: true,
  },
};

const safeWorkspace = {
  ...unsafeWorkspace,
  sections: [
    {
      id: "intro",
      latestVersion: "v5",
      approvedVersion: "v5",
      blindReviewRequired: true,
      exportText: "We study a private cohort.",
    },
    {
      id: "methods",
      latestVersion: "v8",
      approvedVersion: "v8",
      blindReviewRequired: true,
      exportText: "Methods were reviewed in a blinded packet.",
    },
    {
      id: "results",
      latestVersion: "v3",
      approvedVersion: "v3",
      blindReviewRequired: true,
      exportText: "Results reference redacted dataset evidence.",
    },
  ],
  artifacts: [
    {
      id: "figure-main",
      title: "Main blinded figure",
      classification: "public",
      digest: "sha256:figure-main",
    },
    {
      id: "dataset-alpha",
      title: "Partner hospital dataset alpha redacted digest",
      classification: "embargoed",
      digest: "sha256:dataset-alpha-raw",
      releaseTreatment: "redacted",
      redactionDigest: "sha256:dataset-alpha-redacted",
    },
  ],
  threads: [
    {
      id: "thread-editorial-ready",
      sectionId: "intro",
      visibility: "journal_editor",
      unresolved: false,
      blocksRelease: false,
    },
  ],
  releasePackage: {
    id: "release-alpha-double-blind-safe",
    channel: "journal-submission",
    releaseAt: "2026-06-16T12:00:00Z",
    metadata: {
      title: "Collaborative Study Alpha",
      authors: [],
      affiliations: [],
      correspondingAuthor: "",
    },
    sectionIds: ["intro", "methods", "results"],
    sections: [
      { id: "intro", version: "v5" },
      { id: "methods", version: "v8" },
      { id: "results", version: "v3" },
    ],
    artifactIds: ["figure-main", "dataset-alpha"],
    threadIds: ["thread-editorial-ready"],
    includePresenceSnapshots: false,
  },
};

module.exports = {
  unsafeWorkspace,
  safeWorkspace,
};
