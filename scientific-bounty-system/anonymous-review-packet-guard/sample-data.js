const samplePacket = {
  submissionId: "submission-anon-biomarker-042",
  challenge: {
    id: "challenge-biomarker-single-cell",
    title: "Anonymous Biomarker Discovery Challenge",
    anonymityMode: "anonymous",
    sponsorVisibility: "redacted-until-award",
  },
  reviewPacket: {
    id: "review-packet-042",
    anonymityMode: "anonymous",
    variant: "mixed",
    sections: [
      {
        id: "methods-summary",
        kind: "methods",
        text: "Pipeline summary for the blinded biomarker model.",
        redacted: true,
      },
      {
        id: "acknowledgements",
        kind: "acknowledgements",
        text: "We thank the Stanford Genomics Core and @labsolver for sample preparation.",
        redacted: false,
      },
    ],
  },
  artifacts: [
    {
      id: "notebook-main",
      type: "notebook",
      path: "/Users/alice-nguyen/stanford-lab/bounty/submission/main.ipynb",
      requiresRedaction: true,
      redactionReason: "local username and lab path in notebook metadata",
      metadata: {
        author: "Alice Nguyen",
        kernelspec: "python3",
        lastModifiedBy: "alice.nguyen@stanford.edu",
      },
      outputs: [
        "Loaded cohort from /Users/alice-nguyen/private/cohort.csv",
        "Final AUROC 0.83",
      ],
    },
    {
      id: "manuscript-pdf",
      type: "document",
      path: "review/manuscript.pdf",
      requiresRedaction: true,
      redactionReason: "office metadata contains company field",
      metadata: {
        author: "A. Nguyen",
        company: "Stanford University",
        template: "lab-letterhead-v4",
      },
      outputs: [],
    },
    {
      id: "figure-workflow",
      type: "image",
      path: "figures/workflow.png",
      requiresRedaction: true,
      redactionReason: "EXIF GPS/device owner present",
      metadata: {
        exif: {
          gps: "37.4275,-122.1697",
          deviceOwner: "Alice Nguyen",
          serialNumber: "IMG-ALICE-9981",
        },
      },
      outputs: [],
    },
    {
      id: "metrics-json",
      type: "dataset",
      path: "review/metrics.json",
      requiresRedaction: false,
      metadata: {},
      outputs: [],
    },
  ],
  commitHistory: [
    {
      sha: "a1b2c3d",
      authorName: "Alice Nguyen",
      authorEmail: "alice.nguyen@stanford.edu",
      message: "finalize biomarker model",
    },
    {
      sha: "b2c3d4e",
      authorName: "anon-solver",
      authorEmail: "",
      message: "redacted metric export",
    },
  ],
  accessGrants: [
    {
      id: "grant-sponsor-review",
      role: "sponsor",
      principal: "pharma-sponsor",
      packetVariant: "unredacted",
    },
    {
      id: "grant-arbitrator",
      role: "arbitrator",
      principal: "platform-arbitrator",
      packetVariant: "identity-ledger",
    },
  ],
  redactionReceipts: [{ artifactId: "metrics-json", transformDigest: "sha256:metrics-noop" }],
  auditLogs: [
    {
      id: "identity-map",
      containsIdentity: true,
      visibility: "reviewer-visible",
    },
    {
      id: "arbitrator-ledger",
      containsIdentity: true,
      visibility: "arbitrator-only",
    },
  ],
};

module.exports = { samplePacket };
