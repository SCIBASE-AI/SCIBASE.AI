"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { analyzePacket, analyzePackets, decisionFromFindings, hasParticipantMarker } = require("../src");

test("detects participant-like identifiers in collaborative comments", () => {
  assert.equal(hasParticipantMarker("participant 104 withdrew"), true);
  assert.equal(hasParticipantMarker("ethics wording reviewed"), false);
});

test("releases complete ethics and consent export packets", () => {
  const review = analyzePacket({
    id: "clean",
    title: "Clean packet",
    reviewDate: "2026-08-15",
    manuscript: { humanSubjects: true, participantGroups: ["adults"], domain: "public health" },
    ethics: { approvalId: "IRB-1", expiryDate: "2027-01-01" },
    consent: {
      required: true,
      statementPresent: true,
      scope: "journal publication",
      requiredLanguages: ["English"],
      presentLanguages: ["English"]
    },
    collaborativeState: {
      lastEthicsReviewAt: "2026-08-01",
      ethicsSection: { locked: true, pendingEdits: false }
    },
    comments: [{ section: "ethics", resolved: true, text: "ready" }],
    exportTarget: { releaseScope: "journal publication" }
  });

  assert.equal(review.decision, "RELEASE");
  assert.equal(review.findingCount, 0);
});

test("holds human-subjects manuscript without approval or consent", () => {
  const review = analyzePacket({
    id: "missing",
    reviewDate: "2026-08-15",
    manuscript: { humanSubjects: true, participantGroups: ["adults"] },
    ethics: {},
    consent: { required: true, statementPresent: false },
    collaborativeState: {},
    comments: [],
    exportTarget: {}
  });

  assert.equal(review.decision, "HOLD");
  assert.ok(review.findings.some((item) => item.code === "MISSING_ETHICS_APPROVAL_ID"));
  assert.ok(review.findings.some((item) => item.code === "MISSING_CONSENT_STATEMENT"));
});

test("routes vulnerable population and stale review gaps to review", () => {
  const review = analyzePacket({
    id: "review",
    reviewDate: "2026-08-15",
    manuscript: { humanSubjects: true, participantGroups: ["children"] },
    ethics: { approvalId: "REC-1", expiryDate: "2027-01-01", vulnerablePopulationReview: false },
    consent: {
      required: true,
      statementPresent: true,
      scope: "conference abstract",
      requiredLanguages: ["English", "French"],
      presentLanguages: ["English"]
    },
    collaborativeState: {
      lastEthicsReviewAt: "2025-11-01",
      ethicsSection: { locked: true, pendingEdits: false }
    },
    comments: [{ id: "c1", section: "ethics", resolved: false, text: "Need language proof" }],
    exportTarget: { releaseScope: "conference abstract" }
  });

  assert.equal(review.decision, "REVIEW");
  assert.ok(review.findings.some((item) => item.code === "VULNERABLE_POPULATION_REVIEW_MISSING"));
  assert.ok(review.findings.some((item) => item.code === "TRANSLATED_CONSENT_COVERAGE_MISSING"));
  assert.ok(review.findings.some((item) => item.code === "STALE_ETHICS_REVIEW"));
});

test("holds private comments and participant identifiers visible in export", () => {
  const review = analyzePacket({
    id: "private",
    reviewDate: "2026-08-15",
    manuscript: { humanSubjects: true, participantGroups: ["adults"] },
    ethics: { approvalId: "IRB-2", expiryDate: "2027-01-01" },
    consent: {
      required: true,
      statementPresent: true,
      scope: "journal publication",
      requiredLanguages: ["English"],
      presentLanguages: ["English"]
    },
    collaborativeState: {
      lastEthicsReviewAt: "2026-08-01",
      ethicsSection: { locked: true, pendingEdits: true, approvedOverride: false }
    },
    comments: [
      {
        id: "c2",
        section: "ethics",
        private: true,
        exportVisible: true,
        resolved: false,
        text: "participant 104 has DOB: 02/04/1999"
      }
    ],
    exportTarget: { releaseScope: "journal publication" }
  });

  assert.equal(review.decision, "HOLD");
  assert.ok(review.findings.some((item) => item.code === "PRIVATE_ETHICS_COMMENT_VISIBLE_IN_EXPORT"));
  assert.ok(review.findings.some((item) => item.code === "PARTICIPANT_IDENTIFIER_IN_COMMENT"));
});

test("summarizes packet decisions deterministically", () => {
  const report = analyzePackets([
    {
      id: "release",
      manuscript: { humanSubjects: false },
      ethics: {},
      consent: {},
      collaborativeState: {},
      comments: [],
      exportTarget: {}
    },
    {
      id: "hold",
      manuscript: { humanSubjects: true },
      ethics: {},
      consent: { required: true, statementPresent: false },
      collaborativeState: {},
      comments: [],
      exportTarget: {}
    }
  ]);

  assert.equal(report.packetCount, 2);
  assert.equal(report.decisionCounts.RELEASE, 1);
  assert.equal(report.decisionCounts.HOLD, 1);
});

test("decision helper maps severity to release, review, hold", () => {
  assert.equal(decisionFromFindings([]), "RELEASE");
  assert.equal(decisionFromFindings([{ severity: "minor" }]), "REVIEW");
  assert.equal(decisionFromFindings([{ severity: "critical" }]), "HOLD");
});
