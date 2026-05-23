const assert = require("node:assert/strict");

const {
  evaluateVendorDpaRequest,
  summarizeVendorPortfolio,
} = require("./index");

const policy = {
  allowedRegions: ["US", "EU", "CA"],
  maxSecurityReviewAgeDays: 365,
  maxBreachNoticeHours: 72,
  restrictedDataClasses: ["phi", "student_records", "human_subjects"],
  requiredRestrictedAgreements: {
    phi: "baa",
    student_records: "dua",
    human_subjects: "dua",
  },
};

const approvedRequest = {
  id: "vendor-zenith-archive",
  vendorName: "Zenith Archive",
  owner: "Enterprise Integrations",
  region: "EU",
  dataClasses: ["publications", "student_records"],
  dpa: { status: "active", signedAt: "2026-01-12" },
  agreements: ["dpa", "dua", "scc"],
  subprocessors: [
    { name: "Northwind Storage", approved: true, region: "EU" },
    { name: "Atlas Queue", approved: true, region: "US" },
  ],
  breachNoticeHours: 48,
  securityReview: { completedAt: "2026-03-01", reviewer: "Security Office" },
  requestedAt: "2026-05-23",
};

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

test("approves vendors with active DPA, required agreements, approved subprocessors, and current review", () => {
  const decision = evaluateVendorDpaRequest(approvedRequest, policy);

  assert.equal(decision.status, "approve_vendor");
  assert.deepEqual(decision.blockers, []);
  assert.equal(decision.riskScore, 0);
  assert.equal(decision.webhookEvent.type, "enterprise.vendor_dpa.approved");
  assert.match(decision.auditDigest, /^[a-f0-9]{64}$/);
});

test("holds vendors when DPA, restricted-data, subprocessor, residency, SLA, review, and owner controls fail", () => {
  const decision = evaluateVendorDpaRequest(
    {
      ...approvedRequest,
      id: "vendor-risky-lab-ai",
      vendorName: "Risky Lab AI",
      owner: "",
      region: "APAC",
      dataClasses: ["phi", "student_records"],
      dpa: { status: "expired" },
      agreements: ["dpa"],
      subprocessors: [
        { name: "Shadow Analytics", approved: false, region: "APAC" },
      ],
      breachNoticeHours: 120,
      securityReview: { completedAt: "2024-01-01", reviewer: "" },
    },
    policy
  );

  assert.equal(decision.status, "hold_vendor");
  assert.equal(decision.riskScore, 7);
  assert.deepEqual(
    decision.blockers.map((blocker) => blocker.code),
    [
      "missing_owner",
      "dpa_not_active",
      "region_not_allowed",
      "missing_baa_for_phi",
      "missing_dua_for_student_records",
      "unapproved_subprocessor",
      "breach_notice_sla_exceeded",
      "security_review_stale",
    ]
  );
  assert.equal(decision.webhookEvent.type, "enterprise.vendor_dpa.hold");
});

test("marks vendors for legal review when controls pass but subprocessor regions need SCC coverage", () => {
  const decision = evaluateVendorDpaRequest(
    {
      ...approvedRequest,
      id: "vendor-crossborder-notebook",
      vendorName: "Crossborder Notebook",
      agreements: ["dpa", "dua"],
      subprocessors: [
        { name: "Regional Search", approved: true, region: "APAC" },
      ],
    },
    policy
  );

  assert.equal(decision.status, "needs_legal_review");
  assert.deepEqual(decision.blockers, []);
  assert.deepEqual(decision.warnings.map((warning) => warning.code), [
    "subprocessor_region_requires_scc",
  ]);
  assert.equal(decision.webhookEvent.type, "enterprise.vendor_dpa.review");
});

test("summarizes portfolio decisions for admin dashboard and export packets", () => {
  const summary = summarizeVendorPortfolio(
    [
      approvedRequest,
      {
        ...approvedRequest,
        id: "vendor-crossborder-notebook",
        vendorName: "Crossborder Notebook",
        agreements: ["dpa", "dua"],
        subprocessors: [
          { name: "Regional Search", approved: true, region: "APAC" },
        ],
      },
      {
        ...approvedRequest,
        id: "vendor-risky-lab-ai",
        vendorName: "Risky Lab AI",
        owner: "",
        dpa: { status: "missing" },
        dataClasses: ["phi"],
        agreements: [],
        subprocessors: [
          { name: "Shadow Analytics", approved: false, region: "APAC" },
        ],
        breachNoticeHours: 96,
        securityReview: { completedAt: "2024-01-01" },
      },
    ],
    policy
  );

  assert.equal(summary.totalVendors, 3);
  assert.deepEqual(summary.byStatus, {
    approve_vendor: 1,
    needs_legal_review: 1,
    hold_vendor: 1,
  });
  assert.deepEqual(summary.adminActions.map((action) => action.vendorId), [
    "vendor-risky-lab-ai",
    "vendor-crossborder-notebook",
  ]);
  assert.match(summary.auditDigest, /^[a-f0-9]{64}$/);
});
