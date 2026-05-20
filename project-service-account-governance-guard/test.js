'use strict';

const assert = require('assert/strict');
const { evaluateServiceAccountGovernance, digest } = require('./index');
const sample = require('./sample-data');

function runEvaluation(serviceAccounts) {
  return evaluateServiceAccountGovernance({
    checkedAt: sample.checkedAt,
    humanOwners: sample.humanOwners,
    sponsors: sample.sponsors,
    serviceAccounts,
  });
}

function testApprovesCleanServiceAccount() {
  const result = runEvaluation(sample.cleanServiceAccounts);

  assert.equal(result.decision, 'approved');
  assert.equal(result.summary.approved, 1);
  assert.equal(result.accessHold, false);
  assert.equal(result.accounts[0].action, 'renew');
}

function testRotationWarnings() {
  const result = runEvaluation([sample.serviceAccounts[1]]);

  assert.equal(result.decision, 'needs_rotation');
  assert.equal(result.summary.needsRotation, 1);
  assert.ok(result.warnings.some((finding) => finding.code === 'owner_assurance_incomplete'));
  assert.ok(result.warnings.some((finding) => finding.code === 'service_account_idle'));
  assert.ok(result.warnings.some((finding) => finding.code === 'service_account_expiring_soon'));
}

function testSuspendsRiskyExternalIntegration() {
  const result = runEvaluation([sample.serviceAccounts[2]]);

  assert.equal(result.decision, 'suspended');
  assert.equal(result.accessHold, true);
  assert.ok(result.blockers.some((finding) => finding.code === 'privileged_scope_on_service_account'));
  assert.ok(result.blockers.some((finding) => finding.code === 'external_data_export_without_dua'));
  assert.ok(result.warnings.some((finding) => finding.code === 'service_account_sponsor_missing'));
}

function testRevokesOrphanedExposedToken() {
  const result = runEvaluation([sample.serviceAccounts[3]]);

  assert.equal(result.decision, 'revoked');
  assert.equal(result.summary.revoked, 1);
  assert.ok(result.blockers.some((finding) => finding.code === 'human_owner_inactive'));
  assert.ok(result.blockers.some((finding) => finding.code === 'service_account_secret_exposed'));
  assert.ok(result.reviewerTasks.some((task) => task.includes('Revoke orphaned')));
}

function testCombinedSummary() {
  const result = runEvaluation(sample.serviceAccounts);

  assert.equal(result.decision, 'revoked');
  assert.equal(result.summary.totalAccounts, 4);
  assert.equal(result.summary.approved, 1);
  assert.equal(result.summary.needsRotation, 1);
  assert.equal(result.summary.suspended, 1);
  assert.equal(result.summary.revoked, 1);
  assert.equal(result.accessHold, true);
}

function testDigestIsDeterministic() {
  const input = {
    checkedAt: sample.checkedAt,
    humanOwners: sample.humanOwners,
    sponsors: sample.sponsors,
    serviceAccounts: sample.serviceAccounts,
  };
  const first = evaluateServiceAccountGovernance(input);
  const second = evaluateServiceAccountGovernance(input);

  assert.equal(first.auditDigest, second.auditDigest);
  assert.equal(digest({ z: 1, a: 2 }), digest({ a: 2, z: 1 }));
}

function run() {
  testApprovesCleanServiceAccount();
  testRotationWarnings();
  testSuspendsRiskyExternalIntegration();
  testRevokesOrphanedExposedToken();
  testCombinedSummary();
  testDigestIsDeterministic();
  console.log('project-service-account-governance-guard tests passed');
}

run();
