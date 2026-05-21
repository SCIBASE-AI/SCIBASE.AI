const assert = require('assert');
const { evaluatePresencePrivacy } = require('./index');
const { buildSafePresenceRoom, riskyPresenceRoom } = require('./sample-data');

function testRiskyRoomIsHeld() {
  const result = evaluatePresencePrivacy(riskyPresenceRoom);
  assert.strictEqual(result.status, 'hold');
  assert(result.blockers.some((blocker) => blocker.includes('viewer_lacks_section_access')));
  assert(result.blockers.some((blocker) => blocker.includes('anonymous_identity_leak')));
  assert(result.blockers.some((blocker) => blocker.includes('locked_sensitive_section_cursor')));
  assert(result.warnings.some((warning) => warning.includes('stale_presence')));
}

function testSafeRoomBroadcastsWithExpiryClear() {
  const result = evaluatePresencePrivacy(buildSafePresenceRoom());
  assert.strictEqual(result.status, 'broadcast');
  assert.strictEqual(result.blockers.length, 0);
  assert.strictEqual(result.warnings.length, 0);
  assert(result.safeBroadcasts > 0);
}

function testAnonymousNameIsMasked() {
  const result = evaluatePresencePrivacy(buildSafePresenceRoom());
  const reviewerEntries = result.sanitizedSnapshots.flatMap((snapshot) =>
    snapshot.entries.filter((entry) => entry.userId === 'u-reviewer'),
  );
  assert(reviewerEntries.length > 0);
  assert(reviewerEntries.every((entry) => entry.displayName === 'Anonymous reviewer A'));
}

function testRestrictedLocationsAreRedacted() {
  const result = evaluatePresencePrivacy(riskyPresenceRoom);
  const publicSnapshot = result.sanitizedSnapshots.find((snapshot) => snapshot.viewerId === 'u-viewer');
  const blocked = publicSnapshot.entries.filter((entry) => entry.status === 'blocked');
  assert(blocked.length >= 2);
  assert(blocked.every((entry) => entry.location.cursorAnchor === ''));
  assert(blocked.every((entry) => entry.location.sectionTitle === 'Restricted section'));
}

function testDigestIsStable() {
  const first = evaluatePresencePrivacy(buildSafePresenceRoom()).auditDigest;
  const second = evaluatePresencePrivacy(buildSafePresenceRoom()).auditDigest;
  assert.strictEqual(first, second);
  assert.strictEqual(first.length, 64);
}

testRiskyRoomIsHeld();
testSafeRoomBroadcastsWithExpiryClear();
testAnonymousNameIsMasked();
testRestrictedLocationsAreRedacted();
testDigestIsStable();

console.log('5 collaborative presence privacy guard tests passed');
