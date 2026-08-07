const ScientificBountyReviewIntegrity = require('./index.js');

const integrity = new ScientificBountyReviewIntegrity({ threshold: 0.7 });
let passed = 0, failed = 0;

try {
  const manifest = integrity.createEvidenceManifest([
    { name: 'proposal', content: 'test' },
    { name: 'evidence', content: 'test' }
  ]);
  if (manifest.audit_hash && manifest.artifacts.length === 2) {
    console.log('✓ Test 1: Manifest generation passed');
    passed++;
  } else {
    console.log('✗ Test 1 failed');
    failed++;
  }
} catch (e) {
  console.log('✗ Test 1 error:', e.message);
  failed++;
}

try {
  const reviewers = [
    { name: 'R1', reviewer_affiliation: 'MIT' },
    { name: 'R2', reviewer_affiliation: 'Stanford' },
    { name: 'R3', reviewer_affiliation: 'MIT' }
  ];
  const submission = { id: 's1', reviewer_affiliation: 'MIT' };
  const filtered = integrity.filterConflictedReviewers(reviewers, submission);
  if (filtered.length === 1 && filtered[0].name === 'R2') {
    console.log('✓ Test 2: Conflict filtering passed');
    passed++;
  } else {
    console.log('✗ Test 2 failed');
    failed++;
  }
} catch (e) {
  console.log('✗ Test 2 error:', e.message);
  failed++;
}

try {
  const rubric = [
    { key: 'technical_merit', weight: 0.5 },
    { key: 'reproducibility', weight: 0.5 }
  ];
  const submission = { id: 's1', technical_merit: 0.8, reproducibility: 0.9 };
  const eval = integrity.evaluateRubric(submission, rubric);
  if (eval.score === 0.85 && eval.passes === true) {
    console.log('✓ Test 3: Rubric evaluation passed');
    passed++;
  } else {
    console.log('✗ Test 3 failed');
    failed++;
  }
} catch (e) {
  console.log('✗ Test 3 error:', e.message);
  failed++;
}

try {
  const milestones = [
    { name: 'phase_1', percentage: 30 },
    { name: 'phase_2', percentage: 40 },
    { name: 'phase_3', percentage: 30 }
  ];
  const splits = integrity.calculatePayoutSplits(1000, milestones);
  const total = splits.reduce((sum, s) => sum + s.amount, 0);
  if (total === 1000 && splits.length === 3) {
    console.log('✓ Test 4: Payout splits passed');
    passed++;
  } else {
    console.log('✗ Test 4 failed');
    failed++;
  }
} catch (e) {
  console.log('✗ Test 4 error:', e.message);
  failed++;
}

console.log(`\nTest Results: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
