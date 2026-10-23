import assert from "node:assert/strict";
import { evaluateSurveyPacket, renderMarkdownReport } from "./src/guard.js";
import { cleanPacket, riskyPacket } from "./src/samplePackets.js";

const clean = evaluateSurveyPacket(cleanPacket);
assert.equal(clean.decision, "RELEASE");
assert.equal(clean.findingCount, 0);
assert.equal(clean.releaseGate.canReleaseAiReview, true);

const risky = evaluateSurveyPacket(riskyPacket);
assert.equal(risky.decision, "HOLD");
assert.equal(risky.releaseGate.requiresPsychometricReviewer, true);
assert.ok(risky.findings.some((finding) => finding.code === "reverse_coding_drift"));
assert.ok(risky.findings.some((finding) => finding.code === "low_internal_consistency"));
assert.ok(risky.findings.some((finding) => finding.code === "missing_internal_consistency"));
assert.ok(risky.findings.some((finding) => finding.code === "factor_cross_loading"));
assert.ok(risky.findings.some((finding) => finding.code === "cfa_sample_size_shortfall"));
assert.ok(risky.findings.some((finding) => finding.code === "construct_claim_mismatch"));

const report = renderMarkdownReport(risky);
assert.match(report, /Survey Psychometric Validity Report/);
assert.match(report, /Decision: HOLD/);
assert.match(report, /reverse_coding_drift/);

console.log("survey psychometric validity assistant tests passed");

// Regression and boundary tests exercise failures independently of the risky fixture.
const mutate = fn => { const p = structuredClone(cleanPacket); fn(p); return p; };
for (const packet of [null, {}, { likertAnchors: ['1','2','3','4','5'] },
  mutate(p => delete p.sampleSize), mutate(p => p.scales[0].cronbachAlpha = NaN),
  mutate(p => p.scales[0].cronbachAlpha = Infinity), mutate(p => p.scales = []),
  mutate(p => p.scales[0].items = []), mutate(p => delete p.scales[0].items[0].loading),
  mutate(p => p.scales[0].items[0].loading = 2), mutate(p => p.scales[0].items[0].reverseCoded = 'false'),
  mutate(p => p.likertAnchors[1] = p.likertAnchors[0]),
  mutate(p => p.scales[0].crossLoadings = [{itemId:'unknown', secondaryLoading:0.5}]),
  mutate(p => p.scales[0].items[1].id = p.scales[0].items[0].id)]) {
  const result = evaluateSurveyPacket(packet);
  assert.equal(result.decision, 'HOLD');
  assert.equal(result.findings[0].code, 'invalid_input');
  assert.equal(result.releaseGate.canReleaseAiReview, false);
}
const cases = [
  [p => p.scales[0].cronbachAlpha = null, 'missing_internal_consistency'],
  [p => p.scales[0].cronbachAlpha = 0.69, 'low_internal_consistency'],
  [p => p.scales[0].items[0].loading = 0.49, 'weak_primary_loading'],
  [p => p.scales[0].crossLoadings[0].secondaryLoading = -0.9, 'factor_cross_loading'],
  [p => p.scales[0].crossLoadings[0].secondaryLoading = 0.32, 'factor_cross_loading'],
  [p => p.sampleSize = 319, 'cfa_sample_size_shortfall'],
  [p => p.likertAnchors.pop(), 'thin_likert_anchor_set'],
  [p => p.constructClaims = ['unmatched'], 'construct_claim_mismatch']
];
for (const [change, code] of cases) {
  const result = evaluateSurveyPacket(mutate(change));
  assert.equal(result.decision, 'REVIEW', code);
  assert.ok(result.findings.some(f => f.code === code), code);
}
assert.equal(evaluateSurveyPacket(mutate(p => {
  p.scales[0].cronbachAlpha = 0.7;
  p.scales[0].items[0].loading = -0.5;
  p.sampleSize = 320;
})).decision, 'RELEASE');
assert.equal(evaluateSurveyPacket(mutate(p => p.scales[0].items[3].reverseScored = false)).decision, 'HOLD');
for (const options of [{minimumAlpha:NaN}, {minimumAlpha:2}, {minimumLikertAnchors:1.5}, {unknown:1}]) {
  assert.throws(() => evaluateSurveyPacket(cleanPacket, options), TypeError);
}
assert.deepEqual(evaluateSurveyPacket(cleanPacket), evaluateSurveyPacket(cleanPacket));

const { releaseSurveyReview } = await import('./src/release.js');
let calls = 0;
const publish = async review => { calls++; assert.equal(review, 'review'); return 'receipt'; };
for (const packet of [riskyPacket, {}, mutate(p => p.likertAnchors.pop())]) {
  assert.equal((await releaseSurveyReview({packet, review:'review', publish})).published, false);
}
assert.equal(calls, 0);
assert.equal((await releaseSurveyReview({packet:cleanPacket, review:'review', publish})).receipt, 'receipt');
assert.equal(calls, 1);
await assert.rejects(releaseSurveyReview({packet:cleanPacket, publish:async () => { throw new Error('publish failed'); }}), /publish failed/);

const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
const { tmpdir } = await import('node:os');
const { join } = await import('node:path');
const { spawnSync } = await import('node:child_process');
const dir = await mkdtemp(join(tmpdir(), 'survey-test-'));
try {
  const file = join(dir, 'packet.json');
  for (const [packet, status] of [[cleanPacket,0], [mutate(p => p.likertAnchors.pop()),2], [{},3]]) {
    await writeFile(file, JSON.stringify(packet));
    const child = spawnSync(process.execPath, ['cli.js', file], {encoding:'utf8'});
    assert.equal(child.status, status, child.stderr);
    assert.ok(JSON.parse(child.stdout).decision);
  }
  await writeFile(file, '{bad json');
  assert.equal(spawnSync(process.execPath, ['cli.js',file]).status, 1);
} finally { await rm(dir, {recursive:true, force:true}); }
console.log('Regression, boundary, CLI and publication gate tests passed');
