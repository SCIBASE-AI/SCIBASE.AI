'use strict';

const graph = {
  checkedAt: '2026-05-20T00:00:00.000Z',
  entities: [
    { id: 'pub-open-microscopy', kind: 'publication', label: 'Open microscopy benchmark' },
    { id: 'pub-sponsored-assay', kind: 'publication', label: 'Sponsored assay comparison' },
    { id: 'preprint-device-eval', kind: 'preprint', label: 'Device evaluation preprint' },
    { id: 'author-ada', kind: 'author', label: 'Ada Researcher' },
    { id: 'author-bohr', kind: 'author', label: 'Bohr Analyst' },
    { id: 'author-curie', kind: 'author', label: 'Curie Reviewer' },
    { id: 'funder-public', kind: 'funder', label: 'Public Science Fund' },
    { id: 'funder-vendor', kind: 'funder', label: 'Vendor Analytics Lab' },
    { id: 'institution-vendor', kind: 'institution', label: 'Vendor Analytics Lab' },
    { id: 'dataset-open', kind: 'dataset', label: 'Open microscopy dataset' },
    { id: 'dataset-sponsored', kind: 'dataset', label: 'Sponsor controlled assay dataset' },
  ],
  edges: [
    { from: 'author-ada', to: 'pub-open-microscopy', type: 'authored', disclosed: true },
    { from: 'funder-public', to: 'pub-open-microscopy', type: 'funds', weight: 1, fundingType: 'public_grant', disclosed: true },
    { from: 'pub-open-microscopy', to: 'dataset-open', type: 'uses_dataset' },
    { from: 'author-bohr', to: 'pub-sponsored-assay', type: 'authored', disclosed: true },
    { from: 'funder-vendor', to: 'pub-sponsored-assay', type: 'funds', weight: 0.85, fundingType: 'industry_sponsor', disclosed: true },
    { from: 'funder-public', to: 'pub-sponsored-assay', type: 'funds', weight: 0.15, fundingType: 'public_grant', disclosed: true },
    { from: 'author-bohr', to: 'funder-vendor', type: 'affiliated_with' },
    { from: 'pub-sponsored-assay', to: 'dataset-open', type: 'uses_dataset' },
    { from: 'author-curie', to: 'preprint-device-eval', type: 'authored', disclosed: false },
    { from: 'funder-vendor', to: 'preprint-device-eval', type: 'funds', weight: 1, fundingType: 'vendor', disclosed: false },
    { from: 'author-curie', to: 'preprint-device-eval', type: 'coi', disclosed: false },
    { from: 'author-curie', to: 'institution-vendor', type: 'affiliated_with' },
    { from: 'preprint-device-eval', to: 'dataset-sponsored', type: 'uses_dataset' },
    { from: 'funder-vendor', to: 'dataset-sponsored', type: 'controls', independentAccessReview: false },
  ],
};

module.exports = {
  graph,
  cleanGraph: {
    checkedAt: graph.checkedAt,
    entities: graph.entities.filter((entity) => ['pub-open-microscopy', 'author-ada', 'funder-public', 'dataset-open'].includes(entity.id)),
    edges: graph.edges.filter((edge) => ['pub-open-microscopy', 'author-ada', 'funder-public', 'dataset-open'].includes(edge.from) || ['pub-open-microscopy', 'author-ada', 'funder-public', 'dataset-open'].includes(edge.to)),
  },
};
