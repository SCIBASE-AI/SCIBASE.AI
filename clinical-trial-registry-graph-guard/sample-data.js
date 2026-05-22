'use strict';

module.exports = {
  trials: [
    {
      id: 'trial-alpha',
      registry: 'clinicaltrials_gov',
      registryId: 'NCT-01234567',
      title: 'Adaptive immunotherapy biomarker study',
      status: 'completed',
      phase: 'phase_2',
      condition: 'solid tumor',
      primaryCompletionDate: '2024-03-10',
      resultsPostedDate: null,
      registryUpdatedAt: '2025-06-01',
      primaryEndpoints: ['progression free survival', 'grade 3 adverse events'],
      linkedArtifacts: [
        { relation: 'reports_outcome', id: 'pub-alpha' },
        { relation: 'shares_dataset', id: 'data-alpha' }
      ],
      recommendations: [
        { id: 'rec-alpha', label: 'surface similar immunotherapy trials' }
      ]
    },
    {
      id: 'trial-beta',
      registry: 'euctr',
      registryId: 'EUCTR2023-001234-12',
      title: 'Remote monitoring protocol pilot',
      status: 'active_not_recruiting',
      phase: 'phase_3',
      condition: 'heart failure',
      primaryCompletionDate: '2026-01-15',
      resultsPostedDate: null,
      registryUpdatedAt: '2024-01-02',
      primaryEndpoints: ['hospitalization rate'],
      linkedArtifacts: [
        { relation: 'reports_outcome', id: 'pub-beta' },
        { relation: 'shares_dataset', id: 'data-beta' }
      ]
    },
    {
      id: 'trial-gamma',
      registry: 'isrctn',
      registryId: 'ISRCTN 12345678',
      title: 'Withdrawn behavioral intervention study',
      status: 'withdrawn',
      phase: 'phase_1',
      condition: 'sleep disorder',
      primaryCompletionDate: '2025-02-20',
      resultsPostedDate: null,
      registryUpdatedAt: '2026-04-01',
      primaryEndpoints: ['sleep efficiency'],
      recommendations: [
        { id: 'rec-gamma', label: 'recommend as active comparator' }
      ]
    },
    {
      id: 'trial-delta',
      registry: 'clinicaltrials_gov',
      registryId: 'NCT76543210',
      title: 'Prospective open access diagnostics cohort',
      status: 'recruiting',
      phase: 'phase_2',
      condition: 'rare disease',
      primaryCompletionDate: '2027-04-20',
      resultsPostedDate: null,
      registryUpdatedAt: '2026-05-01',
      primaryEndpoints: ['diagnostic sensitivity'],
      linkedArtifacts: [
        { relation: 'uses_protocol', id: 'protocol-delta' },
        { relation: 'shares_dataset', id: 'data-delta' }
      ]
    }
  ],
  publications: [
    {
      id: 'pub-alpha',
      title: 'Exploratory survival update for adaptive immunotherapy',
      trialRegistryIds: ['NCT01234567'],
      reportedEndpoints: ['overall survival'],
      publishedAt: '2026-03-15'
    },
    {
      id: 'pub-beta',
      title: 'Remote monitoring feasibility analysis',
      trialRegistryIds: ['2023-001234-12'],
      reportedEndpoints: ['hospitalization rate'],
      publishedAt: '2026-04-02'
    }
  ],
  datasets: [
    {
      id: 'data-alpha',
      trialRegistryId: 'NCT01234567',
      accession: 'SYN-IMMUNO-440',
      accessStatus: 'controlled'
    },
    {
      id: 'data-beta',
      trialRegistryId: '2023-001234-12',
      accession: '',
      accessStatus: 'unknown'
    },
    {
      id: 'data-delta',
      trialRegistryId: 'NCT76543210',
      accession: 'SYN-RARE-221',
      accessStatus: 'open'
    }
  ],
  protocols: [
    {
      id: 'protocol-delta',
      trialRegistryId: 'NCT76543210',
      version: 'v2.1',
      approvedAt: '2026-02-15'
    }
  ],
  edges: [
    {
      sourceRegistryId: 'NCT01234567',
      targetId: 'pub-alpha',
      relation: 'reports_outcome',
      evidenceDate: '2026-03-15'
    },
    {
      sourceRegistryId: 'NCT01234567',
      targetId: 'data-alpha',
      relation: 'shares_dataset',
      evidenceDate: '2026-03-18'
    },
    {
      sourceRegistryId: 'ISRCTN12345678',
      targetId: 'rec-gamma',
      relation: 'recommends_followup',
      evidenceDate: '2026-05-10'
    },
    {
      sourceRegistryId: 'NCT76543210',
      targetId: 'protocol-delta',
      relation: 'uses_protocol',
      evidenceDate: '2026-04-20'
    }
  ]
};
