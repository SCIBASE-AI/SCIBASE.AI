const citationBatch = {
  id: "citation-fit-2026-05-29",
  generatedAt: "2026-05-29T13:42:00.000Z",
  recommendations: [
    {
      id: "rec-1",
      highlightedText: "Transformer encoders can improve protein contact prediction from sequence-only inputs.",
      intent: "method-support",
      candidate: {
        title: "Attention-based protein contact prediction from amino acid sequences",
        doi: "10.5555/protein.001",
        year: 2024,
        venue: "Bioinformatics",
        domains: ["protein", "transformer", "contact prediction"],
        claims: ["transformer encoders improve sequence-only contact prediction"],
        contradictions: []
      }
    },
    {
      id: "rec-2",
      highlightedText: "Small pilot studies prove the intervention eliminates cognitive fatigue.",
      intent: "strong-claim-support",
      candidate: {
        title: "Pilot stimulation study reports mixed fatigue outcomes",
        doi: "10.5555/fatigue.002",
        year: 2021,
        venue: "Neuro Pilot Reports",
        domains: ["stimulation", "fatigue", "pilot"],
        claims: ["fatigue improved for some participants"],
        contradictions: ["does not eliminate fatigue", "underpowered pilot"]
      }
    },
    {
      id: "rec-3",
      highlightedText: "The manuscript uses a standard Benjamini-Hochberg false discovery correction.",
      intent: "method-definition",
      candidate: {
        title: "Controlling the false discovery rate",
        doi: "10.2307/2346101",
        year: 1995,
        venue: "Journal of the Royal Statistical Society",
        domains: ["statistics", "false discovery rate", "multiple testing"],
        claims: ["Benjamini-Hochberg controls false discovery rate"],
        contradictions: []
      }
    },
    {
      id: "rec-4",
      highlightedText: "CRISPR base editors reduce off-target edits in hematopoietic cells.",
      intent: "domain-support",
      candidate: {
        title: "Base editing specificity in plant chloroplasts",
        doi: null,
        year: 2018,
        venue: "Plant Methods",
        domains: ["plants", "chloroplast", "base editing"],
        claims: ["base editing specificity varies by guide"],
        contradictions: []
      }
    }
  ]
};

module.exports = { citationBatch };
