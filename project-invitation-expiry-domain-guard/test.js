"use strict";

const assert = require("assert");
const { createInvitationReviewPacket, domainOf, isExpired } = require("./index");
const { invitationPacket } = require("./sample-data");

function runTests() {
  assert.strictEqual(domainOf("ana@university.edu"), "university.edu");
  assert.strictEqual(isExpired(invitationPacket.invitations[1], invitationPacket.evaluatedAt), true);

  const packet = createInvitationReviewPacket(invitationPacket);
  assert.deepStrictEqual(packet.readyInvitations, [], "duplicate invitation should hold even otherwise valid invite");
  assert.strictEqual(packet.heldInvitations.length, 4, "all risky invitations should be held in sample data");

  const vendor = packet.evaluations.find((invite) => invite.inviteId === "inv-002");
  assert(vendor.holds.includes("expired-invitation"), "expired invite must be held");
  assert(vendor.holds.includes("domain-not-allowed"), "unknown domain must be held");
  assert(vendor.holds.includes("sensitive-role-requested"), "sensitive role must require approval");

  const inactive = packet.evaluations.find((invite) => invite.inviteId === "inv-004");
  assert(inactive.holds.includes("inactive-inviter"), "inactive inviter must be held");
  assert(inactive.remediation.some((item) => item.includes("active owner")), "inactive inviter remediation should be actionable");
}

if (require.main === module) {
  runTests();
  console.log("project invitation expiry/domain guard tests passed");
}

module.exports = { runTests };
