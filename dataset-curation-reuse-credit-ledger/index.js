const crypto = require("crypto");

const BASE_POINTS = {
  replicated: 30,
  validated: 15,
  unverified: 5,
};

function auditReuseCredits({ assets, reuseEvents, generatedAt = new Date().toISOString() }) {
  if (!Array.isArray(assets)) {
    throw new Error("assets must be an array");
  }
  if (!Array.isArray(reuseEvents)) {
    throw new Error("reuseEvents must be an array");
  }

  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const seenEvidenceHashes = new Set();
  const reusePackets = reuseEvents.map((event) => {
    const asset = assetById.get(event.assetId);
    if (!asset) {
      throw new Error(`Unknown asset '${event.assetId}'`);
    }
    const packet = evaluateReuseEvent(event, asset, seenEvidenceHashes, generatedAt);
    if (event.evidenceHash) {
      seenEvidenceHashes.add(event.evidenceHash);
    }
    return packet;
  });

  const audit = {
    generatedAt,
    reusePackets,
  };
  audit.reputationSummary = buildReputationSummary(audit);
  return audit;
}

function evaluateReuseEvent(event, asset, seenEvidenceHashes, generatedAt) {
  const flags = [];
  if (!String(event.citation || "").trim()) {
    flags.push("MISSING_CITATION");
  }
  if (event.licenseUsed !== asset.license) {
    flags.push("LICENSE_MISMATCH");
  }
  const maintainerIds = new Set((asset.maintainers || []).map((maintainer) => maintainer.userId));
  if (maintainerIds.has(event.reuserId)) {
    flags.push("SELF_REUSE");
  }
  if (event.evidenceHash && seenEvidenceHashes.has(event.evidenceHash)) {
    flags.push("DUPLICATE_EVIDENCE");
  }

  const decision = flags.length === 0 ? "award_credit" : "quarantine_credit";
  const creditAllocations = decision === "award_credit"
    ? allocateCredits(asset, event.validationStatus)
    : [];
  const packet = {
    eventId: event.id,
    assetId: asset.id,
    assetTitle: asset.title,
    assetType: asset.type,
    generatedAt,
    decision,
    flags,
    creditAllocations,
    actions: buildActions(flags, event, asset),
  };
  packet.reuseDigest = createReuseDigest(packet);
  return packet;
}

function allocateCredits(asset, validationStatus) {
  const base = BASE_POINTS[validationStatus] || BASE_POINTS.unverified;
  return (asset.maintainers || []).map((maintainer) => ({
    userId: maintainer.userId,
    assetId: asset.id,
    points: Math.round(base * maintainer.share),
    reason: `${maintainer.role} reuse credit`,
  }));
}

function buildActions(flags, event, asset) {
  if (flags.length === 0) {
    return ["Publish reuse credit to curator profiles"];
  }
  const actions = [];
  if (flags.includes("MISSING_CITATION")) {
    actions.push(`Add citation evidence for ${event.id}`);
  }
  if (flags.includes("LICENSE_MISMATCH")) {
    actions.push(`Resolve ${event.licenseUsed} vs ${asset.license} license mismatch`);
  }
  if (flags.includes("SELF_REUSE")) {
    actions.push("Require independent reuse evidence before awarding curator reputation");
  }
  if (flags.includes("DUPLICATE_EVIDENCE")) {
    actions.push(`Deduplicate evidence hash ${event.evidenceHash}`);
  }
  return actions;
}

function buildReputationSummary(audit) {
  const packets = audit.reusePackets || [];
  const counts = {
    reuseEvents: packets.length,
    awarded: packets.filter((packet) => packet.decision === "award_credit").length,
    quarantined: packets.filter((packet) => packet.decision === "quarantine_credit").length,
    duplicateEvidence: countFlag(packets, "DUPLICATE_EVIDENCE"),
    licenseIssues: countFlag(packets, "LICENSE_MISMATCH"),
  };
  const pointsByUser = new Map();
  const badgesByUser = new Map();
  for (const packet of packets) {
    for (const allocation of packet.creditAllocations) {
      pointsByUser.set(allocation.userId, (pointsByUser.get(allocation.userId) || 0) + allocation.points);
      if (!badgesByUser.has(allocation.userId)) {
        badgesByUser.set(allocation.userId, new Set());
      }
      badgesByUser.get(allocation.userId).add(`${packet.assetType}_reuse_${roleFromReason(allocation.reason)}`);
    }
  }

  const reputationDeltas = [...pointsByUser.keys()].sort().map((userId) => ({
    userId,
    points: pointsByUser.get(userId),
    badges: [...(badgesByUser.get(userId) || [])].sort(),
  }));

  return { counts, reputationDeltas };
}

function createReuseDigest(packet) {
  const stableFacts = {
    eventId: packet.eventId,
    assetId: packet.assetId,
    decision: packet.decision,
    flags: [...(packet.flags || [])].sort(),
    creditAllocations: [...(packet.creditAllocations || [])].sort((left, right) =>
      `${left.userId}:${left.assetId}`.localeCompare(`${right.userId}:${right.assetId}`)
    ),
  };
  return `dcrcl_${crypto.createHash("sha256").update(JSON.stringify(stableFacts)).digest("hex").slice(0, 24)}`;
}

function countFlag(packets, flag) {
  return packets.filter((packet) => packet.flags.includes(flag)).length;
}

function roleFromReason(reason) {
  return String(reason).split(" ")[0];
}

module.exports = {
  auditReuseCredits,
  buildReputationSummary,
  createReuseDigest,
};
