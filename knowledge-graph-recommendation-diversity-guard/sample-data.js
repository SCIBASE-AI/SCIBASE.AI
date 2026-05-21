const biasedRecommendationSet = {
  policy: {
    minRecommendations: 5,
    staleEvidenceBeforeYear: 2023,
  },
  recommendationSet: {
    id: 'kg-rec-astro-bio-2026-05',
    title: 'Discovery mode recommendations for CRISPR stress-screen projects',
    audience: 'computational biology researchers',
    recommendations: [
      {
        id: 'rec-1',
        title: 'Stanford CRISPR stress atlas',
        domain: 'single-cell biology',
        institution: 'Stanford',
        funder: 'Funder A',
        method: 'CRISPR screen',
        evidenceYear: 2021,
        citations: 920,
        rationaleEdges: ['concept:CRISPR -> dataset:stress-atlas'],
      },
      {
        id: 'rec-2',
        title: 'Stanford perturbation notebook',
        domain: 'single-cell biology',
        institution: 'Stanford',
        funder: 'Funder A',
        method: 'CRISPR screen',
        evidenceYear: 2020,
        citations: 510,
        rationaleEdges: ['tool:scanpy -> notebook:perturbation'],
      },
      {
        id: 'rec-3',
        title: 'Stanford follow-up protocol',
        domain: 'single-cell biology',
        institution: 'Stanford',
        funder: 'Funder A',
        method: 'CRISPR screen',
        evidenceYear: 2019,
        citations: 315,
        rationaleEdges: ['protocol:stimulation -> paper:stress-atlas'],
      },
      {
        id: 'rec-4',
        title: 'Cambridge replication dataset',
        domain: 'single-cell biology',
        institution: 'Cambridge',
        funder: 'Funder B',
        method: 'CRISPR screen',
        evidenceYear: 2024,
        citations: 83,
        rationaleEdges: ['dataset:replication -> paper:stress-atlas', 'method:qc -> result:null'],
      },
      {
        id: 'rec-5',
        title: 'Tokyo microscopy validation',
        domain: 'cell imaging',
        institution: 'Tokyo BioLab',
        funder: 'Funder C',
        method: 'confocal imaging',
        evidenceYear: 2025,
        citations: 31,
        rationaleEdges: ['concept:stress -> image:validation', 'image:validation -> dataset:phenotype'],
      },
    ],
  },
};

function buildBalancedRecommendationSet() {
  const clone = JSON.parse(JSON.stringify(biasedRecommendationSet));
  const recs = clone.recommendationSet.recommendations;
  recs[0].rationaleEdges.push('paper:stress-atlas -> limitation:sample-size');
  recs[0].evidenceYear = 2024;
  recs[0].citations = 300;
  recs[1].institution = 'Max Planck';
  recs[1].funder = 'Funder D';
  recs[1].method = 'single-cell RNA-seq';
  recs[1].domain = 'transcriptomics';
  recs[1].evidenceYear = 2025;
  recs[1].citations = 180;
  recs[1].rationaleEdges.push('dataset:orthogonal -> concept:stress');
  recs[2].institution = 'Toronto Genomics';
  recs[2].funder = 'Funder E';
  recs[2].method = 'proteomics';
  recs[2].domain = 'systems biology';
  recs[2].evidenceYear = 2024;
  recs[2].citations = 160;
  recs[2].rationaleEdges.push('dataset:proteomics -> concept:stress');
  return clone;
}

module.exports = {
  biasedRecommendationSet,
  buildBalancedRecommendationSet,
};
