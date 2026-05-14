'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const sample = require('../data/sample-community.json');
const {
  buildCommunityReputationReport,
  buildContributionGraph,
  computeReputation,
  detectAbuseSignals,
  redactReview,
  reviewQuality,
} = require('../src/reputation-safeguards');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test('anonymous and double-blind review modes redact reviewer identity', () => {
  const users = new Map(sample.users.map((user) => [user.id, user]));
  const publicReview = redactReview(sample.reviews[0], users);
  const anonymousReview = redactReview(sample.reviews[1], users);
  const doubleBlindReview = redactReview(sample.reviews[2], users);

  assert.equal(publicReview.reviewer.name, 'Dr. Lina Ortiz');
  assert.equal(anonymousReview.reviewer.name, 'Anonymous reviewer');
  assert.equal(doubleBlindReview.reviewer.name, 'Anonymous reviewer');
  assert.equal(doubleBlindReview.authorsVisible, false);
});

test('inline comments keep artifact anchors while redacting anonymous authors', () => {
  const report = buildCommunityReputationReport(sample);
  const anonymousComment = report.comments.find((comment) => comment.id === 'c2');

  assert.equal(anonymousComment.artifact.type, 'dataset');
  assert.equal(anonymousComment.artifact.path, 'data/heat-survey.csv');
  assert.equal(anonymousComment.author.name, 'Anonymous reviewer');
});

test('contribution graph stores CRediT roles and project edges', () => {
  const graph = buildContributionGraph(sample);
  const lina = graph.nodes.find((node) => node.id === 'u1');

  assert.ok(lina.roles.includes('formal-analysis'));
  assert.ok(lina.roles.includes('writing-review-editing'));
  assert.equal(graph.edges.length, sample.contributions.length);
});

test('abuse signals detect self-endorsement, reciprocal loop, conflict, and shallow review', () => {
  const signals = detectAbuseSignals(sample);

  assert.ok(signals.some((signal) => signal.type === 'self-endorsement'));
  assert.ok(signals.some((signal) => signal.type === 'reciprocal-endorsement-loop'));
  assert.ok(signals.some((signal) => signal.type === 'review-conflict'));
  assert.ok(signals.some((signal) => signal.type === 'low-evidence-review'));
});

test('reputation scoring rewards strong contributors and applies watch badges', () => {
  const signals = detectAbuseSignals(sample);
  const reputation = computeReputation(sample, signals);
  const top = reputation[0];
  const watched = reputation.find((entry) => entry.userId === 'u4');

  assert.equal(top.name, 'Dr. Lina Ortiz');
  assert.ok(top.badges.includes('Open Science Champion'));
  assert.ok(top.score > 80);
  assert.ok(watched.badges.includes('Reputation Watch'));
  assert.equal(watched.tier, 'needs-review');
});

test('leaderboards segment by domain, region, and institution', () => {
  const report = buildCommunityReputationReport(sample);

  assert.equal(report.leaderboards.byDomain['public-health'][0].name, 'Dr. Lina Ortiz');
  assert.equal(report.leaderboards.byRegion['North America'][0].name, 'Dr. Lina Ortiz');
  assert.equal(report.leaderboards.byInstitution['Metro Research Lab'][0].name, 'Dr. Lina Ortiz');
});

test('review quality accounts for score depth and summary evidence', () => {
  const good = reviewQuality(sample.reviews[0]);
  const shallow = reviewQuality(sample.reviews[2]);

  assert.ok(good > shallow);

  const modified = clone(sample.reviews[2]);
  modified.summary = 'This review explains the dataset limitation, code path, reproduction command, and necessary documentation fixes in detail.';
  assert.ok(reviewQuality(modified) > shallow);
});
