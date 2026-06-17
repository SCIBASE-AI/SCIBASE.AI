'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  buildMarkdownReport,
  buildSvgSummary,
  evaluatePacket,
  evaluateSuite
} = require('../src');

const packet = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'examples', 'assistant-output-packets.json'), 'utf8')
);

function entry(id) {
  return packet.packets.find((item) => item.id === id);
}

test('releases sanitized assistant output with redaction and approval evidence', () => {
  const result = evaluatePacket(entry('packet-clean-review'), {
    asOf: packet.asOf,
    policy: packet.policy
  });

  assert.equal(result.decision, 'RELEASE_OUTPUT');
  assert.equal(result.reasons.length, 0);
  assert.deepEqual(result.disclosureSignals.directIdentifierMatches, []);
});

test('holds peer-review output with PHI, reviewer identity, and unsupported claims', () => {
  const result = evaluatePacket(entry('packet-phi-hold'), {
    asOf: packet.asOf,
    policy: packet.policy
  });

  assert.equal(result.decision, 'HOLD_OUTPUT');
  assert.ok(result.reasons.some((reason) => reason.code === 'EMAIL_ADDRESS'));
  assert.ok(result.reasons.some((reason) => reason.code === 'MEDICAL_RECORD_NUMBER'));
  assert.ok(result.reasons.some((reason) => reason.code === 'DOUBLE_BLIND_IDENTITY_LEAK'));
  assert.ok(result.reasons.some((reason) => reason.code === 'UNSUPPORTED_HIGH_IMPACT_CLAIM'));
});

test('holds public reproducibility output that leaks embargoed private storage', () => {
  const result = evaluatePacket(entry('packet-private-repro'), {
    asOf: packet.asOf,
    policy: packet.policy
  });

  assert.equal(result.decision, 'HOLD_OUTPUT');
  assert.ok(result.reasons.some((reason) => reason.code === 'PRIVATE_STORAGE_LINK'));
  assert.ok(result.reasons.some((reason) => reason.code === 'EMBARGOED_PUBLIC_OUTPUT'));
  assert.ok(result.reasons.some((reason) => reason.code === 'RESTRICTED_OUTPUT_LACKS_APPROVAL'));
});

test('routes unsupported research-gap language to review before release', () => {
  const result = evaluatePacket(entry('packet-gap-review'), {
    asOf: packet.asOf,
    policy: packet.policy
  });

  assert.equal(result.decision, 'REVIEW_BEFORE_RELEASE');
  assert.ok(result.reasons.some((reason) => reason.code === 'UNSUPPORTED_HIGH_IMPACT_CLAIM'));
});

test('holds assistant output that appears to leak prompt instructions', () => {
  const result = evaluatePacket(entry('packet-prompt-leak'), {
    asOf: packet.asOf,
    policy: packet.policy
  });

  assert.equal(result.decision, 'HOLD_OUTPUT');
  assert.equal(result.disclosureSignals.promptLeak, true);
  assert.ok(result.reasons.some((reason) => reason.code === 'PROMPT_OR_INSTRUCTION_LEAK'));
});

test('suite summary and reviewer artifacts are deterministic', () => {
  const suite = evaluateSuite(packet);
  const report = buildMarkdownReport(suite);
  const svg = buildSvgSummary(suite);

  assert.equal(suite.summary.totalPackets, 5);
  assert.equal(suite.summary.release, 1);
  assert.equal(suite.summary.review, 1);
  assert.equal(suite.summary.hold, 3);
  assert.deepEqual(suite.summary.heldPacketIds, [
    'packet-phi-hold',
    'packet-private-repro',
    'packet-prompt-leak'
  ]);
  assert.match(report, /Assistant Output Disclosure Report/);
  assert.match(report, /PROMPT_OR_INSTRUCTION_LEAK/);
  assert.match(svg, /Assistant output disclosure guard summary/);
});
