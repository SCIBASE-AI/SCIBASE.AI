"use strict";

const cleanPacket = {
  id: "packet-clean-review-decisions",
  repositoryComponents: [
    { type: "manuscript", path: "manuscript/main.md" },
    { type: "data", path: "data/observations.csv" },
    { type: "code", path: "code/analysis.py" },
    { type: "notebook", path: "notebooks/replay.ipynb" },
    { type: "metadata", path: "metadata.json" }
  ],
  releaseCandidate: {
    tag: "v2.1-review-ready",
    exportManifest: {
      doi: "10.5555/scibase.review.clean",
      bundleHash: "sha256:1b2c3d4e5f6a7b8c",
      reviewDecisionPacket: {
        packetHash: "sha256:pending",
        recordCount: 5
      }
    }
  },
  mergeRequests: [
    {
      id: "MR-242",
      title: "Revise field protocol and reproduce notebook outputs",
      changedComponents: ["manuscript", "data", "code", "notebook", "metadata"],
      reviewThreads: [
        {
          id: "T-manuscript-claims",
          component: "manuscript",
          status: "resolved",
          decision: "accepted",
          reviewerRole: "scientific-editor",
          reviewerId: "reviewer-a",
          anchor: { path: "manuscript/main.md", line: 118, commit: "0e5fbb1" },
          resolutionRationale: "The discussion now records the revised claim language and the corresponding figure reference.",
          exported: true,
          evidenceRefs: ["reports/rendered-manuscript-v2.pdf", "reviews/thread-T-manuscript-claims.md"]
        },
        {
          id: "T-data-units",
          component: "data",
          status: "resolved",
          decision: "changed",
          reviewerRole: "data-steward",
          reviewerId: "reviewer-b",
          anchor: { path: "data/observations.csv", line: 1, commit: "0e5fbb1" },
          resolutionRationale: "The dataset header now states SI units and links to the source instrument calibration sheet.",
          exported: true,
          evidenceRefs: ["data/README.md", "reports/data-dictionary.json"]
        },
        {
          id: "T-code-seed",
          component: "code",
          status: "resolved",
          decision: "changed",
          reviewerRole: "reproducibility-reviewer",
          reviewerId: "reviewer-c",
          anchor: { path: "code/analysis.py", line: 42, commit: "0e5fbb1" },
          resolutionRationale: "The analysis entry point now sets a deterministic seed and exports run metadata.",
          exported: true,
          evidenceRefs: ["reports/replay-log.json"]
        },
        {
          id: "T-notebook-output",
          component: "notebook",
          status: "resolved",
          decision: "accepted",
          reviewerRole: "reproducibility-reviewer",
          reviewerId: "reviewer-c",
          anchor: { path: "notebooks/replay.ipynb", line: 12, commit: "0e5fbb1" },
          resolutionRationale: "Notebook output hashes match the exported result bundle after the data-unit correction.",
          exported: true,
          evidenceRefs: ["reports/notebook-output-hashes.json"]
        },
        {
          id: "T-metadata-doi",
          component: "metadata",
          status: "resolved",
          decision: "accepted",
          reviewerRole: "metadata-curator",
          reviewerId: "reviewer-d",
          anchor: { path: "metadata.json", line: 1, commit: "0e5fbb1" },
          resolutionRationale: "DataCite creator, funder, and relatedIdentifier entries now match the release manifest.",
          exported: true,
          evidenceRefs: ["metadata.json", "reports/datacite-preview.json"]
        }
      ]
    }
  ]
};

const riskyPacket = {
  id: "packet-risky-review-decisions",
  repositoryComponents: [
    { type: "manuscript", path: "manuscript/main.md" },
    { type: "data", path: "data/patient-observations.csv" },
    { type: "code", path: "code/analysis.py" },
    { type: "notebook", path: "notebooks/replay.ipynb" },
    { type: "metadata", path: "metadata.json" }
  ],
  releaseCandidate: {
    tag: "v2.2-public-export",
    exportManifest: {
      doi: "10.5555/scibase.review.risky",
      bundleHash: "sha256:risky"
    }
  },
  mergeRequests: [
    {
      id: "MR-317",
      title: "Prepare public export after restricted data review",
      changedComponents: ["manuscript", "data", "code", "notebook", "metadata"],
      reviewThreads: [
        {
          id: "T-private-note",
          component: "data",
          status: "resolved",
          decision: "deferred",
          reviewerRole: "data-steward",
          reviewerId: "reviewer-z",
          anchor: { path: "data/patient-observations.csv", line: 24, commit: "feedbee" },
          resolutionRationale: "Data row issue discussed in private.",
          containsPrivateNote: true,
          redactedForExport: false,
          exported: true,
          evidenceRefs: ["reviews/private-note.md"]
        },
        {
          id: "T-code-open",
          component: "code",
          status: "open",
          decision: "unspecified",
          reviewerRole: "maintainer",
          reviewerId: "reviewer-c",
          anchor: { path: "code/analysis.py", line: 88, commit: "feedbee" },
          resolutionRationale: "",
          exported: false,
          evidenceRefs: []
        },
        {
          id: "T-notebook-role",
          component: "notebook",
          status: "resolved",
          decision: "accepted",
          reviewerRole: "viewer",
          reviewerId: "reviewer-q",
          anchor: { path: "notebooks/replay.ipynb", line: 9 },
          resolutionRationale: "Looks fine",
          exported: true,
          evidenceRefs: []
        },
        {
          id: "T-metadata-missing-export",
          component: "metadata",
          status: "resolved",
          decision: "changed",
          reviewerRole: "metadata-curator",
          reviewerId: "reviewer-d",
          anchor: { path: "metadata.json", line: 1, commit: "feedbee" },
          resolutionRationale: "Added related identifiers for the cited dataset version.",
          exported: false,
          evidenceRefs: ["metadata.json"]
        }
      ]
    }
  ]
};

module.exports = {
  cleanPacket,
  riskyPacket
};
