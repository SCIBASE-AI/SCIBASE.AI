'use strict';

const manuscript = {
  id: 'assistant-manuscript-alpha',
  title: 'Graph-Aware Protein Variant Prioritization',
  claims: [
    {
      id: 'claim-graph-boost',
      text: 'Knowledge-graph features improve variant prioritization accuracy in rare disease cohorts.',
      evidenceIds: ['ev-kg-2024', 'ev-cohort-2025'],
      lastReviewedAt: '2026-05-01T00:00:00.000Z',
    },
    {
      id: 'claim-small-lab',
      text: 'The method remains reproducible in small wet-lab validation cohorts.',
      evidenceIds: ['ev-lab-2025'],
      lastReviewedAt: '2026-04-15T00:00:00.000Z',
    },
    {
      id: 'claim-benchmark',
      text: 'The benchmark split prevents train/test leakage across protein families.',
      evidenceIds: ['ev-benchmark-2024'],
      lastReviewedAt: '2025-10-01T00:00:00.000Z',
    },
  ],
};

const literatureEvents = [
  {
    id: 'lit-001',
    type: 'new_paper',
    title: 'Variant Graph Features Improve Rare Disease Triage',
    topic: 'knowledge graph variant prioritization',
    relationship: 'supports',
    relatedClaimIds: ['claim-graph-boost'],
    evidenceStrength: 0.88,
    publishedAt: '2026-05-14T00:00:00.000Z',
    reproducibilityArtifacts: {
      available: true,
      artifactIds: ['repo:variant-graph-2026'],
    },
    suggestedNextStep: 'Add as a supporting citation and compare cohort overlap.',
  },
  {
    id: 'lit-002',
    type: 'replication',
    title: 'Small-Cohort Validation Fails To Replicate Reported Lift',
    topic: 'rare disease validation cohorts',
    relationship: 'refutes',
    relatedClaimIds: ['claim-small-lab'],
    evidenceStrength: 0.81,
    publishedAt: '2026-05-16T00:00:00.000Z',
    reproducibilityArtifacts: {
      available: true,
      artifactIds: ['notebook:small-cohort-replication'],
    },
    suggestedNextStep: 'Revise small-lab generalization language and add limitation.',
  },
  {
    id: 'lit-003',
    type: 'correction',
    title: 'Correction: Protein Family Benchmark Split Metadata',
    topic: 'benchmark split provenance',
    relationship: 'corrects',
    affectedEvidenceIds: ['ev-benchmark-2024'],
    evidenceStrength: 0.69,
    publishedAt: '2026-05-10T00:00:00.000Z',
    reproducibilityArtifacts: {
      available: false,
    },
    suggestedNextStep: 'Review benchmark split language and update provenance appendix.',
  },
  {
    id: 'lit-004',
    type: 'new_paper',
    title: 'Null Result for Graph Features in Long-Tail Protein Families',
    topic: 'long-tail protein families',
    relationship: 'negative',
    relatedClaimIds: ['claim-graph-boost'],
    evidenceStrength: 0.74,
    publishedAt: '2026-05-12T00:00:00.000Z',
    reproducibilityArtifacts: {
      available: false,
    },
    suggestedNextStep: 'Open a research-gap task for long-tail family evaluation.',
  },
];

const retractionEvent = {
  id: 'lit-retraction',
  type: 'retraction',
  title: 'Retraction Notice: Rare Disease Cohort Validation',
  topic: 'rare disease validation cohorts',
  relationship: 'retracts',
  affectedEvidenceIds: ['ev-lab-2025'],
  publishedAt: '2026-05-19T00:00:00.000Z',
};

const cleanManuscript = {
  id: 'assistant-manuscript-clean',
  title: 'Clean Literature Packet',
  claims: [
    {
      id: 'claim-clean',
      text: 'The dataset release includes code and environment metadata.',
      evidenceIds: ['ev-clean-2026'],
      lastReviewedAt: '2026-05-18T00:00:00.000Z',
    },
  ],
};

const checkedAt = '2026-05-20T00:00:00.000Z';

module.exports = {
  manuscript,
  literatureEvents,
  retractionEvent,
  cleanManuscript,
  checkedAt,
};
