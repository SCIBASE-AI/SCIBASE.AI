'use strict';

const sample = require('../data/sample-workspaces.json');
const {
  buildSubmissionPackage,
  decideWorkspaceAccess,
  evaluatePrequalification,
  evaluateWorkspacePrivacy,
  summarizePortfolio
} = require('../src/workspace-privacy');

const [readyWorkspace, blockedWorkspace] = sample.workspaces;
const summary = summarizePortfolio(sample.challenge, sample.workspaces);
const readyPrivacy = evaluateWorkspacePrivacy(sample.challenge, readyWorkspace);
const blockedPrequalification = evaluatePrequalification(sample.challenge, blockedWorkspace);
const submissionPackage = buildSubmissionPackage(sample.challenge, readyWorkspace);
const sponsorAccess = decideWorkspaceAccess(
  sample.challenge,
  readyWorkspace,
  { role: 'sponsor' },
  'viewArtifact',
  {
    artifactId: 'artifact-model',
    now: '2026-06-16T12:00:00.000Z'
  }
);
const arbitratorAccess = decideWorkspaceAccess(
  sample.challenge,
  readyWorkspace,
  { role: 'arbitrator' },
  'viewArtifact',
  {
    artifactId: 'artifact-model',
    disputeOpen: true,
    now: '2026-05-30T12:00:00.000Z'
  }
);

console.log(`Challenge: ${sample.challenge.title}`);
console.log(`Workspace status: ${blockedPrequalification.status}`);
console.log(`Prequalification: eligible=${summary.ready}, hold=${summary.hold}`);
console.log(`Ready blockers: ${readyPrivacy.blockers.length}`);
console.log(`Package digest: ${submissionPackage.packageDigest}`);
console.log(`Sponsor confidential artifact access: ${sponsorAccess.decision}`);
console.log(`Arbitrator confidential artifact access: ${arbitratorAccess.decision}`);
