const { hashContent } = require("./index");

function file(path, content, overrides = {}) {
  return {
    path,
    content,
    sha256: overrides.sha256 === undefined ? hashContent(content) : overrides.sha256,
    sizeBytes: Buffer.byteLength(String(content || "")),
    gitLfs: false,
    ...overrides,
  };
}

const auditPolicy = {
  reviewDate: "2026-05-28T00:00:00Z",
  gitLfsThresholdBytes: 1000000,
  maxUnreviewedChanges: 0,
};

const riskyProject = {
  id: "proj-neuro-marker-001",
  title: "Neuro Marker Reproducibility Study",
  files: {
    manuscript: [
      file("manuscript/main.md", "# Neuro Marker Study\n\nPreliminary manuscript"),
    ],
    data: [
      file("data/raw-observations.csv", "subject,response\n1,0.4\n2,0.8", {
        sha256: "stale-digest",
        sizeBytes: 1800000,
      }),
    ],
    code: [
      file("code/analyze.js", "console.log('analysis pending')"),
    ],
    notebooks: [],
    results: [
      file("results/figure-1.svg", "<svg></svg>"),
    ],
    protocols: [],
    metadata: [
      file("metadata.json", "{\"title\":\"Neuro Marker Reproducibility Study\"}"),
    ],
  },
  metadata: {
    title: "Neuro Marker Reproducibility Study",
    authors: [
      { name: "Avery Chen", orcid: "0000-0002-1825-0097" },
      { name: "Jordan Park" },
    ],
    schemaOrgType: "Dataset",
    doi: "",
  },
  release: {
    public: true,
    version: "release-one",
  },
  history: {
    baseCommit: "",
    headCommit: "7c8b9d0",
    unreviewedChanges: 3,
  },
  fork: {
    isFork: true,
    parentProjectId: "",
    attribution: "",
  },
  mergeRequest: {
    required: true,
    reviewedBy: [],
    openDiscussionCount: 2,
  },
  reproducibility: {
    pipelinePath: "",
    lastRunStatus: "failed",
    environment: {},
  },
};

const readyProject = {
  id: "proj-open-catalyst-042",
  files: {
    manuscript: [
      file("manuscript/main.md", "# Catalyst Reuse Study\n\nFinal manuscript"),
    ],
    data: [
      file("data/cleaned.csv", "sample,yield\n1,91\n2,94", {
        sizeBytes: 18000,
      }),
    ],
    code: [
      file("code/analyze.py", "print('analysis complete')"),
    ],
    notebooks: [
      file("notebooks/reproduction.ipynb", "{\"cells\":[]}"),
    ],
    results: [
      file("results/figure-1.svg", "<svg></svg>"),
    ],
    protocols: [
      file("protocols/synthesis.md", "# Protocol\n\nSteps"),
    ],
    metadata: [
      file("metadata.json", "{\"title\":\"Catalyst Reuse Study\"}"),
    ],
  },
  metadata: {
    title: "Catalyst Reuse Study",
    authors: [
      { name: "Morgan Rivera", orcid: "0000-0001-5000-0007" },
      { name: "Sam Taylor", orcid: "0000-0003-1111-2222" },
    ],
    schemaOrgType: "ScholarlyArticle",
    doi: "10.1234/scibase.synthetic.42",
  },
  release: {
    public: true,
    version: "v1.2.0",
  },
  history: {
    baseCommit: "abc1234",
    headCommit: "def5678",
    unreviewedChanges: 0,
  },
  fork: {
    isFork: true,
    parentProjectId: "proj-open-catalyst-001",
    attribution: "Forked from Open Catalyst Seed Study.",
  },
  mergeRequest: {
    required: true,
    reviewedBy: ["reviewer-a"],
    openDiscussionCount: 0,
  },
  reproducibility: {
    pipelinePath: "notebooks/reproduction.ipynb",
    lastRunStatus: "passed",
    environment: {
      containerImage: "ghcr.io/scibase/synthetic-repro:v1.2.0",
    },
  },
};

module.exports = {
  auditPolicy,
  readyProject,
  riskyProject,
};
