"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { analyzePacket, analyzePackets, containsSecretLikeText, decisionFromFindings } = require("../src");

test("detects secret-like prompt leakage", () => {
  assert.equal(containsSecretLikeText("bearer abcdefghijklmnopqrstuvwxyz"), true);
  assert.equal(containsSecretLikeText("public benchmark summary"), false);
});

test("releases transparent AI-assisted submissions with human review and provenance", () => {
  const review = analyzePacket({
    id: "clean",
    title: "Clean AI-assisted packet",
    challenge: { title: "Climate bounty" },
    challengePolicy: {
      allowsAiAssistance: true,
      requiresDisclosure: true,
      requiresAiToolList: true,
      approvedTools: ["Codex"],
      allowedToolLicenses: ["MIT"],
      allowedSubmissionLicenses: ["MIT"],
      prohibitedDataClasses: ["private sponsor data"]
    },
    aiAssistance: {
      used: true,
      disclosed: true,
      tools: [{ name: "Codex", type: "coding agent", license: "MIT", disclosed: true }],
      dataClassesUsed: ["public data"],
      privateDataUsed: false,
      promptLeakage: false
    },
    humanReview: { completed: true, reviewer: "lead" },
    generatedComponents: [
      {
        path: "model.py",
        aiGenerated: true,
        disclosed: true,
        humanReviewed: true,
        provenanceHash: "sha256:abc",
        license: "MIT"
      }
    ],
    reproducibility: { commands: "python -m pytest" },
    submission: { includesPrivateData: false, promptLeakage: false }
  });

  assert.equal(review.decision, "RELEASE");
  assert.equal(review.findingCount, 0);
});

test("holds undisclosed AI assistance", () => {
  const review = analyzePacket({
    id: "undisclosed",
    title: "Undisclosed AI",
    challengePolicy: {
      allowsAiAssistance: true,
      requiresDisclosure: true,
      approvedTools: ["Codex"],
      prohibitedDataClasses: []
    },
    aiAssistance: {
      used: true,
      disclosed: false,
      tools: [{ name: "Codex", type: "coding agent", disclosed: false }]
    },
    humanReview: { completed: true },
    generatedComponents: [],
    reproducibility: { commands: "npm test" },
    submission: {}
  });

  assert.equal(review.decision, "HOLD");
  assert.ok(review.findings.some((item) => item.code === "AI_ASSISTANCE_UNDISCLOSED"));
});

test("holds prohibited private data and prompt leakage", () => {
  const review = analyzePacket({
    id: "private",
    title: "Private data AI workflow",
    challengePolicy: {
      allowsAiAssistance: true,
      requiresDisclosure: true,
      prohibitedDataClasses: ["private sponsor data"]
    },
    aiAssistance: {
      used: true,
      disclosed: true,
      dataClassesUsed: ["private sponsor data"],
      privateDataUsed: true,
      promptExcerpt: "api_key=abc1234567890"
    },
    humanReview: { completed: true },
    generatedComponents: [],
    reproducibility: { commands: "python rerun.py" },
    submission: { includesPrivateData: true }
  });

  assert.equal(review.decision, "HOLD");
  assert.ok(review.findings.some((item) => item.code === "PROHIBITED_DATA_SENT_TO_AI"));
  assert.ok(review.findings.some((item) => item.code === "PRIVATE_DATA_IN_AI_WORKFLOW"));
  assert.ok(review.findings.some((item) => item.code === "PROMPT_OR_SECRET_LEAKAGE"));
});

test("routes missing human review and missing provenance to review", () => {
  const review = analyzePacket({
    id: "review",
    title: "Needs review",
    challengePolicy: {
      allowsAiAssistance: true,
      requiresDisclosure: true,
      approvedTools: ["Codex"],
      allowedSubmissionLicenses: ["MIT"]
    },
    aiAssistance: {
      used: true,
      disclosed: true,
      tools: [{ name: "Codex", type: "coding agent", disclosed: true }]
    },
    humanReview: { completed: false },
    generatedComponents: [
      {
        path: "features.py",
        aiGenerated: true,
        disclosed: true,
        humanReviewed: false,
        license: "MIT"
      }
    ],
    reproducibility: { commands: "npm test" },
    submission: {}
  });

  assert.equal(review.decision, "REVIEW");
  assert.ok(review.findings.some((item) => item.code === "MISSING_HUMAN_REVIEW_ATTESTATION"));
  assert.ok(review.findings.some((item) => item.code === "GENERATED_COMPONENT_NOT_HUMAN_REVIEWED"));
  assert.ok(review.findings.some((item) => item.code === "GENERATED_COMPONENT_MISSING_PROVENANCE_HASH"));
});

test("summarizes packet decisions deterministically", () => {
  const report = analyzePackets([
    {
      id: "release",
      title: "Release",
      challengePolicy: { allowsAiAssistance: true, requiresDisclosure: true },
      aiAssistance: { used: false },
      humanReview: {},
      generatedComponents: [],
      reproducibility: {},
      submission: {}
    },
    {
      id: "hold",
      title: "Hold",
      challengePolicy: { allowsAiAssistance: false, requiresDisclosure: true },
      aiAssistance: { used: true, disclosed: true },
      generatedComponents: [],
      reproducibility: { commands: "npm test" },
      submission: {}
    }
  ]);

  assert.equal(report.packetCount, 2);
  assert.equal(report.decisionCounts.RELEASE, 1);
  assert.equal(report.decisionCounts.HOLD, 1);
});

test("decision helper maps critical findings to HOLD", () => {
  assert.equal(decisionFromFindings([{ severity: "critical" }]), "HOLD");
  assert.equal(decisionFromFindings([{ severity: "major" }]), "REVIEW");
  assert.equal(decisionFromFindings([]), "RELEASE");
});
