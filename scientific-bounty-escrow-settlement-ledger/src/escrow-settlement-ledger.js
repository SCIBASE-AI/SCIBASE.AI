"use strict";

const crypto = require("node:crypto");

const DEFAULT_SECRET = "scibase-scientific-bounty-escrow-demo-secret";
const PAYABLE_DECISIONS = new Set(["approved", "accepted"]);
const CLOSED_DISPUTE_STATUSES = new Set(["none", "resolved"]);
const BPS_DENOMINATOR = 10000;

function evaluateEscrowBook(book, options = {}) {
  if (!book || typeof book !== "object") {
    throw new Error("An escrow book object is required.");
  }

  const sponsors = indexBy(book.sponsors || [], "sponsorId");
  const challenges = (book.challenges || []).map((challenge) => evaluateChallenge(challenge, sponsors, book.asOf));
  const summary = summarizeChallenges(challenges);
  const adminMetrics = buildAdminMetrics(challenges, sponsors);
  const settlementPackets = challenges.flatMap((challenge) => challenge.settlementPackets);
  const ledgerEvents = challenges.map((challenge) =>
    signLedgerEvent(
      {
        type: "scientific_bounty.escrow.evaluated",
        asOf: book.asOf,
        challengeId: challenge.challengeId,
        sponsorId: challenge.sponsorId,
        settlementDecision: challenge.settlementDecision,
        payableNow: challenge.payableNow,
        heldAmount: challenge.heldAmount,
        shortfall: challenge.shortfall,
        ipReleaseState: challenge.ipReleaseState
      },
      options.secret || DEFAULT_SECRET
    )
  );

  return {
    schemaVersion: "2026-05-16.scientific-bounty-escrow-settlement-ledger.v1",
    asOf: book.asOf,
    marketplace: book.marketplace || null,
    summary,
    adminMetrics,
    challenges,
    settlementPackets,
    ledgerEvents
  };
}

function evaluateChallenge(challenge, sponsors, asOf) {
  const sponsor = sponsors.get(challenge.sponsorId);
  const obligations = [];
  const payableMilestones = getPayableMilestones(challenge);
  const payableTotal = sum(payableMilestones.map((milestone) => milestone.amount));
  const escrowAvailable = sponsor ? sponsor.clearedEscrow : 0;
  const disputeOpen = !CLOSED_DISPUTE_STATUSES.has(challenge.disputeStatus);
  const shortfall = Math.max(0, payableTotal - escrowAvailable);

  if (!sponsor) {
    obligations.push(blocker("funding-account", "Missing sponsor escrow account", "Create or link a sponsor escrow account before settlement."));
  }

  if (shortfall > 0) {
    obligations.push(
      blocker(
        "escrow-funding",
        `Escrow is underfunded by ${shortfall}`,
        "Collect cleared sponsor funds before releasing any prize settlement."
      )
    );
  }

  if (disputeOpen) {
    obligations.push(
      hold(
        "appeal-window",
        `Settlement held while dispute status is ${challenge.disputeStatus}`,
        "Keep funds and IP release locked until the appeal or dispute is resolved."
      )
    );
  }

  const teamResults = [];
  const settlementPackets = [];

  for (const milestone of payableMilestones) {
    const team = findTeam(challenge, milestone.winningTeamId);

    if (!team) {
      obligations.push(
        blocker(
          "payout-routing",
          `Missing winning team ${milestone.winningTeamId} for ${milestone.label}`,
          "Attach the winning solver team before settlement."
        )
      );
      continue;
    }

    const routeCheck = evaluateRoutes(team, milestone.amount);
    teamResults.push({ teamId: team.teamId, milestoneId: milestone.milestoneId, ...routeCheck });

    if (!routeCheck.valid) {
      obligations.push(
        blocker(
          "payout-routing",
          `${team.name} payout routes do not sum to 100%`,
          "Fix route basis points before settlement packet generation."
        )
      );
      continue;
    }

    const incompleteRoutes = team.payoutRoutes.filter((route) => route.profileStatus !== "complete");
    if (incompleteRoutes.length > 0) {
      obligations.push(
        hold(
          "payee-profile",
          `${team.name} has ${incompleteRoutes.length} incomplete payout profile(s)`,
          "Collect payout profile evidence before releasing funds."
        )
      );
    }

    settlementPackets.push(buildSettlementPacket(challenge, milestone, team, routeCheck.routes));
  }

  const counts = countObligations(obligations);
  const settlementDecision = decideSettlement(counts, shortfall);
  const payableNow = settlementDecision === "ready" ? payableTotal : 0;
  const heldAmount = settlementDecision === "held" ? payableTotal : 0;
  const ipReleaseState = determineIpReleaseState(challenge, settlementDecision, payableTotal);

  return {
    challengeId: challenge.challengeId,
    title: challenge.title,
    sponsorId: challenge.sponsorId,
    sponsorName: sponsor ? sponsor.name : null,
    fundingAccountId: challenge.fundingAccountId,
    prizePool: challenge.prizePool,
    escrowAvailable,
    pendingDeposits: sponsor ? sponsor.pendingDeposits : 0,
    payableTotal,
    payableNow,
    heldAmount,
    shortfall,
    settlementDecision,
    ipPolicy: challenge.ipPolicy,
    ipReleaseState,
    disputeStatus: challenge.disputeStatus,
    appealWindowClosesAt: challenge.appealWindowClosesAt,
    obligationCounts: counts,
    obligations,
    payableMilestones: payableMilestones.map((milestone) => ({
      milestoneId: milestone.milestoneId,
      label: milestone.label,
      awardType: milestone.awardType,
      amount: milestone.amount,
      winningTeamId: milestone.winningTeamId
    })),
    teamResults,
    settlementPackets: settlementDecision === "ready" ? settlementPackets : []
  };
}

function getPayableMilestones(challenge) {
  return (challenge.milestones || []).filter(
    (milestone) => PAYABLE_DECISIONS.has(milestone.decisionStatus) && milestone.settlementStatus !== "settled"
  );
}

function evaluateRoutes(team, amount) {
  const totalBps = sum(team.payoutRoutes.map((route) => route.shareBps));
  const routes = team.payoutRoutes.map((route) => ({
    routeId: route.routeId,
    payee: route.payee,
    routeType: route.routeType,
    shareBps: route.shareBps,
    amount: roundCurrency((amount * route.shareBps) / BPS_DENOMINATOR),
    profileStatus: route.profileStatus
  }));

  return {
    valid: totalBps === BPS_DENOMINATOR,
    totalBps,
    routes
  };
}

function buildSettlementPacket(challenge, milestone, team, routes) {
  const routeTotal = roundCurrency(sum(routes.map((route) => route.amount)));
  const packet = {
    packetId: `${challenge.challengeId}:${milestone.milestoneId}:${team.teamId}`,
    challengeId: challenge.challengeId,
    milestoneId: milestone.milestoneId,
    teamId: team.teamId,
    teamName: team.name,
    institution: team.institution,
    awardType: milestone.awardType,
    amount: milestone.amount,
    routeTotal,
    ipReleaseAfterSettlement: true,
    routes
  };

  return {
    ...packet,
    packetDigest: digest(packet)
  };
}

function decideSettlement(counts, shortfall) {
  if (counts.blocker > 0 || shortfall > 0) {
    return "blocked";
  }

  if (counts.hold > 0) {
    return "held";
  }

  return "ready";
}

function determineIpReleaseState(challenge, settlementDecision, payableTotal) {
  if (payableTotal === 0) {
    return "no_payable_award";
  }

  if (settlementDecision === "ready") {
    if (challenge.ipPolicy === "open-after-award") {
      return "open_release_after_settlement";
    }

    return "transfer_after_settlement";
  }

  if (settlementDecision === "held") {
    return "locked_pending_hold_resolution";
  }

  return "locked_pending_funding_or_routes";
}

function summarizeChallenges(challenges) {
  const summary = {
    totalChallenges: challenges.length,
    ready: 0,
    held: 0,
    blocked: 0,
    payableNow: 0,
    heldAmount: 0,
    shortfall: 0,
    settlementPacketCount: 0
  };

  for (const challenge of challenges) {
    summary.ready += challenge.settlementDecision === "ready" ? 1 : 0;
    summary.held += challenge.settlementDecision === "held" ? 1 : 0;
    summary.blocked += challenge.settlementDecision === "blocked" ? 1 : 0;
    summary.payableNow += challenge.payableNow;
    summary.heldAmount += challenge.heldAmount;
    summary.shortfall += challenge.shortfall;
    summary.settlementPacketCount += challenge.settlementPackets.length;
  }

  return summary;
}

function buildAdminMetrics(challenges, sponsors) {
  const bySponsor = {};

  for (const sponsor of sponsors.values()) {
    bySponsor[sponsor.sponsorId] = {
      sponsorName: sponsor.name,
      clearedEscrow: sponsor.clearedEscrow,
      pendingDeposits: sponsor.pendingDeposits,
      payableNow: 0,
      heldAmount: 0,
      shortfall: 0,
      challengeCount: 0
    };
  }

  for (const challenge of challenges) {
    bySponsor[challenge.sponsorId] ||= {
      sponsorName: challenge.sponsorName,
      clearedEscrow: challenge.escrowAvailable,
      pendingDeposits: challenge.pendingDeposits,
      payableNow: 0,
      heldAmount: 0,
      shortfall: 0,
      challengeCount: 0
    };
    bySponsor[challenge.sponsorId].payableNow += challenge.payableNow;
    bySponsor[challenge.sponsorId].heldAmount += challenge.heldAmount;
    bySponsor[challenge.sponsorId].shortfall += challenge.shortfall;
    bySponsor[challenge.sponsorId].challengeCount += 1;
  }

  return {
    bySponsor,
    settlementQueue: challenges
      .filter((challenge) => challenge.settlementDecision !== "ready")
      .map((challenge) => ({
        challengeId: challenge.challengeId,
        decision: challenge.settlementDecision,
        shortfall: challenge.shortfall,
        heldAmount: challenge.heldAmount,
        obligations: challenge.obligations.map((obligation) => obligation.title)
      }))
  };
}

function blocker(scope, title, remediation) {
  return {
    severity: "blocker",
    scope,
    title,
    remediation
  };
}

function hold(scope, title, remediation) {
  return {
    severity: "hold",
    scope,
    title,
    remediation
  };
}

function countObligations(obligations) {
  return obligations.reduce(
    (counts, obligation) => {
      counts[obligation.severity] += 1;
      return counts;
    },
    { blocker: 0, hold: 0 }
  );
}

function signLedgerEvent(payload, secret = DEFAULT_SECRET) {
  const canonicalPayload = stableStringify(payload);
  const digestValue = crypto.createHash("sha256").update(canonicalPayload).digest("hex");
  const signature = crypto.createHmac("sha256", secret).update(digestValue).digest("hex");

  return {
    ...payload,
    digest: digestValue,
    signature
  };
}

function digest(payload) {
  return crypto.createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function indexBy(items, field) {
  return new Map(items.map((item) => [item[field], item]));
}

function findTeam(challenge, teamId) {
  return (challenge.teams || []).find((team) => team.teamId === teamId);
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function roundCurrency(value) {
  return Math.round(value * 100) / 100;
}

module.exports = {
  evaluateEscrowBook,
  evaluateChallenge,
  evaluateRoutes,
  signLedgerEvent,
  stableStringify,
  digest
};
