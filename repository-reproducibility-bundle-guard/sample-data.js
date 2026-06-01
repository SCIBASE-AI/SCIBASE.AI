const goodDigest = "a".repeat(64);
const secondDigest = "b".repeat(64);
const thirdDigest = "c".repeat(64);
const fourthDigest = "d".repeat(64);
const fifthDigest = "e".repeat(64);
const sixthDigest = "f".repeat(64);
const seventhDigest = "1".repeat(64);
const bundleDigest = "2".repeat(64);
const runtimeDigest = `ghcr.io/scibase/python-research@sha256:${"3".repeat(64)}`;

const releaseCandidate = {
  repositoryId: "repo-climate-forecasting",
  releaseTag: "preprint-v2.1.0",
  commit: "9f8c7d6e5b4a3210",
  metadata: {
    doi: "10.5555/scibase.climate.2026.002",
    schemaOrg: true,
    dataCite: true,
    license: "CC-BY-4.0",
    authors: ["orcid:0000-0002-1825-0097", "orcid:0000-0003-1415-9265"],
  },
  components: [
    {
      id: "manuscript-main",
      type: "manuscript",
      path: "manuscript/main.md",
      sha256: goodDigest,
      bytes: 18422,
      provenanceRefs: ["protocols/forecast-protocol.md"],
      exportTargets: ["pdf", "html"],
    },
    {
      id: "observations",
      type: "data",
      path: "data/observations.parquet",
      sha256: secondDigest,
      bytes: 90021,
      provenanceRefs: ["instrument:NOAA-GHCN", "commit:9f8c7d6e5b4a3210"],
      exportTargets: ["parquet", "csv-preview"],
    },
    {
      id: "analysis-code",
      type: "code",
      path: "code/train.py",
      sha256: thirdDigest,
      bytes: 15420,
      runtimeImage: runtimeDigest,
      lockfiles: ["code/requirements.lock"],
      provenanceRefs: ["data/observations.parquet"],
    },
    {
      id: "notebook-validation",
      type: "notebook",
      path: "notebooks/validation.ipynb",
      sha256: fourthDigest,
      bytes: 74210,
      runtimeImage: runtimeDigest,
      lockfiles: ["code/requirements.lock"],
      provenanceRefs: ["code/train.py"],
    },
    {
      id: "figure-pack",
      type: "results",
      path: "results/figures.zip",
      sha256: fifthDigest,
      bytes: 25001,
      provenanceRefs: ["notebooks/validation.ipynb"],
      exportTargets: ["png", "svg"],
    },
    {
      id: "forecast-protocol",
      type: "protocol",
      path: "protocols/forecast-protocol.md",
      sha256: sixthDigest,
      bytes: 9360,
      provenanceRefs: ["doi:10.5555/scibase.climate.2026.001"],
    },
    {
      id: "metadata",
      type: "metadata",
      path: "metadata.json",
      sha256: seventhDigest,
      bytes: 4200,
      exportTargets: ["doi", "schema.org", "datacite"],
    },
  ],
  bundle: {
    archivePath: "exports/repo-climate-forecasting-preprint-v2.1.0.tar.gz",
    sha256: bundleDigest,
    generatedAt: "2026-06-01T18:00:00Z",
    includes: [
      "manuscript/main.md",
      "data/observations.parquet",
      "code/train.py",
      "notebooks/validation.ipynb",
      "results/figures.zip",
      "protocols/forecast-protocol.md",
      "metadata.json",
    ],
  },
};

const riskyCandidate = {
  ...releaseCandidate,
  repositoryId: "repo-incomplete-export",
  releaseTag: "preprint-v2.2.0",
  metadata: {
    doi: "",
    schemaOrg: false,
    dataCite: true,
    license: "",
    authors: [],
  },
  components: [
    {
      id: "manuscript-main",
      type: "manuscript",
      path: "manuscript/main.md",
      sha256: "not-a-digest",
      bytes: 18422,
      provenanceRefs: [],
    },
    {
      id: "observations",
      type: "data",
      path: "data/observations.parquet",
      sha256: secondDigest,
      bytes: 90021,
      provenanceRefs: [],
    },
    {
      id: "analysis-code",
      type: "code",
      path: "code/train.py",
      sha256: thirdDigest,
      bytes: 15420,
      runtimeImage: "ghcr.io/scibase/python-research:latest",
      lockfiles: [],
      provenanceRefs: ["data/observations.parquet"],
    },
    {
      id: "duplicate-code",
      type: "code",
      path: "code/train.py",
      sha256: thirdDigest,
      bytes: 15420,
      runtimeImage: "ghcr.io/scibase/python-research:latest",
      lockfiles: [],
    },
    {
      id: "metadata",
      type: "metadata",
      path: "metadata.json",
      sha256: seventhDigest,
      bytes: 4200,
      exportTargets: [],
      versioned: false,
    },
  ],
  bundle: {
    archivePath: "exports/repo-incomplete-export.tar.gz",
    sha256: "bad-bundle-digest",
    generatedAt: "2026-06-01T18:00:00Z",
    includes: ["manuscript/main.md", "metadata.json"],
  },
};

module.exports = {
  releaseCandidate,
  riskyCandidate,
};
