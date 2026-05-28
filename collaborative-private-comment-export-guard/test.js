const assert = require('assert');

const {
  buildExportPacket,
  reviewExportCommentPrivacy
} = require('./index');

const workspace = {
  id: 'collab-editor-12',
  title: 'Quantum Materials Draft',
  invitedReviewerIds: ['rv-alpha', 'rv-beta'],
  exportProfiles: {
    publicPdf: { allowedVisibilities: ['public'], requireResolvedThreads: true },
    reviewerPackage: { allowedVisibilities: ['public', 'reviewer-only'], requireResolvedThreads: false }
  },
  documents: [
    {
      id: 'doc-ready',
      exportProfile: 'publicPdf',
      threads: [
        {
          id: 'th-001',
          visibility: 'public',
          resolved: true,
          mentions: ['rv-alpha'],
          text: 'Clarify method wording before public release.'
        }
      ],
      inlineAnnotations: [{ kind: 'public-note', text: 'Visible caption note.' }],
      redactionEvidence: ['public-comment-scan']
    },
    {
      id: 'doc-private-leak',
      exportProfile: 'publicPdf',
      threads: [
        {
          id: 'th-002',
          visibility: 'private',
          resolved: false,
          mentions: ['rv-gamma'],
          text: 'Do not publish reviewer phone +1 555 010 3311 or delta@private.example'
        },
        {
          id: 'th-003',
          visibility: 'reviewer-only',
          resolved: true,
          mentions: ['rv-beta'],
          text: 'Internal reviewer-only concern.'
        }
      ],
      inlineAnnotations: [{ kind: 'sensitive-inline', text: 'Draft contains embargo note.' }],
      redactionEvidence: []
    },
    {
      id: 'doc-reviewer-package',
      exportProfile: 'reviewerPackage',
      threads: [
        {
          id: 'th-004',
          visibility: 'reviewer-only',
          resolved: false,
          mentions: ['rv-alpha'],
          text: 'Reviewer package can retain this note.'
        }
      ],
      inlineAnnotations: [],
      redactionEvidence: ['reviewer-package-scan']
    }
  ]
};

const result = reviewExportCommentPrivacy(workspace);

assert.strictEqual(result.readyCount, 2);
assert.strictEqual(result.holdCount, 1);
assert.ok(result.digest.startsWith('sha256:'));

const ready = result.documentReviews.find((review) => review.documentId === 'doc-ready');
assert.strictEqual(ready.decision, 'ready');
assert.deepStrictEqual(ready.holds, []);
assert.strictEqual(ready.actions.releaseExport, true);

const blocked = result.documentReviews.find((review) => review.documentId === 'doc-private-leak');
assert.strictEqual(blocked.decision, 'hold');
assert.ok(blocked.holds.includes('visibility-not-allowed:th-002:private'));
assert.ok(blocked.holds.includes('visibility-not-allowed:th-003:reviewer-only'));
assert.ok(blocked.holds.includes('unresolved-thread:th-002'));
assert.ok(blocked.holds.includes('uninvited-mention:th-002:rv-gamma'));
assert.ok(blocked.holds.includes('sensitive-inline-annotation'));
assert.ok(blocked.holds.includes('missing-redaction-evidence'));
assert.strictEqual(blocked.actions.releaseExport, false);

const reviewerPackage = result.documentReviews.find(
  (review) => review.documentId === 'doc-reviewer-package'
);
assert.strictEqual(reviewerPackage.decision, 'ready');
assert.strictEqual(reviewerPackage.actions.releaseExport, true);

const packet = buildExportPacket(workspace, result);
const serialized = JSON.stringify(packet);
assert.ok(!serialized.includes('delta@private.example'));
assert.ok(!serialized.includes('+1 555 010 3311'));
assert.deepStrictEqual(packet.summary, { ready: 2, hold: 1 });

console.log('collaborative-private-comment-export-guard tests passed');
