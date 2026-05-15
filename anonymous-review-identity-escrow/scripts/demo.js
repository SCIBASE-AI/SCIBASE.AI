"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { createIdentityEscrowPacket } = require("../src/identity-escrow");

const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../data/sample-escrow.json"), "utf8")
);
const packet = createIdentityEscrowPacket(fixture);

console.log("Program: " + packet.programId);
console.log("Escrow-ready participants: " + packet.summary.escrowReady + "/" + packet.summary.participants);
console.log("Allowed access grants: " + packet.summary.allowedAccess);
console.log("Denied access grants: " + packet.summary.deniedAccess);
console.log("Deanonymization approved: " + packet.summary.deanonymizationApproved);
console.log("Top action: " + packet.actions[0].message);
console.log("Audit digest: " + packet.auditDigest);
