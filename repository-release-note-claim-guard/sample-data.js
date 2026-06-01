const cleanReleasePacket = {
  repositoryId: "scibase-demo-repo",
  versionTag: "preprint-v2.1.0",
  reviewedAt: "2026-06-01T12:00:00Z",
  policy: {
    maxEvidenceAgeDays: 30
  },
  changeSet: [
    {
      id: "chg-analysis-script",
      path: "code/analysis/model-fit.py",
      component: "code",
      digestBefore: "sha256:1111",
      digestAfter: "sha256:2222",
      noteIds: ["rn-001"],
      publicImpact: true
    },
    {
      id: "chg-results-figure",
      path: "results/figures/figure-2.svg",
      component: "results",
      digestBefore: "sha256:3333",
      digestAfter: "sha256:4444",
      noteIds: ["rn-002"],
      publicImpact: true
    },
    {
      id: "chg-metadata",
      path: "metadata.json",
      component: "metadata",
      digestBefore: "sha256:5555",
      digestAfter: "sha256:6666",
      noteIds: ["rn-003"],
      publicImpact: true
    }
  ],
  releaseNotes: [
    {
      id: "rn-001",
      claimType: "code",
      text: "Updated the mixed-effects model fitting script and validated it with repository tests.",
      componentPaths: ["code/analysis/model-fit.py"],
      evidenceIds: ["ev-tests-model"]
    },
    {
      id: "rn-002",
      claimType: "figure",
      text: "Regenerated Figure 2 from the refreshed analysis output with matching checksums.",
      componentPaths: ["results/figures/figure-2.svg"],
      evidenceIds: ["ev-repro-figure", "ev-checksum-figure"]
    },
    {
      id: "rn-003",
      claimType: "metadata",
      text: "Aligned repository metadata and export manifest with the preprint-v2.1.0 citation package.",
      componentPaths: ["metadata.json"],
      evidenceIds: ["ev-export-manifest", "ev-metadata-review"]
    }
  ],
  evidence: [
    {
      id: "ev-tests-model",
      kind: "test",
      status: "passed",
      command: "npm run repository-tests",
      producedAt: "2026-05-31T15:00:00Z",
      coversPaths: ["code/analysis/model-fit.py"]
    },
    {
      id: "ev-repro-figure",
      kind: "reproduction",
      status: "passed",
      command: "python code/analysis/model-fit.py --rebuild-figures",
      producedAt: "2026-05-31T15:20:00Z",
      coversPaths: ["code/analysis/model-fit.py", "results/figures/figure-2.svg"]
    },
    {
      id: "ev-checksum-figure",
      kind: "checksum",
      status: "passed",
      producedAt: "2026-05-31T15:25:00Z",
      coversPaths: ["results/figures/figure-2.svg"]
    },
    {
      id: "ev-export-manifest",
      kind: "export",
      status: "passed",
      producedAt: "2026-05-31T16:00:00Z",
      coversPaths: ["metadata.json", "code/analysis/model-fit.py", "results/figures/figure-2.svg"]
    },
    {
      id: "ev-metadata-review",
      kind: "metadata",
      status: "passed",
      producedAt: "2026-05-31T16:05:00Z",
      coversPaths: ["metadata.json"]
    }
  ],
  exportManifest: {
    versionTag: "preprint-v2.1.0",
    releaseNoteIds: ["rn-001", "rn-002", "rn-003"],
    componentDigests: {
      "code/analysis/model-fit.py": "sha256:2222",
      "results/figures/figure-2.svg": "sha256:4444",
      "metadata.json": "sha256:6666"
    }
  }
};

const riskyReleasePacket = {
  repositoryId: "scibase-demo-repo",
  versionTag: "preprint-v2.2.0",
  reviewedAt: "2026-06-01T12:00:00Z",
  policy: {
    maxEvidenceAgeDays: 30
  },
  changeSet: [
    {
      id: "chg-api-export",
      path: "code/export/public-api.js",
      component: "code",
      digestBefore: "sha256:aaaa",
      digestAfter: "sha256:bbbb",
      noteIds: ["rn-101"],
      publicImpact: true,
      breaking: true
    },
    {
      id: "chg-sensitive-data",
      path: "data/restricted/cohort-clean.csv",
      component: "data",
      digestBefore: "sha256:cccc",
      digestAfter: "sha256:dddd",
      publicImpact: true
    },
    {
      id: "chg-figure",
      path: "results/figures/figure-5.svg",
      component: "results",
      digestBefore: "sha256:eeee",
      digestAfter: "sha256:eeee",
      noteIds: ["rn-102"],
      publicImpact: true
    }
  ],
  releaseNotes: [
    {
      id: "rn-101",
      claimType: "api",
      text: "Updated the public API export with no breaking changes.",
      componentPaths: ["code/export/public-api.js"],
      evidenceIds: ["ev-api-review"]
    },
    {
      id: "rn-102",
      claimType: "reproducibility",
      text: "All results are now fully reproducible and validated.",
      componentPaths: ["results/figures/figure-5.svg"],
      evidenceIds: ["ev-old-repro"]
    },
    {
      id: "rn-103",
      claimType: "dataset",
      text: "Released a cleaned cohort dataset for reviewers.",
      componentPaths: ["data/public/cohort-clean.csv"],
      evidenceIds: ["ev-dataset-diff"]
    }
  ],
  evidence: [
    {
      id: "ev-api-review",
      kind: "review",
      status: "passed",
      producedAt: "2026-05-31T10:00:00Z",
      coversPaths: ["code/export/public-api.js"]
    },
    {
      id: "ev-old-repro",
      kind: "reproduction",
      status: "failed",
      producedAt: "2026-03-01T10:00:00Z",
      coversPaths: ["results/figures/figure-5.svg"]
    },
    {
      id: "ev-dataset-diff",
      kind: "data-diff",
      status: "passed",
      producedAt: "2026-05-31T12:00:00Z",
      coversPaths: ["data/restricted/cohort-clean.csv"]
    }
  ],
  exportManifest: {
    versionTag: "preprint-v2.2.0",
    releaseNoteIds: ["rn-101", "rn-102"],
    componentDigests: {
      "code/export/public-api.js": "sha256:bbbb",
      "results/figures/figure-5.svg": "sha256:eeee"
    }
  }
};

module.exports = {
  cleanReleasePacket,
  riskyReleasePacket
};
