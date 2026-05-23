const samplePacket = {
  graphId: 'kg-biological-accession-demo',
  generatedAt: '2026-05-23T07:00:00Z',
  nodes: [
    {
      id: 'node-gene-tp53',
      namespace: 'NCBIGene',
      accession: '7157',
      canonicalTarget: 'NCBIGene:7157',
      taxon: '9606',
      expectedTaxon: '9606',
      evidenceDois: ['10.1016/j.cell.2026.01.001'],
      crosswalkConfidence: 0.98,
    },
    {
      id: 'node-gene-p53-alias',
      namespace: 'NCBIGene',
      accession: 'TP53',
      canonicalTarget: 'NCBIGene:7157',
      taxon: '9606',
      expectedTaxon: '9606',
      deprecatedAlias: true,
      evidenceDois: ['10.1016/j.cell.2026.01.001'],
      crosswalkConfidence: 0.72,
      usedInRecommendation: true,
    },
    {
      id: 'node-protein-old',
      namespace: 'UniProtKB',
      accession: 'Q9Y261',
      canonicalTarget: 'UniProtKB:Q9Y261',
      taxon: '10090',
      expectedTaxon: '9606',
      deprecatedAlias: true,
      evidenceDois: [],
      crosswalkConfidence: 0.61,
    },
    {
      id: 'node-compound-aspirin',
      namespace: 'PubChem',
      accession: '2244',
      canonicalTarget: 'PubChem:2244',
      evidenceDois: ['10.1038/s41586-026-0001-2'],
      crosswalkConfidence: 0.97,
    },
    {
      id: 'node-mesh-breast-neoplasms',
      namespace: 'MeSH',
      accession: 'D001943',
      canonicalTarget: 'MeSH:D001943',
      evidenceDois: ['10.1126/science.2026.0007'],
      crosswalkConfidence: 0.95,
    },
  ],
};

module.exports = {
  samplePacket,
};
