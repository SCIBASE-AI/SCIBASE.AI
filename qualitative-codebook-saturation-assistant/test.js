const assert = require('assert');

const {
  buildReviewerPacket,
  reviewQualitativeReadiness
} = require('./index');

const study = {
  id: 'ai-assistant-qual-16',
  title: 'Remote Lab Onboarding Interviews',
  minimumCoderAgreement: 0.72,
  minimumSaturationRounds: 2,
  requiredDomains: ['onboarding', 'tooling', 'data-sharing', 'mentorship'],
  consentedTranscriptIds: ['tx-001', 'tx-002', 'tx-003', 'tx-004'],
  submissions: [
    {
      id: 'packet-ready',
      team: { id: 'team-indigo', contactEmail: 'indigo.lab@example.edu' },
      codebook: [
        { code: 'onboarding-friction', domain: 'onboarding', examples: 4 },
        { code: 'tool-handoff', domain: 'tooling', examples: 5 },
        { code: 'dataset-ownership', domain: 'data-sharing', examples: 3 },
        { code: 'mentor-access', domain: 'mentorship', examples: 3 }
      ],
      transcriptIds: ['tx-001', 'tx-002', 'tx-003', 'tx-004'],
      coderAgreement: 0.81,
      saturationRounds: 3,
      reflexivityMemo: 'Interviewers documented role distance and prior collaboration history.',
      memberChecking: { completed: true, unresolvedObjections: 0 },
      auditTrail: ['protocol-v1', 'codebook-v2', 'negative-case-review'],
      rawTranscriptQuotes: ['Participant A: alpha@private.example asked for access.']
    },
    {
      id: 'packet-missing-domain',
      team: { id: 'team-gold', contactEmail: 'gold.lab@example.edu' },
      codebook: [
        { code: 'onboarding-friction', domain: 'onboarding', examples: 4 },
        { code: 'tool-handoff', domain: 'tooling', examples: 2 }
      ],
      transcriptIds: ['tx-001', 'tx-002'],
      coderAgreement: 0.79,
      saturationRounds: 2,
      reflexivityMemo: 'Memo present.',
      memberChecking: { completed: true, unresolvedObjections: 0 },
      auditTrail: ['protocol-v1', 'codebook-v1'],
      rawTranscriptQuotes: ['Participant B shared a private phone number 555-010-8899.']
    },
    {
      id: 'packet-low-agreement',
      team: { id: 'team-cobalt', contactEmail: 'cobalt.lab@example.edu' },
      codebook: [
        { code: 'onboarding-friction', domain: 'onboarding', examples: 3 },
        { code: 'tool-handoff', domain: 'tooling', examples: 4 },
        { code: 'dataset-ownership', domain: 'data-sharing', examples: 3 },
        { code: 'mentor-access', domain: 'mentorship', examples: 2 }
      ],
      transcriptIds: ['tx-001', 'tx-999'],
      coderAgreement: 0.61,
      saturationRounds: 1,
      reflexivityMemo: '',
      memberChecking: { completed: false, unresolvedObjections: 2 },
      auditTrail: ['protocol-v1'],
      rawTranscriptQuotes: ['Participant C named their institution.']
    }
  ]
};

const result = reviewQualitativeReadiness(study);

assert.strictEqual(result.readyCount, 1);
assert.strictEqual(result.holdCount, 2);
assert.ok(result.digest.startsWith('sha256:'));

const ready = result.submissionReviews.find((review) => review.submissionId === 'packet-ready');
assert.strictEqual(ready.decision, 'ready');
assert.deepStrictEqual(ready.holds, []);
assert.strictEqual(ready.actions.releaseAssistantSummary, true);

const missingDomain = result.submissionReviews.find(
  (review) => review.submissionId === 'packet-missing-domain'
);
assert.strictEqual(missingDomain.decision, 'hold');
assert.ok(missingDomain.holds.includes('missing-required-domain:data-sharing'));
assert.ok(missingDomain.holds.includes('missing-required-domain:mentorship'));
assert.strictEqual(missingDomain.actions.releaseAssistantSummary, false);

const lowAgreement = result.submissionReviews.find(
  (review) => review.submissionId === 'packet-low-agreement'
);
assert.strictEqual(lowAgreement.decision, 'hold');
assert.ok(lowAgreement.holds.includes('coder-agreement-below-threshold'));
assert.ok(lowAgreement.holds.includes('saturation-evidence-insufficient'));
assert.ok(lowAgreement.holds.includes('missing-reflexivity-memo'));
assert.ok(lowAgreement.holds.includes('member-checking-incomplete'));
assert.ok(lowAgreement.holds.includes('unconsented-transcript:tx-999'));

const packet = buildReviewerPacket(study, result);
assert.ok(!JSON.stringify(packet).includes('indigo.lab@example.edu'));
assert.ok(!JSON.stringify(packet).includes('555-010-8899'));
assert.deepStrictEqual(packet.summary, { ready: 1, hold: 2 });

console.log('qualitative-codebook-saturation-assistant tests passed');
