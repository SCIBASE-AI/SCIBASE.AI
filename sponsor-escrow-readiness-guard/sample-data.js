const cleanPacket = {
  batchId: "escrow-batch-clean",
  generatedAt: "2026-06-02",
  challenges: [
    {
      id: "challenge-biomarker-001",
      sponsorId: "pharma-lab-alpha",
      currency: "USD",
      prizeAmount: 150000,
      awardDecisionDate: "2026-09-30",
      escrow: {
        provider: "institutional-escrow",
        evidenceId: "ESCROW-2026-001",
        fundedAmount: 150000,
        verifiedAt: "2026-05-28",
        expiresAt: "2026-10-31",
        authorizedBy: "sponsor-cfo",
        releaseApprovalId: "REL-001"
      },
      payoutSchedule: [
        {
          name: "prototype milestone",
          amount: 50000,
          releaseTrigger: "prototype accepted",
          destinationClass: "solver-team"
        },
        {
          name: "final award",
          amount: 100000,
          releaseTrigger: "final evaluation complete",
          destinationClass: "solver-team"
        }
      ]
    }
  ]
};

const riskyPacket = {
  batchId: "escrow-batch-risky",
  generatedAt: "2026-06-02",
  challenges: [
    {
      id: "challenge-quantum-042",
      sponsorId: "quantum-startup-beta",
      currency: "USD",
      prizeAmount: 80000,
      awardDecisionDate: "2026-08-15",
      escrow: {
        provider: "",
        evidenceId: "",
        fundedAmount: 42000,
        verifiedAt: "2026-03-15",
        expiresAt: "2026-08-01",
        authorizedBy: "",
        releaseApprovalId: ""
      },
      payoutSchedule: [
        {
          name: "proposal winner",
          amount: 10000,
          releaseTrigger: "proposal accepted",
          destinationClass: "solver-team"
        },
        {
          name: "final winner",
          amount: 50000,
          releaseTrigger: "",
          destinationClass: ""
        }
      ]
    },
    {
      id: "challenge-climate-forecast-017",
      sponsorId: "climate-nonprofit-gamma",
      currency: "POINTS",
      prizeAmount: 25000,
      awardDecisionDate: "2026-07-15",
      escrow: {
        provider: "institutional-escrow",
        evidenceId: "ESCROW-2026-017",
        fundedAmount: 25000,
        verifiedAt: "2026-05-20",
        expiresAt: "2026-08-31",
        authorizedBy: "grant-admin",
        releaseApprovalId: "REL-017"
      },
      payoutSchedule: []
    }
  ]
};

module.exports = { cleanPacket, riskyPacket };
