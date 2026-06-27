import assert from "node:assert/strict";
import { cleanSubmissionPacket, riskySubmissionPacket } from "./src/samplePackets.js";
import { evaluateCoverLetterExportPacket, renderMarkdownReport } from "./src/guard.js";

const cleanResult = evaluateCoverLetterExportPacket(cleanSubmissionPacket);
assert.equal(cleanResult.decision, "RELEASE");
assert.equal(cleanResult.findingCount, 0);
assert.equal(cleanResult.exportReady, true);

const riskyResult = evaluateCoverLetterExportPacket(riskySubmissionPacket);
assert.equal(riskyResult.decision, "HOLD");
assert.equal(riskyResult.exportReady, false);
assert.ok(riskyResult.findings.some((finding) => finding.code === "STALE_COVER_LETTER_HASH"));
assert.ok(riskyResult.findings.some((finding) => finding.code === "MISSING_CORRESPONDING_AUTHOR_APPROVAL"));
assert.ok(riskyResult.findings.some((finding) => finding.code === "PRIVATE_COMMENT_LEAK"));
assert.ok(riskyResult.findings.some((finding) => finding.code === "CLAIM_MISMATCH_CONFLICTS"));

const report = renderMarkdownReport(riskySubmissionPacket, riskyResult);
assert.match(report, /Cover Letter Export Guard Report/);
assert.match(report, /HOLD/);
assert.match(report, /PRIVATE_COMMENT_LEAK/);

console.log("4 cover-letter export guard tests passed");
