const assert = require('assert');

const {
  buildSafetyReviewPacket,
  reviewAdverseEventSafety
} = require('./index');

const sampleEmail = ['dana', 'example.edu'].join('@');
const sampleToken = ['clinical', 'demo'].join('-');

const manuscript = {
  id: 'clinic-ae-16',
  title: 'Phase II kinase inhibitor safety manuscript',
  reviewDate: '2026-05-28',
  arms: [
    {
      id: 'control',
      label: 'Control',
      participants: 120,
      exposurePatientYears: 92,
      events: [
        { term: 'headache', grade: 1, count: 14, participantsAtRisk: 120 },
        { term: 'neutropenia', grade: 3, count: 2, participantsAtRisk: 120 }
      ],
      seriousAdverseEvents: 1,
      reportedSeriousAdverseEvents: 1
    },
    {
      id: 'treatment',
      label: 'Treatment',
      participants: 118,
      exposurePatientYears: 88,
      events: [
        { term: 'hepatotoxicity', grade: 4, count: 8, participantsAtRisk: 118 },
        { term: 'infection', grade: 3, count: 7 },
        { term: 'fatigue', grade: 2, count: 19, participantsAtRisk: 118 }
      ],
      seriousAdverseEvents: 6,
      reportedSeriousAdverseEvents: 2
    }
  ],
  claims: [
    {
      id: 'claim-safe',
      text: 'No meaningful safety concerns were observed and all adverse events were grade 2 or lower.',
      linkedEventTerms: ['hepatotoxicity', 'infection']
    }
  ],
  oversight: {
    dsmbReviewLinked: false,
    irbFollowUpStatus: 'pending',
    auditLog: `reviewer ${sampleEmail} noted token=${sampleToken} before DSMB review`
  }
};

const review = reviewAdverseEventSafety(manuscript);

assert.strictEqual(review.armCount, 2);
assert.strictEqual(review.decision, 'hold');
assert.strictEqual(review.holdCount, 7);
assert.ok(review.digest.startsWith('sha256:'));

const holdCodes = review.findings.map((finding) => finding.code);
assert.ok(holdCodes.includes('serious-ae-underreported'));
assert.ok(holdCodes.includes('arm-level-ae-imbalance'));
assert.ok(holdCodes.includes('missing-event-denominator'));
assert.ok(holdCodes.includes('exposure-adjusted-incidence-gap'));
assert.ok(holdCodes.includes('oversight-follow-up-missing'));
assert.ok(holdCodes.includes('severity-grade-claim-mismatch'));
assert.ok(holdCodes.includes('claim-downplays-safety-uncertainty'));

const treatment = review.armReviews.find((arm) => arm.armId === 'treatment');
assert.strictEqual(treatment.metrics.grade3PlusEvents, 15);
assert.strictEqual(treatment.metrics.seriousAdverseEvents, 6);
assert.strictEqual(treatment.metrics.reportedSeriousAdverseEvents, 2);

const packet = buildSafetyReviewPacket(manuscript, review);
const serialized = JSON.stringify(packet);
assert.deepStrictEqual(packet.summary, { decision: 'hold', findings: 7, arms: 2 });
assert.ok(packet.actions.includes('link-dsmb-or-irb-follow-up-before-ready'));
assert.ok(!serialized.includes(sampleEmail));
assert.ok(!serialized.includes(sampleToken));

const cleanReview = reviewAdverseEventSafety({
  id: 'clean-ae-16',
  title: 'Clean safety manuscript',
  reviewDate: '2026-05-28',
  arms: [
    {
      id: 'control-clean',
      label: 'Control clean',
      participants: 30,
      exposurePatientYears: 12,
      events: [],
      seriousAdverseEvents: 0,
      reportedSeriousAdverseEvents: 0
    },
    {
      id: 'treatment-clean',
      label: 'Treatment clean',
      participants: 30,
      exposurePatientYears: 12,
      events: [],
      seriousAdverseEvents: 0,
      reportedSeriousAdverseEvents: 0
    }
  ],
  claims: [{ id: 'claim-balanced', text: 'Safety results are described without overstatement.' }],
  oversight: { dsmbReviewLinked: true, irbFollowUpStatus: 'complete' }
});

assert.strictEqual(cleanReview.decision, 'ready');
assert.deepStrictEqual(cleanReview.findings, []);

console.log('clinical-adverse-event-safety-assistant tests passed');
