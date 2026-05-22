const assert = require("node:assert/strict");
const { auditSubmissionPacket } = require("./index");

const packet = {
  manuscriptId: "MS-ETHICS-042",
  title: "Multisite sleep biomarker study",
  sections: {
    ethics:
      "The protocol was reviewed by the Northbridge IRB under NB-2026-118. Adult participants provided written consent.",
    dataAvailability:
      "De-identified actigraphy summaries will be deposited in Dryad after publication.",
    codeAvailability:
      "Analysis notebooks are available in the project repository under an MIT license.",
  },
  claims: [
    {
      id: "C1",
      text: "The primary model used 438 participant nights across three sites.",
      evidenceIds: ["D1", "A1"],
      requiresData: true,
      requiresCode: true,
    },
    {
      id: "C2",
      text: "A subgroup analysis was run after sensor dropout review.",
      evidenceIds: ["D2"],
      requiresData: true,
      requiresCode: true,
    },
  ],
  artifacts: [
    {
      id: "D1",
      type: "dataset",
      label: "Dryad sleep summary export",
      access: "embargoed",
      license: "CC-BY-4.0",
      repository: "Dryad",
      availabilityStatement: "Deposited after publication",
    },
    {
      id: "A1",
      type: "analysis-code",
      label: "Primary model notebook",
      access: "public",
      license: "MIT",
      repository: "GitHub",
    },
    {
      id: "D2",
      type: "dataset",
      label: "Sensor dropout review table",
      access: "internal",
      license: "",
      repository: "",
      availabilityStatement: "",
    },
  ],
  participantGroups: ["adults"],
};

const audit = auditSubmissionPacket(packet);

assert.equal(audit.status, "revise");
assert.equal(audit.blockers.length, 2);
assert.match(audit.auditDigest, /^MS-ETHICS-042:revise:/);
assert.deepEqual(
  audit.blockers.map((blocker) => blocker.code).sort(),
  ["MISSING_CODE_EVIDENCE", "PRIVATE_DATASET_WITHOUT_AVAILABILITY"],
);
assert.ok(
  audit.reviewerTasks.some((task) =>
    task.includes("Add a repository or controlled-access statement for Sensor dropout review table"),
  ),
);
assert.ok(
  audit.readySignals.some((signal) =>
    signal.includes("Ethics review and adult consent are present"),
  ),
);

const cleanAudit = auditSubmissionPacket({
  ...packet,
  claims: [packet.claims[0]],
  artifacts: packet.artifacts.slice(0, 2),
});

assert.equal(cleanAudit.status, "ready");
assert.equal(cleanAudit.blockers.length, 0);
assert.ok(cleanAudit.reviewerTasks.length > 0);

console.log("ethics-data-availability-auditor tests passed");
