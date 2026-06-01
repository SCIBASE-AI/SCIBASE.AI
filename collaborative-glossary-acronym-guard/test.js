"use strict";

const assert = require("node:assert/strict");
const {
  evaluateGlossaryAcronymPacket,
  renderMarkdownReport,
  renderSvgSummary
} = require("./index");
const { cleanPacket, riskyPacket } = require("./sample-data");

const clean = evaluateGlossaryAcronymPacket(cleanPacket, { now: "2026-06-01T10:00:00.000Z" });
assert.equal(clean.status, "READY");
assert.equal(clean.findings.length, 0);
assert.equal(clean.exportGlossary.length, 3);

const risky = evaluateGlossaryAcronymPacket(riskyPacket, { now: "2026-06-01T10:00:00.000Z" });
const riskyCodes = new Set(risky.findings.map((finding) => finding.code));
assert.equal(risky.status, "HOLD");
assert.ok(riskyCodes.has("ACRONYM_EXPANSION_COLLISION"));
assert.ok(riskyCodes.has("ACRONYM_FIRST_USE_UNEXPANDED"));
assert.ok(riskyCodes.has("PRIVATE_TERMINOLOGY_NOTE_LEAK"));
assert.ok(riskyCodes.has("LOCKED_SECTION_TERM_EDIT_UNAPPROVED"));
assert.ok(riskyCodes.has("GLOSSARY_EXPORT_INCOMPLETE"));
assert.ok(riskyCodes.has("TERM_DEFINITION_INCOMPLETE"));
assert.ok(riskyCodes.has("UNAPPROVED_GLOSSARY_TERM"));
assert.ok(riskyCodes.has("BLOCKING_TERMINOLOGY_COMMENT"));
assert.ok(riskyCodes.has("STALE_TERM_SECTION_ANCHOR"));

const repeatedRisky = evaluateGlossaryAcronymPacket(riskyPacket, { now: "2026-06-01T10:05:00.000Z" });
assert.equal(risky.fingerprint, repeatedRisky.fingerprint);

const markdown = renderMarkdownReport(risky, riskyPacket);
assert.match(markdown, /Collaborative Glossary and Acronym Guard/);
assert.match(markdown, /ACRONYM_EXPANSION_COLLISION/);
assert.match(markdown, /Export Glossary/);

const svg = renderSvgSummary(risky);
assert.match(svg, /<svg/);
assert.match(svg, /Collaborative glossary guard/);
assert.match(svg, /Status HOLD/);

assert.throws(() => evaluateGlossaryAcronymPacket(null), /expects a packet object/);

console.log("All glossary/acronym guard tests passed.");
