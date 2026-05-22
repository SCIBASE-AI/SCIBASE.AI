const scenarios = [
  {
    name: 'consent-block',
    projectId: 'project-neuro-imaging',
    action: 'publish-preprint',
    generatedAt: '2026-05-22T12:30:00Z',
    contributors: [
      {id: 'u1', name: 'Ava Chen', role: 'Owner', orcid: '0000-0001-1111-1111', activeMember: true},
      {id: 'u2', name: 'Mika Rao', role: 'Contributor', orcid: '0000-0002-2222-2222', activeMember: true},
    ],
    creditStatements: [
      {contributorId: 'u1', creditRoles: ['Conceptualization', 'Writing - original draft'], consented: true, authorOrder: 1},
      {contributorId: 'u2', creditRoles: ['Data curation'], consented: false, authorOrder: 2},
    ],
    projectArtifacts: [
      {path: 'manuscript/main.md', touchedBy: ['u1']},
      {path: 'data/participants.csv', touchedBy: ['u2']},
    ],
  },
  {
    name: 'omitted-contributor-remediation',
    projectId: 'project-climate-model',
    action: 'publish-preprint',
    generatedAt: '2026-05-22T12:30:00Z',
    contributors: [
      {id: 'u1', name: 'Noor Silva', role: 'Owner', orcid: '0000-0001-3333-3333', activeMember: true},
      {id: 'u2', name: 'Jon Bell', role: 'Contributor', orcid: '0000-0002-4444-4444', activeMember: true},
      {id: 'u3', name: 'Ren Ito', role: 'Reviewer', orcid: '0000-0003-5555-5555', activeMember: true},
    ],
    creditStatements: [
      {contributorId: 'u1', creditRoles: ['Supervision'], consented: true, authorOrder: 1},
      {contributorId: 'u2', creditRoles: [], consented: true, authorOrder: 2},
    ],
    projectArtifacts: [
      {path: 'code/model.py', touchedBy: ['u2', 'u3']},
      {path: 'results/forecast.svg', touchedBy: ['u3']},
    ],
  },
  {
    name: 'approved-credit-packet',
    projectId: 'project-approved-credit',
    action: 'publish-preprint',
    generatedAt: '2026-05-22T12:30:00Z',
    contributors: [
      {id: 'u1', name: 'Lina Park', role: 'Owner', orcid: '0000-0001-6666-6666', activeMember: true},
      {id: 'u2', name: 'Samir Okafor', role: 'Contributor', orcid: '0000-0002-7777-7777', activeMember: true},
    ],
    creditStatements: [
      {contributorId: 'u1', creditRoles: ['Conceptualization', 'Funding acquisition'], consented: true, authorOrder: 1},
      {contributorId: 'u2', creditRoles: ['Software', 'Formal analysis'], consented: true, authorOrder: 2},
    ],
    projectArtifacts: [
      {path: 'manuscript/main.md', touchedBy: ['u1']},
      {path: 'code/analysis.py', touchedBy: ['u2']},
      {path: 'results/table.csv', touchedBy: ['u2']},
    ],
  },
];

module.exports = {scenarios};
