const repository = {
  id: "scibase-neurotoxicity-screen",
  currentVersion: "1.4.2",
  doi: "10.5555/scibase.neurotoxicity.2026",
  defaultBranch: "main",
  protectedPaths: ["metadata.json", "protocols/", "results/"],
  hypotheses: [
    {
      id: "HYP-042",
      title: "Dose-response shift after updated astrocyte normalization",
      status: "approved",
      expectedComponents: ["data", "code", "notebook", "results"],
      protocolId: "PRO-17",
    },
    {
      id: "HYP-055",
      title: "Alternative staining protocol for low-signal wells",
      status: "draft",
      expectedComponents: ["protocol", "notebook", "results"],
      protocolId: "PRO-22",
    },
  ],
  protocols: [
    {
      id: "PRO-17",
      snapshot: "pro-17@sha256:9b7a",
      frozen: true,
      approvedBy: ["orcid:0000-0002-1825-0097", "orcid:0000-0003-1415-9265"],
    },
    {
      id: "PRO-22",
      snapshot: "pro-22@draft",
      frozen: false,
      approvedBy: [],
    },
  ],
  branches: [
    {
      name: "experiment/astrocyte-normalization",
      author: "orcid:0000-0002-1825-0097",
      hypothesisId: "HYP-042",
      protocolSnapshot: "pro-17@sha256:9b7a",
      forkOf: "main",
      forkAt: "commit:7d31d0",
      declaredBase: "commit:7d31d0",
      changedComponents: [
        {
          path: "data/astrocyte-normalized.csv",
          type: "data",
          hash: "sha256:2a7d4c",
          producedBy: "notebooks/recompute-dose-response.ipynb",
          largeFile: false,
        },
        {
          path: "code/normalization/astrocyte.js",
          type: "code",
          hash: "sha256:827db1",
          largeFile: false,
        },
        {
          path: "notebooks/recompute-dose-response.ipynb",
          type: "notebook",
          hash: "sha256:9f2c10",
          largeFile: false,
        },
        {
          path: "results/dose-response-v2.svg",
          type: "results",
          hash: "sha256:71e59a",
          inputs: [
            "data/astrocyte-normalized.csv",
            "code/normalization/astrocyte.js",
            "notebooks/recompute-dose-response.ipynb",
          ],
          largeFile: false,
        },
      ],
      reproducibilityRuns: [
        {
          id: "run-811",
          status: "passed",
          commit: "commit:cf3aa2",
          environmentHash: "sha256:env91",
          generatedResults: ["results/dose-response-v2.svg"],
        },
      ],
      citations: {
        authorsChanged: false,
        metadataChanged: true,
        doiTargetChanged: false,
      },
      reviewerApprovals: ["orcid:0000-0003-1415-9265"],
    },
    {
      name: "experiment/low-signal-staining",
      author: "orcid:0000-0009-9999-0000",
      hypothesisId: "HYP-055",
      protocolSnapshot: "pro-22@draft",
      forkOf: "external-lab/fork",
      forkAt: "commit:aa2001",
      declaredBase: "commit:aa2001",
      changedComponents: [
        {
          path: "protocols/low-signal-staining.md",
          type: "protocol",
          hash: "",
          largeFile: false,
        },
        {
          path: "results/low-signal-output.zip",
          type: "results",
          hash: "sha256:9bc3aa",
          inputs: ["notebooks/missing-low-signal.ipynb"],
          largeFile: true,
          lfsTracked: false,
        },
      ],
      reproducibilityRuns: [
        {
          id: "run-912",
          status: "failed",
          commit: "commit:aa2209",
          environmentHash: "sha256:env-drift",
          generatedResults: [],
        },
      ],
      citations: {
        authorsChanged: true,
        metadataChanged: false,
        doiTargetChanged: true,
      },
      reviewerApprovals: [],
    },
  ],
};

module.exports = { repository };
