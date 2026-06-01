"use strict";

const cleanPacket = {
  graph: {
    id: "kg-sample-custody-clean",
    releaseTarget: "entity-pages-and-recommendations"
  },
  policy: {
    maxCollectionToPreservationHours: 6,
    temperatureRangeC: { min: -90, max: -60 },
    maxTemperatureExcursions: 0,
    maxFreezeThawCycles: 2,
    minIntegrityScore: 0.82,
    requiredGraphEdges: ["sample-to-protocol", "sample-to-dataset", "sample-to-assay"]
  },
  samples: [
    {
      id: "SAMPLE-ALPHA",
      collection: {
        collectedAt: "2026-05-18T10:00:00.000Z",
        siteId: "FIELD-A",
        protocolId: "PROTO-CRYO-1"
      },
      preservation: {
        protocolId: "PRESERVE-LN2",
        preservedAt: "2026-05-18T12:00:00.000Z"
      },
      custodyEvents: [
        { at: "2026-05-18T10:05:00.000Z", from: "collector-a", to: "field-freezer", signature: "sig-a1" },
        { at: "2026-05-18T13:00:00.000Z", from: "field-freezer", to: "biobank-1", signature: "sig-a2" },
        { at: "2026-05-19T08:00:00.000Z", from: "biobank-1", to: "assay-lab", signature: "sig-a3" }
      ],
      temperatureLog: [
        { at: "2026-05-18T12:00:00.000Z", celsius: -78 },
        { at: "2026-05-18T18:00:00.000Z", celsius: -75 },
        { at: "2026-05-19T06:00:00.000Z", celsius: -77 }
      ],
      quality: {
        freezeThawCycles: 1,
        integrityScore: 0.94
      },
      graphEdges: [
        { type: "sample-to-protocol", target: "PROTO-CRYO-1" },
        { type: "sample-to-dataset", target: "DATASET-77" },
        { type: "sample-to-assay", target: "ASSAY-RNA-2" }
      ]
    }
  ]
};

const riskyPacket = {
  graph: {
    id: "kg-sample-custody-risky",
    releaseTarget: "entity-pages-and-recommendations"
  },
  policy: cleanPacket.policy,
  samples: [
    {
      id: "SAMPLE-BETA",
      collection: {
        collectedAt: "2026-05-18T10:00:00.000Z",
        siteId: "FIELD-B",
        protocolId: "PROTO-CRYO-1"
      },
      preservation: {
        protocolId: "PRESERVE-LN2",
        preservedAt: "2026-05-18T19:30:00.000Z"
      },
      custodyEvents: [
        { at: "2026-05-18T10:10:00.000Z", from: "collector-b", to: "field-freezer", signature: "sig-b1" },
        { at: "2026-05-18T16:00:00.000Z", from: "unknown-courier", to: "biobank-1", signature: "" }
      ],
      temperatureLog: [
        { at: "2026-05-18T12:00:00.000Z", celsius: -76 },
        { at: "2026-05-18T15:30:00.000Z", celsius: -42 }
      ],
      quality: {
        freezeThawCycles: 4,
        integrityScore: 0.69
      },
      graphEdges: [
        { type: "sample-to-protocol", target: "PROTO-CRYO-1" },
        { type: "sample-to-dataset", target: "DATASET-88" }
      ]
    },
    {
      id: "SAMPLE-GAMMA",
      collection: {
        collectedAt: "2026-05-19T10:00:00.000Z",
        siteId: "FIELD-C",
        protocolId: "PROTO-CRYO-1"
      },
      preservation: {},
      custodyEvents: [],
      temperatureLog: [],
      quality: {
        freezeThawCycles: 0,
        integrityScore: 0.91
      },
      graphEdges: [{ type: "sample-to-protocol", target: "PROTO-CRYO-1" }]
    }
  ]
};

module.exports = {
  cleanPacket,
  riskyPacket
};
