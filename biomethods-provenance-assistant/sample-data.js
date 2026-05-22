const scenarios = [
  {
    name: 'author-response-needed',
    manuscriptId: 'ms-organoid-drug-response',
    generatedAt: '2026-05-22T14:00:00Z',
    specimens: [
      {
        id: 'spec-1',
        label: 'patient-derived pancreatic organoid line',
        organism: 'Homo sapiens',
        tissue: 'pancreatic tumor',
        source: '',
        strain: '',
        sex: '',
        age: '',
      },
    ],
    cellLines: [
      {
        id: 'cl-hek293t',
        name: 'HEK293T',
        source: 'ATCC',
        authenticatedAt: '2024-01-01T00:00:00Z',
        authenticationMethod: 'STR',
        mycoplasmaTestedAt: '',
      },
    ],
    reagents: [
      {
        id: 'ab-gapdh',
        name: 'anti-GAPDH antibody',
        type: 'antibody',
        vendor: 'ExampleBio',
        catalogNumber: 'EB-100',
        lot: '',
        rrid: '',
      },
    ],
  },
  {
    name: 'batch-review-needed',
    manuscriptId: 'ms-batch-sensitive-assay',
    generatedAt: '2026-05-22T14:00:00Z',
    specimens: [],
    cellLines: [],
    reagents: [
      {
        id: 'cytokine-a',
        name: 'IL-6 ELISA kit',
        type: 'assay-kit',
        vendor: 'ExampleBio',
        catalogNumber: 'ELISA-IL6',
        lot: 'lot-a',
        methodSection: 'Figure 2',
      },
      {
        id: 'cytokine-b',
        name: 'IL-6 ELISA kit',
        type: 'assay-kit',
        vendor: 'ExampleBio',
        catalogNumber: 'ELISA-IL6',
        lot: 'lot-b',
        methodSection: 'Figure 4',
      },
    ],
  },
  {
    name: 'ready-for-review',
    manuscriptId: 'ms-complete-biomethods',
    generatedAt: '2026-05-22T14:00:00Z',
    specimens: [
      {
        id: 'mouse-cohort-a',
        label: 'treated mouse cohort',
        organism: 'Mus musculus',
        strain: 'C57BL/6J',
        sex: 'female',
        age: '10 weeks',
        source: 'Institutional animal facility',
      },
    ],
    cellLines: [
      {
        id: 'cl-a549',
        name: 'A549',
        source: 'ATCC',
        authenticatedAt: '2026-02-12T00:00:00Z',
        authenticationMethod: 'STR',
        mycoplasmaTestedAt: '2026-04-01T00:00:00Z',
      },
    ],
    reagents: [
      {
        id: 'ab-actin',
        name: 'anti-beta-actin antibody',
        type: 'antibody',
        vendor: 'ExampleBio',
        catalogNumber: 'EB-200',
        lot: 'lot-42',
        rrid: 'AB_123456',
      },
    ],
  },
];

module.exports = {scenarios};
