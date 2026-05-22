const policy = {
  maxSnapshotAgeDays: 30,
  maxRestoreDrillAgeDays: 21,
  maxNotebookReplayAgeDays: 14,
  requiredRefs: ["refs/heads/main"],
  requiredEnvironmentLocks: ["containerDigest", "dependencyLock"],
}

const repositories = [
  {
    repositoryId: "neuro-reproducibility-atlas",
    title: "Neuro Reproducibility Atlas",
    releaseCandidate: {
      snapshotId: "snap-2026-05-21",
      tag: "v1.2.0",
      requiredRefs: ["refs/heads/release/v1.2"],
    },
    expectedComponents: [
      { component: "manuscript", hash: "sha256:manuscript-9f4a" },
      { component: "data", hash: "sha256:data-18aa" },
      { component: "code", hash: "sha256:code-73be" },
      { component: "metadata", hash: "sha256:metadata-4420" },
    ],
    snapshots: [
      {
        id: "snap-2026-05-21",
        createdAt: "2026-05-21T10:00:00.000Z",
        refs: ["refs/heads/main", "refs/heads/release/v1.2"],
        tags: ["v1.2.0"],
        environmentLocks: {
          containerDigest: "sha256:container-20260521",
          dependencyLock: "renv.lock@sha256:836d",
        },
        exportManifest: {
          snapshotId: "snap-2026-05-21",
          doi: "10.5555/scibase.neuro-atlas.v1.2.0",
        },
        artifacts: [
          { component: "manuscript", path: "manuscript/main.md", hash: "sha256:manuscript-9f4a" },
          {
            component: "data",
            path: "data/participants.parquet",
            hash: "sha256:data-18aa",
            large: true,
            storage: "lfs",
            mirror: { status: "ready", hash: "sha256:data-18aa" },
          },
          { component: "code", path: "code/pipeline.py", hash: "sha256:code-73be" },
          {
            component: "notebooks",
            path: "notebooks/reproduce.ipynb",
            hash: "sha256:notebook-530a",
            replay: { status: "passed", completedAt: "2026-05-22T08:00:00.000Z" },
          },
          { component: "metadata", path: "metadata.json", hash: "sha256:metadata-4420" },
        ],
      },
    ],
    restoreDrills: [
      {
        id: "drill-neuro-20260522",
        snapshotId: "snap-2026-05-21",
        status: "passed",
        completedAt: "2026-05-22T09:00:00.000Z",
      },
    ],
  },
  {
    repositoryId: "climate-table-fork",
    title: "Climate Table Fork",
    releaseCandidate: {
      snapshotId: "snap-2026-05-08",
      tag: "preprint-v0.9",
      requiredRefs: ["refs/heads/release/preprint"],
    },
    expectedComponents: [
      { component: "manuscript", hash: "sha256:climate-manuscript" },
      { component: "data", hash: "sha256:expected-climate-data" },
      { component: "code", hash: "sha256:climate-code" },
      { component: "metadata", hash: "sha256:climate-metadata" },
    ],
    snapshots: [
      {
        id: "snap-2026-05-08",
        createdAt: "2026-05-08T11:00:00.000Z",
        refs: ["refs/heads/main"],
        tags: [],
        environmentLocks: {
          containerDigest: "sha256:container-climate",
        },
        exportManifest: {
          snapshotId: "snap-2026-05-08",
          doi: "10.5555/scibase.climate.preprint",
        },
        artifacts: [
          { component: "manuscript", path: "manuscript/paper.md", hash: "sha256:climate-manuscript" },
          {
            component: "data",
            path: "data/raw-grid.parquet",
            hash: "sha256:actual-climate-data",
            large: true,
            storage: "lfs",
            mirror: { status: "missing" },
          },
          { component: "code", path: "code/model.py", hash: "sha256:climate-code" },
          { component: "metadata", path: "metadata.json", hash: "sha256:climate-metadata" },
        ],
      },
    ],
    restoreDrills: [
      {
        id: "drill-climate-20260509",
        snapshotId: "snap-2026-05-08",
        status: "failed",
        completedAt: "2026-05-09T09:00:00.000Z",
      },
    ],
  },
  {
    repositoryId: "protein-model-sandbox",
    title: "Protein Model Sandbox",
    releaseCandidate: {
      snapshotId: "snap-2026-04-14",
      tag: "v0.4.0",
      requiredRefs: ["refs/heads/release/v0.4"],
    },
    expectedComponents: [
      { component: "manuscript", hash: "sha256:protein-manuscript" },
      { component: "data", hash: "sha256:protein-data" },
      { component: "code", hash: "sha256:protein-code" },
      { component: "metadata", hash: "sha256:protein-metadata" },
    ],
    snapshots: [
      {
        id: "snap-2026-04-14",
        createdAt: "2026-04-14T09:00:00.000Z",
        refs: ["refs/heads/main", "refs/heads/release/v0.4"],
        tags: ["v0.4.0"],
        environmentLocks: {
          containerDigest: "sha256:container-protein",
          dependencyLock: "requirements.txt@sha256:7e8a",
        },
        artifacts: [
          { component: "manuscript", path: "manuscript/model.md", hash: "sha256:protein-manuscript" },
          {
            component: "data",
            path: "data/features.arrow",
            hash: "sha256:protein-data",
            large: true,
            mirror: { status: "ready", hash: "sha256:protein-data" },
          },
          { component: "code", path: "code/train.py", hash: "sha256:protein-code" },
          {
            component: "notebooks",
            path: "notebooks/evaluation.ipynb",
            hash: "sha256:protein-notebook",
            replay: { status: "passed", completedAt: "2026-04-16T10:00:00.000Z" },
          },
          { component: "metadata", path: "metadata.json", hash: "sha256:protein-metadata" },
        ],
      },
    ],
    restoreDrills: [
      {
        id: "drill-protein-20260417",
        snapshotId: "snap-2026-04-14",
        status: "passed",
        completedAt: "2026-04-17T10:00:00.000Z",
      },
    ],
  },
]

module.exports = {
  policy,
  repositories,
}
