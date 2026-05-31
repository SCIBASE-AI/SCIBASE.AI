"use strict";

const sampleRepository = {
  now: "2026-05-31T04:45:00.000Z",
  policy: {
    minimumUnreferencedAgeDays: 30,
  },
  artifacts: [
    {
      id: "fig-survival-curve",
      path: "results/figures/survival-curve.svg",
      kind: "figure",
      hash: "sha256:fig-001",
      createdAt: "2026-03-01T10:00:00.000Z",
      lastReferencedAt: "2026-03-20T10:00:00.000Z",
    },
    {
      id: "raw-screening-table",
      path: "data/raw/screening-table.csv",
      kind: "dataset",
      hash: "sha256:data-raw-017",
      createdAt: "2026-01-12T10:00:00.000Z",
      lastReferencedAt: "2026-01-13T10:00:00.000Z",
    },
    {
      id: "notebook-run-packet",
      path: "notebooks/run-2026-05-01/replay-packet.json",
      kind: "reproducibility-packet",
      hash: "sha256:packet-022",
      createdAt: "2026-05-01T10:00:00.000Z",
      lastReferencedAt: "2026-05-01T10:00:00.000Z",
    },
    {
      id: "orphan-scratch-plot",
      path: "results/tmp/orphan-scratch-plot.png",
      kind: "scratch",
      hash: "sha256:tmp-003",
      createdAt: "2026-02-01T10:00:00.000Z",
      lastReferencedAt: "2026-02-01T10:00:00.000Z",
    },
    {
      id: "protocol-appendix",
      path: "protocols/appendix-a.md",
      kind: "protocol",
      hash: "sha256:protocol-009",
      createdAt: "2026-02-10T10:00:00.000Z",
      lastReferencedAt: "2026-02-10T10:00:00.000Z",
      retentionHold: "IRB audit window closes 2026-12-31",
    },
  ],
  references: [
    {
      source: "manuscript/citations.json#figure-2",
      sourceType: "citation",
      severity: "blocker",
      artifacts: [{ id: "fig-survival-curve", hash: "sha256:fig-001" }],
    },
    {
      source: "metadata.json#doi:10.5555/scibase.demo.v1",
      sourceType: "doi",
      severity: "blocker",
      artifacts: [{ id: "fig-survival-curve", hash: "sha256:fig-001" }],
    },
    {
      source: "exports/release-v1/manifest.json",
      sourceType: "export",
      severity: "blocker",
      artifacts: [{ id: "raw-screening-table", hash: "sha256:data-raw-017" }],
    },
    {
      source: "results/reproducibility/run-2026-05-01.json",
      sourceType: "reproducibility",
      severity: "blocker",
      artifacts: [{ id: "notebook-run-packet", hash: "sha256:packet-022" }],
    },
  ],
  pruneCandidates: [
    "fig-survival-curve",
    "raw-screening-table",
    "notebook-run-packet",
    "orphan-scratch-plot",
    "protocol-appendix",
  ],
};

module.exports = {
  sampleRepository,
};
