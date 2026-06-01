const samplePacket = {
  generatedAt: "2026-06-01T15:45:00.000Z",
  protocols: [
    {
      id: "protocol:crispr-neuro-042",
      version: "2.1.0",
      title: "CRISPR neuron organoid perturbation assay",
      calibrationValidUntil: "2026-05-25",
      allowedReagentLots: ["CAS9-A17", "GUIDE-44B", "MATRIX-9"],
      requiredSteps: [
        {
          id: "step:cell-line-auth",
          label: "Cell-line identity authentication",
          required: true
        },
        {
          id: "step:guide-rna-qc",
          label: "Guide RNA QC",
          required: true,
          parameters: {
            minOnTargetScore: { expected: 82, tolerance: 3 }
          }
        },
        {
          id: "step:incubation",
          label: "Post-edit incubation",
          required: true,
          parameters: {
            hours: { expected: 48, tolerance: 4 },
            temperatureC: { expected: 37, tolerance: 0.5 }
          }
        },
        {
          id: "step:sequencing-qc",
          label: "Amplicon sequencing QC",
          required: true,
          parameters: {
            minReadDepth: { expected: 12000, tolerance: 500 }
          }
        }
      ]
    }
  ],
  experiments: [
    {
      id: "experiment:organoid-run-2026-05-18",
      protocolId: "protocol:crispr-neuro-042",
      protocolVersion: "2.1.0",
      performedAt: "2026-05-18",
      datasetDoi: "10.5555/scibase.neuro.2026.18",
      instrumentId: "sequencer:mini-ion-17",
      reagentLots: ["CAS9-A17", "GUIDE-44B", "MATRIX-9"],
      steps: [
        { id: "step:cell-line-auth", observed: {} },
        { id: "step:guide-rna-qc", observed: { minOnTargetScore: 84 } },
        { id: "step:incubation", observed: { hours: 47, temperatureC: 37.2 } },
        { id: "step:sequencing-qc", observed: { minReadDepth: 12380 } }
      ],
      proposedEdges: [
        {
          from: "dataset:10.5555/scibase.neuro.2026.18",
          to: "protocol:crispr-neuro-042",
          type: "followed-protocol"
        },
        {
          from: "experiment:organoid-run-2026-05-18",
          to: "concept:neural-crispr-screen",
          type: "supports-concept"
        }
      ]
    },
    {
      id: "experiment:organoid-run-2026-05-29",
      protocolId: "protocol:crispr-neuro-042",
      protocolVersion: "2.0.0",
      performedAt: "2026-05-29",
      datasetDoi: "10.5555/scibase.neuro.2026.29",
      instrumentId: "sequencer:mini-ion-17",
      reagentLots: ["CAS9-Z99", "GUIDE-44B"],
      steps: [
        { id: "step:cell-line-auth", observed: {} },
        { id: "step:guide-rna-qc", observed: { minOnTargetScore: 71 } },
        { id: "step:incubation", observed: { hours: 61, temperatureC: 39.1 } }
      ],
      proposedEdges: [
        {
          from: "dataset:10.5555/scibase.neuro.2026.29",
          to: "protocol:crispr-neuro-042",
          type: "followed-protocol"
        },
        {
          from: "experiment:organoid-run-2026-05-29",
          to: "concept:neural-crispr-screen",
          type: "supports-concept"
        },
        {
          from: "experiment:organoid-run-2026-05-29",
          to: "recommendation:reuse-in-neurodegeneration-review",
          type: "eligible-for-recommendation"
        }
      ]
    }
  ]
};

module.exports = { samplePacket };
