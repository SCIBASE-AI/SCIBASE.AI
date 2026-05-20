"use strict";

module.exports = {
  concepts: [
    {
      id: "concept:crispr-neuroinflammation",
      title: "CRISPR neuroinflammation screen",
      ontology: "MeSH:D000077592"
    },
    {
      id: "concept:organoid-dose-response",
      title: "Organoid dose response",
      ontology: "schema:MedicalStudy"
    },
    {
      id: "concept:graphene-biosensor",
      title: "Graphene biosensor sensitivity",
      ontology: "PubChem:graphene"
    }
  ],
  methods: [
    {
      id: "method:single-cell-rna",
      title: "Single-cell RNA sequencing"
    },
    {
      id: "method:live-cell-imaging",
      title: "Live-cell imaging"
    },
    {
      id: "method:impedance-sweep",
      title: "Electrochemical impedance sweep"
    }
  ],
  papers: [
    {
      id: "paper:alpha-2025",
      title: "Alpha pathway suppresses inflammatory marker release",
      doi: "10.0000/scibase.alpha.2025"
    },
    {
      id: "paper:beta-2025",
      title: "Beta compound improves organoid viability at low dose",
      doi: "10.0000/scibase.beta.2025"
    }
  ],
  datasets: [
    {
      id: "dataset:alpha-counts-v1",
      title: "Alpha screen raw counts v1",
      license: "CC-BY-4.0",
      checksum: "sha256:4fe1-alpha"
    },
    {
      id: "dataset:beta-organoid-v2",
      title: "Beta organoid dose response v2",
      license: "CC-BY-NC-4.0",
      checksum: "sha256:89af-beta"
    },
    {
      id: "dataset:graphene-sensor-v1",
      title: "Graphene impedance sensor sweep",
      license: "CC0-1.0",
      checksum: "sha256:77be-graphene"
    }
  ],
  protocols: [
    {
      id: "protocol:alpha-crispr-v3",
      title: "Alpha CRISPR screen protocol v3",
      version: "3.0.1"
    },
    {
      id: "protocol:beta-organoid-v4",
      title: "Beta organoid protocol v4",
      version: "4.2.0"
    },
    {
      id: "protocol:graphene-sensor-v2",
      title: "Graphene sensor protocol v2",
      version: "2.0.0"
    }
  ],
  claims: [
    {
      id: "claim:alpha-inflammatory-drop",
      title: "Alpha pathway editing lowers IL-6 release in microglia",
      domain: "neuroscience",
      paperId: "paper:alpha-2025",
      conceptIds: ["concept:crispr-neuroinflammation"],
      methodIds: ["method:single-cell-rna"],
      datasetIds: ["dataset:alpha-counts-v1"],
      citations: 162,
      reproducibilityScore: 0.76,
      publicationConfidence: 0.81,
      tags: ["crispr", "microglia", "inflammation"]
    },
    {
      id: "claim:beta-organoid-rescue",
      title: "Beta compound rescues organoid viability at low dose",
      domain: "organoid-pharmacology",
      paperId: "paper:beta-2025",
      conceptIds: ["concept:organoid-dose-response"],
      methodIds: ["method:live-cell-imaging"],
      datasetIds: ["dataset:beta-organoid-v2"],
      citations: 47,
      reproducibilityScore: 0.54,
      publicationConfidence: 0.61,
      tags: ["organoid", "dose-response"]
    },
    {
      id: "claim:graphene-ultra-sensitive",
      title: "Graphene biosensor detects femtomolar protein concentrations",
      domain: "materials-biosensing",
      conceptIds: ["concept:graphene-biosensor"],
      methodIds: ["method:impedance-sweep"],
      datasetIds: ["dataset:graphene-sensor-v1"],
      citations: 91,
      reproducibilityScore: 0.69,
      publicationConfidence: 0.75,
      tags: ["graphene", "biosensor"]
    }
  ],
  replicationReports: [
    {
      id: "rep:alpha-lab-b-positive",
      title: "Independent alpha screen reproduces IL-6 effect",
      claimId: "claim:alpha-inflammatory-drop",
      outcome: "replicated",
      lab: "Lab B",
      reportedAt: "2026-04-18",
      confidence: 0.82,
      methodMatch: 0.92,
      sampleOverlap: 0.77,
      protocolAvailable: true,
      independentLab: true,
      preregistered: true,
      datasetId: "dataset:alpha-counts-v1",
      protocolId: "protocol:alpha-crispr-v3",
      methodId: "method:single-cell-rna"
    },
    {
      id: "rep:beta-null-dose",
      title: "Low-dose beta rescue not observed in blinded run",
      claimId: "claim:beta-organoid-rescue",
      outcome: "negative_result",
      lab: "Organoid Core West",
      reportedAt: "2026-04-21",
      confidence: 0.79,
      methodMatch: 0.84,
      sampleOverlap: 0.73,
      protocolAvailable: true,
      independentLab: true,
      preregistered: true,
      datasetId: "dataset:beta-organoid-v2",
      protocolId: "protocol:beta-organoid-v4",
      methodId: "method:live-cell-imaging"
    },
    {
      id: "rep:beta-failed-media",
      title: "Beta compound failed replication under matched media",
      claimId: "claim:beta-organoid-rescue",
      outcome: "failed_replication",
      lab: "Consortium Lab 4",
      reportedAt: "2026-05-02",
      confidence: 0.86,
      methodMatch: 0.91,
      sampleOverlap: 0.81,
      protocolAvailable: true,
      independentLab: true,
      preregistered: false,
      datasetId: "dataset:beta-organoid-v2",
      protocolId: "protocol:beta-organoid-v4",
      methodId: "method:live-cell-imaging"
    },
    {
      id: "rep:graphene-inconclusive",
      title: "Graphene sensor replication inconclusive after humidity drift",
      claimId: "claim:graphene-ultra-sensitive",
      outcome: "inconclusive",
      lab: "Materials Lab North",
      reportedAt: "2026-05-05",
      confidence: 0.58,
      methodMatch: 0.66,
      sampleOverlap: 0.69,
      protocolAvailable: false,
      independentLab: true,
      preregistered: false,
      datasetId: "dataset:graphene-sensor-v1",
      protocolId: "protocol:graphene-sensor-v2",
      methodId: "method:impedance-sweep"
    }
  ]
};
