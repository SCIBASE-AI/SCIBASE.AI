'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const {
  analyzeCloseoutRecords,
  evaluateChallenge,
  renderMarkdown,
  renderSvg
} = require('./guard');

const packetPath = path.join(__dirname, 'data', 'closeout-records.json');
const packet = JSON.parse(fs.readFileSync(packetPath, 'utf8'));
const report = analyzeCloseoutRecords(packet);

assert.equal(report.generatedBy, 'challenge-closeout-retention-guard');
assert.equal(report.packetId, 'challenge-closeout-demo-001');
assert.equal(report.decision, 'hold-closeout');
assert.equal(report.challenges.length, 3);
assert.ok(report.riskScore >= 25);
assert.ok(report.severityCounts.critical >= 2);
assert.ok(report.severityCounts.high >= 4);

const oncologyFindings = report.findings.filter((finding) => finding.challengeId === 'oncology-biomarker-private');
const oncologyCodes = new Set(oncologyFindings.map((finding) => finding.code));
assert.ok(oncologyCodes.has('active-data-room-access-after-closeout'));
assert.ok(oncologyCodes.has('restricted-data-disposition-missing'));
assert.ok(oncologyCodes.has('destruction-evidence-missing'));
assert.ok(oncologyCodes.has('ip-transferred-before-funded-settlement'));
assert.ok(oncologyCodes.has('private-challenge-disclosure-unredacted'));

const cleanChallenge = packet.challenges.find((challenge) => challenge.id === 'climate-model-prize');
assert.deepEqual(evaluateChallenge(cleanChallenge, packet.generatedAt).findings, []);

assert.ok(report.closeoutActions.some((action) => action.includes('Revoke stale data-room')));
assert.ok(report.closeoutActions.some((action) => action.includes('Gate IP transfer')));

const markdown = renderMarkdown(report);
assert.ok(markdown.includes('Challenge Closeout Retention Guard'));
assert.ok(markdown.includes('active-data-room-access-after-closeout'));
assert.ok(markdown.includes('| critical |'));

const svg = renderSvg(report);
assert.ok(svg.startsWith('<svg'));
assert.ok(svg.includes('Challenge Closeout Guard'));
assert.ok(!svg.includes('<script'));

console.log('challenge-closeout-retention-guard tests passed');
