const assert = require("assert");

const {
  auditReuseCredits,
  buildReputationSummary,
  createReuseDigest,
} = require("./index");

const generatedAt = "2026-05-20T13:30:00.000Z";

const assets = [
  {
    id: "dataset-cell-42",
    title: "Single-cell assay benchmark",
    type: "dataset",
    license: "CC-BY-4.0",
    maintainers: [
      { userId: "u-alina", role: "curator", share: 0.7 },
      { userId: "u-minh", role: "validator", share: 0.3 },
    ],
  },
  {
    id: "code-qc-7",
    title: "QC pipeline",
    type: "code",
    license: "MIT",
    maintainers: [{ userId: "u-minh", role: "maintainer", share: 1 }],
  },
];

const reuseEvents = [
  {
    id: "reuse-1",
    assetId: "dataset-cell-42",
    reuserId: "u-labwest",
    projectId: "paper-9",
    citation: "DOI:10.1000/cell42",
    licenseUsed: "CC-BY-4.0",
    evidenceHash: "sha256:evidence-1",
    validationStatus: "replicated",
  },
  {
    id: "reuse-2",
    assetId: "dataset-cell-42",
    reuserId: "u-alina",
    projectId: "paper-self",
    citation: "",
    licenseUsed: "CC0",
    evidenceHash: "sha256:evidence-1",
    validationStatus: "unverified",
  },
  {
    id: "reuse-3",
    assetId: "code-qc-7",
    reuserId: "u-labwest",
    projectId: "paper-10",
    citation: "GitHub release v1.4",
    licenseUsed: "MIT",
    evidenceHash: "sha256:evidence-3",
    validationStatus: "validated",
  },
];

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

test("allocates valid reuse credit and quarantines unsafe evidence", () => {
  const audit = auditReuseCredits({ assets, reuseEvents, generatedAt });

  const valid = audit.reusePackets.find((packet) => packet.eventId === "reuse-1");
  assert(valid, "expected reuse-1 packet");
  assert.strictEqual(valid.decision, "award_credit");
  assert.deepStrictEqual(valid.flags, []);
  assert.deepStrictEqual(valid.creditAllocations, [
    { userId: "u-alina", assetId: "dataset-cell-42", points: 21, reason: "curator reuse credit" },
    { userId: "u-minh", assetId: "dataset-cell-42", points: 9, reason: "validator reuse credit" },
  ]);

  const unsafe = audit.reusePackets.find((packet) => packet.eventId === "reuse-2");
  assert(unsafe, "expected reuse-2 packet");
  assert.strictEqual(unsafe.decision, "quarantine_credit");
  assert(unsafe.flags.includes("MISSING_CITATION"));
  assert(unsafe.flags.includes("LICENSE_MISMATCH"));
  assert(unsafe.flags.includes("SELF_REUSE"));
  assert(unsafe.flags.includes("DUPLICATE_EVIDENCE"));
  assert(unsafe.actions.some((action) => action.includes("Add citation evidence")));
});

test("builds profile-ready reputation summary", () => {
  const audit = auditReuseCredits({ assets, reuseEvents, generatedAt });
  const summary = buildReputationSummary(audit);

  assert.deepStrictEqual(summary.counts, {
    reuseEvents: 3,
    awarded: 2,
    quarantined: 1,
    duplicateEvidence: 1,
    licenseIssues: 1,
  });
  assert.deepStrictEqual(summary.reputationDeltas, [
    { userId: "u-alina", points: 21, badges: ["dataset_reuse_curator"] },
    { userId: "u-minh", points: 24, badges: ["code_reuse_maintainer", "dataset_reuse_validator"] },
  ]);
});

test("creates stable reuse digests", () => {
  const audit = auditReuseCredits({ assets, reuseEvents, generatedAt });
  const packet = audit.reusePackets.find((item) => item.eventId === "reuse-2");

  const first = createReuseDigest(packet);
  const second = createReuseDigest({ ...packet, actions: [...packet.actions] });

  assert.strictEqual(first, second);
  assert.match(first, /^dcrcl_[a-f0-9]{24}$/);
});
