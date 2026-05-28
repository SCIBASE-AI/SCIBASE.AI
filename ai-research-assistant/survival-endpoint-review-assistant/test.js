'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const {
  analyzeSurvivalPackets,
  evaluateStudy,
  generateMarkdownReport,
  generateSvgReport
} = require('./assistant');

const packetPath = path.join(__dirname, 'data', 'survival-study-packets.json');
const packet = JSON.parse(fs.readFileSync(packetPath, 'utf8'));
const report = analyzeSurvivalPackets(packet);

assert.equal(report.generatedBy, 'survival-endpoint-review-assistant');
assert.equal(report.packetId, 'survival-peer-review-demo-001');
assert.equal(report.reviewerDecision, 'hold-for-survival-methods-review');
assert.equal(report.studies.length, 3);
assert.ok(report.riskScore > 20);

const registryFindings = report.findings.filter((finding) => finding.studyId === 'os-immunotherapy-registry');
const registryCodes = new Set(registryFindings.map((finding) => finding.code));

assert.ok(registryCodes.has('immortal-time-bias-risk'));
assert.ok(registryCodes.has('proportional-hazards-unsupported'));
assert.ok(registryCodes.has('censoring-imbalance'));
assert.ok(registryCodes.has('missing-censoring-table'));
assert.ok(registryCodes.has('low-events-per-variable'));
assert.ok(registryCodes.has('competing-risk-model-mismatch'));
assert.ok(registryCodes.has('claim-strength-exceeds-survival-evidence'));
assert.ok(registryFindings.some((finding) => finding.severity === 'critical'));

const vaccineStudy = packet.studies.find((study) => study.id === 'vaccine-durability-trial');
assert.deepEqual(evaluateStudy(vaccineStudy).findings, []);

assert.ok(report.reproducibilityActions.some((action) => action.includes('time-dependent')));
assert.ok(report.researchGapPrompts.some((prompt) => prompt.includes('immortal-time bias')));

const markdown = generateMarkdownReport(report);
assert.ok(markdown.includes('# Synthetic Time-to-Event Manuscript Review Packet'));
assert.ok(markdown.includes('immortal-time-bias-risk'));
assert.ok(markdown.includes('| critical |'));

const svg = generateSvgReport(report);
assert.ok(svg.startsWith('<svg'));
assert.ok(svg.includes('Survival Endpoint Review'));
assert.ok(!svg.includes('<script'));

console.log('survival-endpoint-review-assistant tests passed');
