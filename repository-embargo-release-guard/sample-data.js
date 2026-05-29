const releaseBatch = {
  id: "embargo-release-2026-05-29",
  generatedAt: "2026-05-29T14:18:00.000Z",
  releaseDate: "2026-05-29",
  assets: [
    {
      id: "asset-1",
      path: "data/protein-folds-public.csv",
      kind: "dataset",
      embargoUntil: "2026-05-01",
      accessGroups: ["public"],
      doiTarget: "10.5555/repo.v2",
      exportTarget: "10.5555/repo.v2",
      citationVisible: true,
      exception: null
    },
    {
      id: "asset-2",
      path: "manuscript/sponsor-results.md",
      kind: "manuscript",
      embargoUntil: "2026-08-15",
      accessGroups: ["sponsor-reviewers", "public"],
      doiTarget: "10.5555/repo.v2",
      exportTarget: "10.5555/repo.v2",
      citationVisible: true,
      exception: null
    },
    {
      id: "asset-3",
      path: "results/funder-required-summary.md",
      kind: "results",
      embargoUntil: "2026-07-01",
      accessGroups: ["funder-public-summary"],
      doiTarget: "10.5555/repo.v2",
      exportTarget: "10.5555/repo.v2",
      citationVisible: true,
      exception: "funder-public-summary"
    },
    {
      id: "asset-4",
      path: "data/clinical-derived.tsv",
      kind: "dataset",
      embargoUntil: "2026-05-10",
      accessGroups: ["clinical-reviewers"],
      doiTarget: "10.5555/repo.v2",
      exportTarget: "10.5555/repo.v1",
      citationVisible: false,
      exception: null
    }
  ]
};

module.exports = { releaseBatch };
