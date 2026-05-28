"use strict";

const derivedRepository = {
  id: "repo-neuro-derived",
  title: "Derived Neuro Biomarker Repository",
  forkedFrom: "repo-neuro-base",
  license: "proprietary",
  contributors: [
    { id: "maya", name: "Maya Chen" },
    { id: "ravi", name: "Ravi Patel" },
  ],
  upstream: {
    id: "repo-neuro-base",
    commitSha: "base-001",
    license: "CC-BY-4.0",
    contributors: [
      { id: "maya", name: "Maya Chen" },
      { id: "lin", name: "Lin Okafor" },
      { id: "ravi", name: "Ravi Patel" },
    ],
  },
  commits: [
    {
      sha: "base-001",
      authorId: "maya",
      message: "Initial fork anchor",
    },
    {
      sha: "exp-101",
      authorId: "ravi",
      message: "Add retinal imaging notebook",
    },
    {
      sha: "tag-200",
      authorId: "maya",
      message: "Prepare preprint v2",
    },
  ],
  mergeRequests: [
    {
      id: "mr-101",
      sourceBranch: "hypothesis-retinal-panel",
      targetBranch: "main",
      mergeBase: "missing-base",
      historyRewrite: false,
    },
    {
      id: "mr-102",
      sourceBranch: "rewrite-manuscript-history",
      targetBranch: "main",
      mergeBase: "base-001",
      historyRewrite: true,
      maintainerReviewId: "",
    },
  ],
  tags: [
    {
      name: "preprint-v2.1",
      commitSha: "tag-200",
      metadataHash: "meta-good",
    },
  ],
  dois: [
    {
      tag: "preprint-v2.1",
      doi: "10.5555/scibase.neuro.2.1",
      commitSha: "exp-101",
      metadataHash: "meta-old",
    },
  ],
  exportBundles: [
    {
      id: "export-001",
      tag: "preprint-v2.1",
      commitSha: "exp-101",
      manifestHash: "not-the-real-hash",
      files: [
        { path: "manuscript/main.md", sha256: "a1" },
        { path: "data/retina.csv", sha256: "b2" },
        { path: "code/run_analysis.py", sha256: "c3" },
      ],
    },
  ],
  citationBadges: [
    {
      id: "cite-preprint-v2",
      tag: "preprint-v2.1",
      metadataHash: "meta-old",
    },
  ],
};

module.exports = {
  derivedRepository,
};
