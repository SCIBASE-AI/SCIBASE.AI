import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import packets from '../data/dispute-packets.json' with { type: 'json' };
import { evaluateDisputeBatch, evaluateDisputePacket } from '../src/disputeGuard.mjs';

const NOW = '2026-06-27T08:00:00Z';

describe('payment dispute evidence guard', () => {
  it('releases a complete dispute packet when all response controls are satisfied', () => {
    const result = evaluateDisputePacket(packets[0], { now: NOW });

    assert.equal(result.decision, 'RELEASE_RESPONSE');
    assert.equal(result.findingCount, 0);
    assert.equal(result.netAmountAtRiskCents, 120000);
  });

  it('holds packets with missing evidence and unredacted receipt data', () => {
    const result = evaluateDisputePacket(packets[1], { now: NOW });
    const codes = result.findings.map((finding) => finding.code);

    assert.equal(result.decision, 'HOLD_RESPONSE');
    assert.ok(codes.includes('RESPONSE_WINDOW_EXPIRED'));
    assert.ok(codes.includes('MISSING_DISPUTE_EVIDENCE'));
    assert.ok(codes.includes('SENSITIVE_RECEIPT_DATA'));
  });

  it('flags disputes that were already offset by refunds and credit memos', () => {
    const result = evaluateDisputePacket(packets[2], { now: NOW });
    const codes = result.findings.map((finding) => finding.code);

    assert.equal(result.netAmountAtRiskCents, 0);
    assert.equal(result.decision, 'REVIEW_BEFORE_RESPONSE');
    assert.ok(codes.includes('DISPUTE_ALREADY_OFFSET'));
  });

  it('detects duplicate processor cases across a batch', () => {
    const report = evaluateDisputeBatch(packets, { now: NOW });
    const duplicateResults = report.results.filter((result) => {
      return result.findings.some((finding) => finding.code === 'DUPLICATE_PROCESSOR_CASE');
    });

    assert.equal(duplicateResults.length, 2);
    assert.equal(report.summary.overallDecision, 'HOLD_RESPONSE');
    assert.equal(report.summary.decisions.HOLD_RESPONSE, 2);
  });
});
