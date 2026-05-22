const HASH_A =
  "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const HASH_B =
  "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const HASH_C =
  "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
const HASH_D =
  "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
const HASH_E =
  "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const HASH_F =
  "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

const sampleCandidates = [
  {
    repositoryId: "neuro-lab/sleep-spindle-atlas",
    tag: "preprint-v2.1",
    doiDraft: "10.5555/scibase.sleep-spindle-atlas.v2",
    componentManifestHash: HASH_A,
    exportBundleHash: HASH_B,
    reviewers: ["orcid:0000-0002-1825-0097", "orcid:0000-0003-1555-4212"],
    pipelines: [
      {
        id: "analysis-primary",
        component: "code/run_analysis.ipynb",
        inputManifestHash: HASH_C,
        lockfileHash: HASH_D,
        sandbox: {
          image:
            "ghcr.io/scibase/repro-python@sha256:1111111111111111111111111111111111111111111111111111111111111111",
          networkEgress: "none",
          egressAllowlist: [],
          readOnlyInputs: true,
          writableMounts: [
            {
              path: "/tmp/scibase-run/analysis-primary",
              maxGb: 1.5,
            },
          ],
        },
        compute: {
          cpuCores: 8,
          memoryGb: 32,
          runtimeMinutes: 115,
          gpuCount: 0,
          deterministicSeed: "sleep-spindle-atlas-v2",
        },
        expectedArtifacts: [
          {
            name: "results/tables/spindle-summary.csv",
            hash: HASH_E,
          },
          {
            name: "results/figures/cohort-comparison.svg",
            hash: HASH_F,
          },
        ],
      },
    ],
  },
  {
    repositoryId: "oncology-lab/cell-response-map",
    tag: "release-unsafe-candidate",
    doiDraft: "10.5555/scibase.cell-response-map.unsafe",
    componentManifestHash: HASH_B,
    exportBundleHash: "",
    reviewers: ["orcid:0000-0001-0000-0000"],
    pipelines: [
      {
        id: "training-open-network",
        component: "notebooks/train-response-model.ipynb",
        inputManifestHash: "",
        lockfileHash: "",
        sandbox: {
          image: "python:latest",
          networkEgress: "open-internet",
          egressAllowlist: ["pypi.org", "example-data.invalid"],
          readOnlyInputs: false,
          writableMounts: [
            {
              path: "/workspace",
              maxGb: 12,
            },
          ],
        },
        compute: {
          cpuCores: 24,
          memoryGb: 96,
          runtimeMinutes: 360,
          gpuCount: 1,
          deterministicSeed: "",
        },
        expectedArtifacts: [
          {
            name: "results/models/cell-response.pt",
            hash: "pending",
          },
        ],
      },
    ],
  },
  {
    repositoryId: "climate-lab/regional-ensemble",
    tag: "preprint-v1.4",
    doiDraft: "10.5555/scibase.regional-ensemble.v1",
    componentManifestHash: HASH_C,
    exportBundleHash: HASH_D,
    reviewers: ["orcid:0000-0002-4444-8888"],
    pipelines: [
      {
        id: "gpu-ensemble-replay",
        component: "code/replay_ensemble.py",
        inputManifestHash: HASH_E,
        lockfileHash: HASH_F,
        sandbox: {
          image:
            "ghcr.io/scibase/repro-cuda@sha256:2222222222222222222222222222222222222222222222222222222222222222",
          networkEgress: "doi-resolution-only",
          egressAllowlist: ["doi.org", "api.datacite.org"],
          egressJustification: "Resolve DOI metadata during citation export only.",
          readOnlyInputs: true,
          writableMounts: [
            {
              path: "/tmp/scibase-run/gpu-ensemble-replay",
              maxGb: 2,
            },
          ],
        },
        compute: {
          cpuCores: 12,
          memoryGb: 48,
          runtimeMinutes: 210,
          gpuCount: 1,
          gpuJustification:
            "Replay published CUDA ensemble with deterministic kernels and fixed seeds.",
          deterministicSeed: "regional-ensemble-v1.4",
        },
        expectedArtifacts: [
          {
            name: "results/ensemble/replay-summary.json",
            hash: HASH_A,
          },
        ],
      },
    ],
  },
];

module.exports = {
  sampleCandidates,
};
