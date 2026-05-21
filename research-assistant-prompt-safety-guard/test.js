'use strict';

const assert = require('assert');
const sampleData = require('./sample-data');
const {
  evaluateResearchAssistantSafety,
  toMarkdownReport,
  toSvgSummary
} = require('./index');

function testQuarantinesPromptInjectionAndHiddenInstructions() {
  const result = evaluateResearchAssistantSafety(sampleData);
  assert.strictEqual(result.status, 'quarantine_assistant_packet');
  assert.ok(result.inputFindings.some((finding) => finding.ruleId === 'ignore-prior'));
  assert.ok(result.inputFindings.some((finding) => finding.ruleId === 'hidden-instruction-channel'));
  assert.ok(result.summary.blockers.length >= 3);
}

function testUnsupportedAssistantOutputBlocksAcceptanceRecommendation() {
  const result = evaluateResearchAssistantSafety(sampleData);
  const hallucinated = result.outputReviews.find((review) => review.id === 'finding-hallucinated-citation');
  assert.ok(hallucinated.blockers.some((blocker) => blocker.includes('unknown evidence anchors')));
  assert.ok(hallucinated.blockers.some((blocker) => blocker.includes('acceptance recommendation conflicts')));
}

function testMissingEvidenceAnchorIsBlocked() {
  const result = evaluateResearchAssistantSafety(sampleData);
  const noAnchor = result.outputReviews.find((review) => review.id === 'finding-no-anchor');
  assert.ok(noAnchor.blockers.some((blocker) => blocker.includes('no evidence anchors')));
}

function testCleanPacketCanPass() {
  const clean = {
    ...sampleData,
    manuscript: {
      ...sampleData.manuscript,
      sections: sampleData.manuscript.sections.slice(0, 2)
    },
    supplements: [sampleData.supplements[1]],
    assistantOutput: {
      findings: [
        {
          id: 'finding-supported-atp',
          title: 'Endpoint support is visible for ATP recovery',
          summary: 'The ATP recovery claim is tied to Figure 2B and Table S1, including endpoint metadata.',
          evidenceIds: ['claim-atp-recovery', 'fig-2b', 'table-s1'],
          recommendation: 'minor revision'
        }
      ]
    }
  };
  const result = evaluateResearchAssistantSafety(clean);
  assert.strictEqual(result.status, 'assistant_packet_ready');
  assert.strictEqual(result.summary.blockers.length, 0);
}

function testReportsRender() {
  const result = evaluateResearchAssistantSafety(sampleData);
  const markdown = toMarkdownReport(result);
  const svg = toSvgSummary(result);
  assert.ok(markdown.includes('Research Assistant Prompt Safety Guard Report'));
  assert.ok(markdown.includes('Output Review Matrix'));
  assert.ok(svg.includes('<svg'));
  assert.ok(svg.includes('QUARANTINE'));
}

const tests = [
  testQuarantinesPromptInjectionAndHiddenInstructions,
  testUnsupportedAssistantOutputBlocksAcceptanceRecommendation,
  testMissingEvidenceAnchorIsBlocked,
  testCleanPacketCanPass,
  testReportsRender
];

for (const test of tests) {
  test();
}

console.log(`${tests.length} tests passed`);
