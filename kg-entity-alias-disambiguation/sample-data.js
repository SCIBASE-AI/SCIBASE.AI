const graphBatch = {
  id: "kg-batch-2026-05-29",
  generatedAt: "2026-05-29T12:42:00.000Z",
  candidates: [
    {
      mention: "APC",
      source: "paper-neuro-17",
      doi: "10.5555/neuro.17",
      context: "adenomatous polyposis coli variant alters WNT pathway signaling in organoids",
      candidates: [
        { id: "NCBIGene:324", label: "APC gene", ontology: "NCBI Gene", score: 0.91 },
        { id: "MeSH:D000073878", label: "Antigen-presenting cells", ontology: "MeSH", score: 0.74 }
      ],
      proposedEdges: ["paper-neuro-17 -> NCBIGene:324"]
    },
    {
      mention: "ALS",
      source: "paper-neuro-18",
      doi: "10.5555/neuro.18",
      context: "amyotrophic lateral sclerosis cohort showed motor neuron degeneration and SOD1 enrichment",
      candidates: [
        { id: "MeSH:D000690", label: "Amyotrophic Lateral Sclerosis", ontology: "MeSH", score: 0.89 },
        { id: "CHEBI:456216", label: "Acetolactate synthase", ontology: "ChEBI", score: 0.64 }
      ],
      proposedEdges: ["paper-neuro-18 -> MeSH:D000690"]
    },
    {
      mention: "Java",
      source: "software-methods-02",
      doi: "10.5555/software.02",
      context: "analysis scripts were implemented in Java and released with a Maven build file",
      candidates: [
        { id: "Wikidata:Q251", label: "Java programming language", ontology: "Wikidata", score: 0.83 },
        { id: "GeoNames:1643084", label: "Java island", ontology: "GeoNames", score: 0.82 }
      ],
      proposedEdges: ["software-methods-02 -> Wikidata:Q251"]
    },
    {
      mention: "Mercury",
      source: "materials-09",
      doi: "10.5555/materials.09",
      context: "mercury concentration was measured in river sediment using cold vapor atomic absorption",
      candidates: [
        { id: "PubChem:23931", label: "Mercury element", ontology: "PubChem", score: 0.88 },
        { id: "MeSH:D008628", label: "Mercury compounds", ontology: "MeSH", score: 0.85 }
      ],
      proposedEdges: ["materials-09 -> PubChem:23931", "materials-09 -> MeSH:D008628"]
    }
  ]
};

module.exports = { graphBatch };
