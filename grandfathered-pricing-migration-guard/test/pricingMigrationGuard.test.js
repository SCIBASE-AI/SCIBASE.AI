'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  buildMarkdownReport,
  buildSvgSummary,
  evaluateAccount,
  evaluatePortfolio
} = require('../src');

const packet = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'examples', 'migration-packets.json'), 'utf8')
);

function account(id) {
  return packet.accounts.find((entry) => entry.id === id);
}

test('releases a legacy account when notice, consent, entitlements, and evidence pass', () => {
  const result = evaluateAccount(account('acct-univ-ready'), {
    asOf: packet.asOf,
    policy: packet.policy
  });

  assert.equal(result.decision, 'RELEASE_INVOICE');
  assert.equal(result.reasons.length, 0);
  assert.equal(result.entitlementImpact.missingAddOns.length, 0);
  assert.equal(result.priceImpact.increasePercent, 9.29);
});

test('holds migration invoices while a price lock blocks automatic migration', () => {
  const result = evaluateAccount(account('acct-lab-price-lock'), {
    asOf: packet.asOf,
    policy: packet.policy
  });

  assert.equal(result.decision, 'HOLD_INVOICE');
  assert.ok(result.reasons.some((reason) => reason.code === 'ACTIVE_PRICE_LOCK'));
  assert.ok(
    result.reasons.some((reason) => reason.code === 'GRANDFATHERING_BLOCKS_AUTO_MIGRATION')
  );
});

test('holds accounts when notice windows, consent, and add-on parity are missing', () => {
  const result = evaluateAccount(account('acct-notice-gap'), {
    asOf: packet.asOf,
    policy: packet.policy
  });

  assert.equal(result.decision, 'HOLD_INVOICE');
  assert.ok(result.reasons.some((reason) => reason.code === 'NOTICE_WINDOW_NOT_MET'));
  assert.ok(result.reasons.some((reason) => reason.code === 'MISSING_MATERIAL_INCREASE_CONSENT'));
  assert.ok(result.reasons.some((reason) => reason.code === 'ADD_ON_PARITY_GAP'));
  assert.ok(result.reasons.some((reason) => reason.code === 'SEAT_CAP_REGRESSION'));
});

test('routes recently expired grandfathering windows to review before release', () => {
  const result = evaluateAccount(account('acct-grace-review'), {
    asOf: packet.asOf,
    policy: packet.policy
  });

  assert.equal(result.decision, 'REVIEW_BEFORE_RELEASE');
  assert.ok(result.reasons.some((reason) => reason.code === 'INSIDE_LEGACY_GRACE_PERIOD'));
  assert.ok(
    result.reasons.some((reason) => reason.code === 'MATERIAL_INCREASE_NEEDS_LEGAL_REVIEW')
  );
});

test('portfolio summaries count release, review, and hold decisions deterministically', () => {
  const portfolio = evaluatePortfolio(packet);

  assert.equal(portfolio.summary.totalAccounts, 5);
  assert.equal(portfolio.summary.release, 1);
  assert.equal(portfolio.summary.review, 1);
  assert.equal(portfolio.summary.hold, 3);
  assert.deepEqual(portfolio.summary.heldAccountIds, [
    'acct-lab-price-lock',
    'acct-notice-gap',
    'acct-currency-mismatch'
  ]);
});

test('review artifacts include account decisions and accessible SVG labels', () => {
  const portfolio = evaluatePortfolio(packet);
  const report = buildMarkdownReport(portfolio);
  const svg = buildSvgSummary(portfolio);

  assert.match(report, /Grandfathered Pricing Migration Report/);
  assert.match(report, /CURRENCY_CHANGE_WITHOUT_FINANCE_APPROVAL/);
  assert.match(svg, /Grandfathered pricing migration guard summary/);
  assert.match(svg, /HOLD_INVOICE/);
});
