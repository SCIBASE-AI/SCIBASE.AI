"use strict";

const QUOTA_FIELDS = ["seats", "apiCalls", "computeHours", "storageGb"];
const SUPPORT_RANK = { none: 0, standard: 1, professional: 2, enterprise: 3 };

function list(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function finding(code, severity, message, evidence, remediation) {
  return { code, severity, message, evidence, remediation };
}

function normalizePacket(packet) {
  return {
    id: packet.id,
    title: packet.title || "Untitled revenue entitlement packet",
    contract: packet.contract || {},
    delivery: packet.delivery || {}
  };
}

function contractEntitlements(packet) {
  const totals = {
    seats: 0,
    apiCalls: 0,
    computeHours: 0,
    storageGb: 0,
    dataFeeds: new Set(),
    supportTier: "none"
  };

  for (const line of list(packet.contract.lines)) {
    const entitlements = line.entitlements || {};
    for (const field of QUOTA_FIELDS) {
      totals[field] += Number(entitlements[field] || 0);
    }
    for (const feed of list(entitlements.dataFeeds)) {
      totals.dataFeeds.add(normalizeText(feed));
    }
    totals.supportTier = higherSupportTier(totals.supportTier, entitlements.supportTier);
  }

  return {
    ...totals,
    dataFeeds: [...totals.dataFeeds].sort()
  };
}

function deliveryEntitlements(packet) {
  const entitlements = packet.delivery.entitlements || {};
  return {
    seats: Number(entitlements.seats || 0),
    apiCalls: Number(entitlements.apiCalls || 0),
    computeHours: Number(entitlements.computeHours || 0),
    storageGb: Number(entitlements.storageGb || 0),
    dataFeeds: list(entitlements.dataFeeds).map(normalizeText).filter(Boolean).sort(),
    supportTier: normalizeText(entitlements.supportTier || "none")
  };
}

function higherSupportTier(left, right) {
  const a = normalizeText(left || "none");
  const b = normalizeText(right || "none");
  return (SUPPORT_RANK[b] || 0) > (SUPPORT_RANK[a] || 0) ? b : a;
}

function hasEvidenceHash(packet) {
  return /^sha256:[a-f0-9]{64}$/i.test(String(packet.delivery.evidenceHash || ""));
}

function missingFeeds(expected, actual) {
  const present = new Set(actual);
  return expected.filter((feed) => !present.has(feed));
}

function extraFeeds(expected, actual) {
  const allowed = new Set(expected);
  return actual.filter((feed) => !allowed.has(feed));
}

function termStatus(packet) {
  const start = String(packet.contract.termStart || "");
  const end = String(packet.contract.termEnd || "");
  const delivered = String(packet.delivery.deliveryDate || "");
  if (!start || !end || !delivered) return "missing";
  if (delivered < start) return "before_term";
  if (delivered > end) return "after_term";
  return "inside_term";
}

function compareQuotas(expected, actual) {
  return QUOTA_FIELDS.flatMap((field) => {
    if (actual[field] < expected[field]) {
      return [{
        field,
        direction: "under",
        expected: expected[field],
        actual: actual[field],
        delta: expected[field] - actual[field]
      }];
    }
    if (actual[field] > expected[field]) {
      return [{
        field,
        direction: "over",
        expected: expected[field],
        actual: actual[field],
        delta: actual[field] - expected[field]
      }];
    }
    return [];
  });
}

function analyzePacket(input) {
  const packet = normalizePacket(input);
  const expected = contractEntitlements(packet);
  const actual = deliveryEntitlements(packet);
  const findings = [];
  const quotaDeltas = compareQuotas(expected, actual);
  const absentFeeds = missingFeeds(expected.dataFeeds, actual.dataFeeds);
  const unpurchasedFeeds = extraFeeds(expected.dataFeeds, actual.dataFeeds);
  const status = termStatus(packet);

  if (!hasEvidenceHash(packet)) {
    findings.push(finding(
      "DELIVERY_EVIDENCE_HASH_MISSING",
      "major",
      "The entitlement delivery packet lacks a stable evidence hash.",
      { evidenceHash: packet.delivery.evidenceHash || null },
      "Attach a sha256 evidence hash for the provisioning export, acceptance record, or delivery audit packet."
    ));
  }

  if (packet.delivery.acceptedByCustomer !== true) {
    findings.push(finding(
      "CUSTOMER_ACCEPTANCE_MISSING",
      "major",
      "The customer has not accepted or acknowledged entitlement delivery.",
      { acceptedByCustomer: packet.delivery.acceptedByCustomer || false },
      "Capture customer or authorized account-owner acceptance before marking delivery complete."
    ));
  }

  if (packet.delivery.ownerAcknowledged !== true) {
    findings.push(finding(
      "ACCOUNT_OWNER_ACK_MISSING",
      "major",
      "The internal account owner has not acknowledged the provisioned entitlements.",
      { ownerAcknowledged: packet.delivery.ownerAcknowledged || false },
      "Require account-owner acknowledgement before renewal, expansion, or recognition workflows proceed."
    ));
  }

  const underProvisioned = quotaDeltas.filter((item) => item.direction === "under");
  const overProvisioned = quotaDeltas.filter((item) => item.direction === "over");

  if (underProvisioned.length > 0) {
    findings.push(finding(
      "ENTITLEMENT_UNDER_DELIVERED",
      "critical",
      "One or more purchased entitlements are under-provisioned.",
      { deltas: underProvisioned },
      "Provision the purchased seats, quotas, storage, and compute before billing or revenue recognition proceeds."
    ));
  }

  if (overProvisioned.length > 0) {
    findings.push(finding(
      "ENTITLEMENT_OVER_PROVISIONED",
      "major",
      "One or more entitlements exceed the signed contract and need true-up or correction.",
      { deltas: overProvisioned },
      "Either amend the contract with a true-up order or reduce the provisioned entitlement to the purchased limit."
    ));
  }

  if (absentFeeds.length > 0) {
    findings.push(finding(
      "LICENSED_FEED_NOT_ENABLED",
      "critical",
      "A purchased analytics or data feed is not enabled for the customer.",
      { missingFeeds: absentFeeds },
      "Enable the purchased feed or hold revenue workflows until delivery is complete."
    ));
  }

  if (unpurchasedFeeds.length > 0) {
    findings.push(finding(
      "UNPURCHASED_FEED_ENABLED",
      "major",
      "An analytics or data feed is enabled without a matching contract line.",
      { extraFeeds: unpurchasedFeeds },
      "Disable the unpurchased feed or attach a signed amendment before renewal or usage reporting."
    ));
  }

  const expectedRank = SUPPORT_RANK[expected.supportTier] || 0;
  const actualRank = SUPPORT_RANK[actual.supportTier] || 0;
  if (actualRank < expectedRank) {
    findings.push(finding(
      "SUPPORT_TIER_UNDER_DELIVERED",
      "critical",
      "The provisioned support tier is below the signed contract tier.",
      { expected: expected.supportTier, actual: actual.supportTier },
      "Upgrade the support entitlement or hold billing and recognition until support delivery matches the contract."
    ));
  } else if (actualRank > expectedRank) {
    findings.push(finding(
      "SUPPORT_TIER_OVER_PROVISIONED",
      "major",
      "The provisioned support tier exceeds the signed contract tier.",
      { expected: expected.supportTier, actual: actual.supportTier },
      "Confirm a commercial amendment or reduce the support tier before true-up reporting."
    ));
  }

  if (status !== "inside_term") {
    findings.push(finding(
      "DELIVERY_DATE_OUTSIDE_CONTRACT_TERM",
      status === "missing" ? "major" : "critical",
      "The delivery date is missing or outside the active contract term.",
      {
        termStart: packet.contract.termStart || null,
        termEnd: packet.contract.termEnd || null,
        deliveryDate: packet.delivery.deliveryDate || null,
        status
      },
      "Align delivery with the active contract term or execute a renewal/amendment before revenue workflows proceed."
    ));
  }

  if (
    findings.length > 0 &&
    packet.contract.revenueRecognitionReady === true &&
    packet.contract.revenueHold !== true
  ) {
    findings.push(finding(
      "REVENUE_RECOGNITION_NOT_HELD_FOR_DELIVERY_RISK",
      "critical",
      "Revenue recognition remains ready while entitlement-delivery findings are unresolved.",
      {
        revenueRecognitionReady: packet.contract.revenueRecognitionReady,
        revenueHold: packet.contract.revenueHold || false
      },
      "Set a revenue hold until delivery evidence, quota parity, support tier, and term checks pass."
    ));
  }

  const decision = decisionFor(findings);
  return {
    id: packet.id,
    title: packet.title,
    accountId: packet.contract.accountId || null,
    decision,
    expected,
    actual,
    findings,
    recommendedActions: buildRecommendedActions(decision, findings)
  };
}

function decisionFor(findings) {
  if (findings.some((item) => item.severity === "critical")) return "HOLD_REVENUE";
  if (findings.some((item) => item.severity === "major")) return "REVIEW_REVENUE";
  return "RELEASE_REVENUE";
}

function buildRecommendedActions(decision, findings) {
  if (decision === "RELEASE_REVENUE") {
    return ["Allow billing, renewal, expansion, and revenue-recognition workflows to proceed with the attached delivery evidence."];
  }

  const actions = [
    "Attach entitlement findings to the revenue operations review packet.",
    "Reconcile contract lines against provisioned seats, quotas, feeds, and support tier.",
    "Regenerate delivery evidence after provisioning or commercial amendments are complete."
  ];

  if (findings.some((item) => item.code === "REVENUE_RECOGNITION_NOT_HELD_FOR_DELIVERY_RISK")) {
    actions.unshift("Place revenue recognition and renewal automation on hold.");
  }

  return actions;
}

function analyzeEntitlementDeliveryPackets(packets) {
  const results = list(packets).map(analyzePacket);
  const counts = results.reduce((acc, item) => {
    acc[item.decision] = (acc[item.decision] || 0) + 1;
    return acc;
  }, { RELEASE_REVENUE: 0, REVIEW_REVENUE: 0, HOLD_REVENUE: 0 });

  return {
    generatedAt: new Date().toISOString(),
    totalPackets: results.length,
    counts,
    results
  };
}

module.exports = {
  analyzePacket,
  analyzeEntitlementDeliveryPackets,
  contractEntitlements,
  deliveryEntitlements,
  compareQuotas,
  hasEvidenceHash,
  termStatus
};
