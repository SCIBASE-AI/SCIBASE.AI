const componentPolicy = {
  manuscript: {
    paths: ["manuscript/"],
    owners: ["scientific-editor", "corresponding-author"],
    quorum: 1
  },
  data: {
    paths: ["data/"],
    owners: ["data-steward", "privacy-reviewer"],
    quorum: 1,
    restrictedOwners: ["privacy-reviewer", "irb-liaison"]
  },
  code: {
    paths: ["code/"],
    owners: ["analysis-lead", "reproducibility-engineer"],
    quorum: 1
  },
  notebooks: {
    paths: ["notebooks/"],
    owners: ["analysis-lead", "reproducibility-engineer"],
    quorum: 1
  },
  protocols: {
    paths: ["protocols/"],
    owners: ["protocol-owner", "lab-manager"],
    quorum: 1,
    restrictedOwners: ["protocol-owner", "irb-liaison"]
  },
  results: {
    paths: ["results/"],
    owners: ["analysis-lead", "scientific-editor"],
    quorum: 1
  },
  metadata: {
    paths: ["metadata.json"],
    owners: ["repository-curator", "corresponding-author"],
    quorum: 1
  }
};

const mergeRequests = [
  {
    id: "MR-2401",
    title: "Refresh methods text and analysis notebook",
    authors: ["lee"],
    changedAt: "2026-05-22T09:20:00Z",
    files: [
      { path: "manuscript/methods.md", changeType: "modify" },
      { path: "notebooks/analysis.ipynb", changeType: "modify" },
      { path: "results/figure-2.svg", changeType: "add" }
    ],
    approvals: [
      {
        user: "mira",
        role: "scientific-editor",
        components: ["manuscript", "results"],
        approvedAt: "2026-05-22T09:52:00Z"
      },
      {
        user: "arun",
        role: "analysis-lead",
        components: ["notebooks", "results"],
        approvedAt: "2026-05-22T10:04:00Z"
      }
    ]
  },
  {
    id: "MR-2417",
    title: "Publish restricted participant table with updated protocol",
    authors: ["tess"],
    changedAt: "2026-05-22T11:45:00Z",
    files: [
      { path: "data/participant_export.csv", changeType: "add", restricted: true },
      { path: "protocols/collection-plan.md", changeType: "modify", restricted: true },
      { path: "metadata.json", changeType: "modify" }
    ],
    approvals: [
      {
        user: "noor",
        role: "data-steward",
        components: ["data"],
        approvedAt: "2026-05-22T12:01:00Z"
      },
      {
        user: "tess",
        role: "protocol-owner",
        components: ["protocols"],
        approvedAt: "2026-05-22T12:04:00Z"
      },
      {
        user: "ivy",
        role: "repository-curator",
        components: ["metadata"],
        approvedAt: "2026-05-22T12:08:00Z"
      }
    ]
  },
  {
    id: "MR-2422",
    title: "Retag code package after model output changes",
    authors: ["omar"],
    changedAt: "2026-05-22T15:35:00Z",
    files: [
      { path: "code/model/train.py", changeType: "modify" },
      { path: "results/model-card.md", changeType: "modify" },
      { path: "metadata.json", changeType: "modify" }
    ],
    approvals: [
      {
        user: "arun",
        role: "analysis-lead",
        components: ["code", "results"],
        approvedAt: "2026-05-22T14:58:00Z"
      },
      {
        user: "ivy",
        role: "repository-curator",
        components: ["metadata"],
        approvedAt: "2026-05-22T16:00:00Z"
      }
    ]
  },
  {
    id: "MR-2430",
    title: "Release curated dataset and citation metadata",
    authors: ["nina"],
    changedAt: "2026-05-22T17:00:00Z",
    files: [
      { path: "data/curated-measurements.parquet", changeType: "add" },
      { path: "metadata.json", changeType: "modify" },
      { path: "manuscript/data-availability.md", changeType: "modify" }
    ],
    approvals: [
      {
        user: "noor",
        role: "data-steward",
        components: ["data"],
        approvedAt: "2026-05-22T17:10:00Z"
      },
      {
        user: "ivy",
        role: "repository-curator",
        components: ["metadata"],
        approvedAt: "2026-05-22T17:15:00Z"
      },
      {
        user: "mira",
        role: "scientific-editor",
        components: ["manuscript"],
        approvedAt: "2026-05-22T17:18:00Z"
      }
    ]
  }
];

module.exports = {
  componentPolicy,
  mergeRequests
};
