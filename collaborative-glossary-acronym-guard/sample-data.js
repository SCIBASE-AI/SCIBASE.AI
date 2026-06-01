"use strict";

const cleanPacket = {
  document: {
    id: "doc-collab-glossary-clean",
    title: "Collaborative manuscript terminology export",
    versionHash: "doc-v7-clean"
  },
  sections: [
    {
      id: "intro",
      title: "Introduction",
      versionHash: "intro-v3",
      locked: false,
      body:
        "Clustered Regularly Interspaced Short Palindromic Repeats (CRISPR) screens require a shared terminology layer before collaborator export."
    },
    {
      id: "methods",
      title: "Methods",
      versionHash: "methods-v5",
      locked: true,
      body:
        "Signal-to-noise ratio (SNR), batch effect, and unique molecular identifier usage are defined before review."
    }
  ],
  glossaryEntries: [
    {
      id: "term-crispr",
      term: "CRISPR",
      acronym: "CRISPR",
      expansion: "Clustered Regularly Interspaced Short Palindromic Repeats",
      definition: "Genome-editing screen technology used to perturb target genes in pooled experiments.",
      discipline: "genomics",
      firstUseSectionId: "intro",
      sectionVersionHash: "intro-v3",
      status: "approved",
      exportable: true,
      exportNote: "Public glossary definition."
    },
    {
      id: "term-snr",
      term: "SNR",
      acronym: "SNR",
      expansion: "Signal-to-noise ratio",
      definition: "Quantitative ratio comparing measured signal strength against background measurement noise.",
      discipline: "imaging",
      firstUseSectionId: "methods",
      sectionVersionHash: "methods-v5",
      status: "approved",
      exportable: true
    },
    {
      id: "term-batch-effect",
      term: "batch effect",
      definition: "Systematic measurement variation introduced by processing samples in different experimental batches.",
      discipline: "statistics",
      firstUseSectionId: "methods",
      sectionVersionHash: "methods-v5",
      status: "approved",
      exportable: true
    }
  ],
  proposedEdits: [
    {
      id: "edit-approved-batch-definition",
      termId: "term-batch-effect",
      sectionId: "methods",
      sectionVersionHash: "methods-v5",
      approvedBy: ["lead-author", "stats-reviewer"]
    }
  ],
  comments: [],
  export: {
    format: "journal-manuscript",
    includeGlossaryIds: ["term-crispr", "term-snr", "term-batch-effect"],
    includePrivateNotes: false
  }
};

const riskyPacket = {
  document: {
    id: "doc-collab-glossary-risky",
    title: "Shared editor glossary draft",
    versionHash: "doc-v11-risky"
  },
  sections: [
    {
      id: "intro",
      title: "Introduction",
      versionHash: "intro-v9",
      locked: false,
      body:
        "CRISPR screens and batch effect corrections were discussed in the shared editor before terminology approval."
    },
    {
      id: "methods",
      title: "Methods",
      versionHash: "methods-v8",
      locked: true,
      body:
        "SNR was computed for microscopy while SNR was also used by another collaborator to mean single nucleus RNA."
    }
  ],
  glossaryEntries: [
    {
      id: "term-crispr",
      term: "CRISPR",
      acronym: "CRISPR",
      expansion: "Clustered Regularly Interspaced Short Palindromic Repeats",
      definition: "Genome editing screen technology used by the manuscript collaborators.",
      discipline: "genomics",
      firstUseSectionId: "intro",
      sectionVersionHash: "intro-v7",
      status: "approved",
      exportable: true
    },
    {
      id: "term-snr-imaging",
      term: "SNR",
      acronym: "SNR",
      expansion: "Signal-to-noise ratio",
      definition: "Image metric.",
      discipline: "imaging",
      firstUseSectionId: "methods",
      sectionVersionHash: "methods-v8",
      status: "approved",
      exportable: true,
      privateNote: "Reviewer-only note from anonymous reviewer A: do not export."
    },
    {
      id: "term-snr-rna",
      term: "SNR",
      acronym: "SNR",
      expansion: "Single nucleus RNA",
      definition: "Sequencing context acronym for single nucleus RNA analysis in draft notes.",
      discipline: "transcriptomics",
      firstUseSectionId: "methods",
      sectionVersionHash: "methods-v8",
      status: "draft",
      exportable: true
    },
    {
      id: "term-batch-effect",
      term: "batch effect",
      definition: "Batch bias.",
      discipline: "statistics",
      firstUseSectionId: "intro",
      sectionVersionHash: "intro-v9",
      status: "approved",
      exportable: true,
      exportNote: "Public note accidentally includes /Users/reviewer/private terminology draft."
    }
  ],
  proposedEdits: [
    {
      id: "edit-locked-snr",
      termId: "term-snr-imaging",
      sectionId: "methods",
      sectionVersionHash: "methods-v7",
      approvedBy: []
    }
  ],
  comments: [
    {
      id: "comment-term-batch-effect",
      termId: "term-batch-effect",
      resolved: false,
      blocksExport: true,
      body: "Statistics reviewer asked for a clearer discipline-specific definition."
    }
  ],
  export: {
    format: "journal-manuscript",
    includeGlossaryIds: ["term-crispr", "term-snr-imaging"],
    includePrivateNotes: true
  }
};

module.exports = {
  cleanPacket,
  riskyPacket
};
