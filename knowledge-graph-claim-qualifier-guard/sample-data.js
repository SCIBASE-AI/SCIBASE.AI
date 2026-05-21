const riskyPacket = {
  graphId: "pubmed-crispr-neuro-graph",
  generatedAt: "2026-05-21T09:50:00.000Z",
  edges: [
    {
      id: "edge-overclaim-001",
      subject: "CRISPR inhibition protocol",
      predicate: "causes",
      object: "improved neuronal repair",
      qualifier: "positive",
      evidenceType: "observational_cooccurrence",
      evidenceSentence:
        "The protocol was associated with improved neuronal repair markers in a small retrospective dataset.",
      recommendationText: "Use this to prove CRISPR inhibition causes neuronal repair.",
      context: {
        species: "mouse",
        dataset: "dataset:neuro-12"
      }
    },
    {
      id: "edge-negative-002",
      subject: "Method X",
      predicate: "increases",
      object: "reproducibility score",
      qualifier: "positive",
      evidenceType: "replication_failure",
      evidenceSentence:
        "Independent labs reported no significant improvement and failed to reproduce the original score increase.",
      recommendationText: "Researchers in your field are citing Method X.",
      context: {
        species: "human cohort",
        assay: "meta-analysis",
        dataset: "dataset:replication-7"
      }
    },
    {
      id: "edge-ready-003",
      subject: "Assay calibration protocol",
      predicate: "improves",
      object: "measurement consistency",
      qualifier: "context_limited_positive",
      evidenceType: "controlled_experiment",
      evidenceSentence:
        "A controlled experiment showed improved measurement consistency in Table 2 under the stated calibration protocol.",
      recommendationText: "Consider this protocol for related calibration experiments.",
      context: {
        species: "cell line",
        assay: "fluorescence calibration",
        dataset: "dataset:calibration-4"
      }
    }
  ]
};

const cleanPacket = {
  graphId: "clean-kg-release",
  generatedAt: "2026-05-21T09:55:00.000Z",
  edges: [
    {
      id: "edge-clean-001",
      subject: "Assay calibration protocol",
      predicate: "improves",
      object: "measurement consistency",
      qualifier: "context_limited_positive",
      evidenceType: "controlled_experiment",
      evidenceSentence:
        "A controlled experiment showed improved measurement consistency under matched instrument settings.",
      recommendationText: "Consider this protocol where the same assay and dataset conditions apply.",
      context: {
        species: "cell line",
        assay: "fluorescence calibration",
        dataset: "dataset:calibration-4"
      }
    }
  ]
};

module.exports = { riskyPacket, cleanPacket };
