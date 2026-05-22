const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluateContributionCredit,
  buildCreditReport,
} = require('./index');

test('blocks publication when listed author has not consented to credit statement', () => {
  const result = evaluateContributionCredit({
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
  });

  assert.equal(result.decision, 'blocked');
  assert.deepEqual(result.blockers, [
    'Mika Rao is listed in the credit statement without consent',
  ]);
  assert.equal(result.requiredActions[0].type, 'collect_credit_consent');
});

test('requires remediation when active artifact contributor is omitted from credit statement', () => {
  const result = evaluateContributionCredit({
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
  });

  assert.equal(result.decision, 'needs-remediation');
  assert.deepEqual(result.blockers, [
    'Jon Bell has no CRediT roles assigned',
    'Ren Ito contributed to project artifacts but is missing from credit statement',
  ]);
  assert.equal(result.coverage.artifactContributorCount, 2);
  assert.equal(result.coverage.creditedContributorCount, 2);
});

test('builds deterministic report for approved contribution credit packet', () => {
  const result = evaluateContributionCredit({
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
  });

  assert.equal(result.decision, 'approved');
  assert.equal(result.blockers.length, 0);
  assert.equal(result.coverage.consentCoverage, 1);

  const report = buildCreditReport(result);
  assert.match(report, /project-approved-credit/);
  assert.match(report, /Decision: approved/);
  assert.match(report, /Consent coverage: 100%/);
});
