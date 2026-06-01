"use strict";

const cleanPacket = {
  document: {
    id: "manuscript-cardiometabolic-001",
    title: "Collaborative cardiometabolic atlas draft",
    exportFormat: "pdf-html"
  },
  sections: [
    { id: "results", title: "Results", locked: true },
    { id: "supplement", title: "Supplementary tables", locked: false }
  ],
  artifacts: [
    {
      id: "fig-1",
      type: "figure",
      sectionId: "results",
      caption: "Figure 1. Multimodal cardiometabolic risk clusters across three cohorts.",
      altText:
        "Three cohort panels show the same upward risk gradient from cluster A to C, with cluster C carrying the highest inflammatory marker load.",
      longDescription:
        "Each panel contains three clusters ordered by risk score. Cluster C is consistently highest for CRP and fasting glucose, while cluster A remains lowest across cohorts.",
      visualization: "multi-panel scatter",
      visualChannels: ["position", "shape", "color"],
      nonColorEncoding: true,
      sourceHash: "sha256:figure-one-current",
      altTextSourceHash: "sha256:figure-one-current",
      updatedAt: "2026-05-31T15:00:00.000Z",
      altTextReviewedAt: "2026-05-31T16:00:00.000Z",
      altTextChangedInLock: true
    },
    {
      id: "tbl-1",
      type: "table",
      sectionId: "supplement",
      caption: "Table 1. Cohort sample counts and assay coverage.",
      altText:
        "The table compares sample counts, assay coverage, and missingness rates, showing cohort B has the broadest assay coverage and lowest missingness.",
      tableSummary:
        "Rows are cohorts and columns summarize sample count, proteomics coverage, metabolomics coverage, and missingness percentage.",
      columns: [
        { id: "cohort", header: "Cohort", scope: "row" },
        { id: "n", header: "Samples", scope: "col" },
        { id: "proteomics", header: "Proteomics coverage", scope: "col" },
        { id: "missingness", header: "Missingness", scope: "col" }
      ],
      sourceHash: "sha256:table-one-current",
      altTextSourceHash: "sha256:table-one-current",
      updatedAt: "2026-05-31T15:15:00.000Z",
      altTextReviewedAt: "2026-05-31T16:00:00.000Z"
    }
  ],
  comments: [
    {
      id: "c-1",
      artifactId: "fig-1",
      status: "resolved",
      blocking: true,
      summary: "Alt text now names the cross-cohort trend."
    }
  ],
  accessibilityApprovals: [
    { artifactId: "fig-1", scope: "accessible-export", status: "approved" },
    { artifactId: "fig-1", scope: "locked-section-alt-text", status: "approved" },
    { artifactId: "tbl-1", scope: "accessible-export", status: "approved" }
  ]
};

const revisionPacket = {
  document: {
    id: "manuscript-ecology-002",
    title: "Shared wetland recovery manuscript",
    exportFormat: "docx"
  },
  sections: [{ id: "results", title: "Results", locked: true }],
  artifacts: [
    {
      id: "fig-2",
      type: "figure",
      sectionId: "results",
      caption: "Figure 2. Nutrient recovery map after restoration.",
      altText: "Figure showing a map.",
      visualization: "heatmap",
      visualChannels: ["position", "color", "intensity"],
      nonColorEncoding: false,
      sourceHash: "sha256:map-current",
      altTextSourceHash: "sha256:map-old",
      updatedAt: "2026-05-31T18:00:00.000Z",
      altTextReviewedAt: "2026-05-31T17:00:00.000Z",
      altTextChangedInLock: true
    },
    {
      id: "tbl-2",
      type: "table",
      sectionId: "results",
      caption: "Table 2. Sensor calibration ranges.",
      altText: "Sensor calibration ranges by station and month.",
      columns: [{ id: "station", header: "Station" }],
      sourceHash: "sha256:table-two",
      altTextSourceHash: "sha256:table-two",
      updatedAt: "2026-05-31T16:00:00.000Z",
      altTextReviewedAt: "2026-05-31T16:30:00.000Z"
    }
  ],
  comments: [
    {
      id: "c-2",
      artifactId: "fig-2",
      status: "open",
      blocking: true,
      summary: "Alt text must describe the nutrient gradient and not just the visual map."
    }
  ],
  accessibilityApprovals: []
};

const holdPacket = {
  document: {
    id: "manuscript-neuro-003",
    title: "Blinded neuroimaging collaboration",
    exportFormat: "html"
  },
  sections: [{ id: "blind-results", title: "Blind review results", locked: false }],
  artifacts: [
    {
      id: "fig-3",
      type: "figure",
      sectionId: "blind-results",
      caption: "Figure 3. Functional connectivity change after protocol revision.",
      altText:
        "Dr. Smith noted this image of cohort changes in /Users/reviewer/private/holdout, including patient-id 8842 from the reviewer-only packet.",
      longDescription: "Reviewer-only note should not leave the blinded workspace.",
      visualization: "network",
      visualChannels: ["position", "color", "edgeWidth"],
      nonColorEncoding: true,
      sourceHash: "sha256:network-current",
      altTextSourceHash: "sha256:network-current",
      updatedAt: "2026-05-31T15:00:00.000Z",
      altTextReviewedAt: "2026-05-31T15:10:00.000Z"
    }
  ],
  comments: [],
  accessibilityApprovals: [{ artifactId: "fig-3", scope: "accessible-export", status: "approved" }]
};

module.exports = {
  cleanPacket,
  revisionPacket,
  holdPacket
};
