const STALE_LOCK_MINUTES = 30;

function minutesBetween(a, b) {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 60000);
}

function isPast(value, now) {
  return value ? new Date(value).getTime() <= new Date(now).getTime() : false;
}

function evaluateSection(section, now) {
  const findings = [];
  const actions = [];

  if (!section.lockedBy) {
    return {
      id: section.id,
      title: section.title,
      decision: "allow-edit",
      findings,
      actions: [`grant ${section.requestedBy} ${section.requestedAction}`]
    };
  }

  const staleMinutes = section.lastHeartbeatAt
    ? minutesBetween(section.lastHeartbeatAt, now)
    : STALE_LOCK_MINUTES + 1;
  const staleLock = staleMinutes >= STALE_LOCK_MINUTES;
  const freezeActive = section.freezeUntil && !isPast(section.freezeUntil, now);
  const ownerRequest = section.requestedBy === section.lockedBy || section.requesterRole === "section-owner";
  const reviewerOverride = section.requestedAction === "reviewer-override" && section.requesterRole === "reviewer";

  if (freezeActive) {
    findings.push(`freeze window active until ${section.freezeUntil}`);
  }
  if (section.pendingSuggestions > 0) {
    findings.push(`${section.pendingSuggestions} pending suggestions need resolution`);
  }
  if (staleLock) {
    findings.push(`lock heartbeat stale by ${staleMinutes} minutes`);
  }
  if (!ownerRequest && !reviewerOverride) {
    findings.push(`requester ${section.requestedBy} cannot bypass ${section.lockedBy}'s lock`);
  }

  if (freezeActive || section.pendingSuggestions > 0 || (!ownerRequest && !reviewerOverride && !staleLock)) {
    actions.push("keep section locked");
    actions.push("route request to lock owner or reviewer queue");
    return {
      id: section.id,
      title: section.title,
      decision: "block-conflicting-edit",
      findings,
      actions
    };
  }

  if (staleLock && ownerRequest) {
    actions.push("release stale lock");
    actions.push(`grant ${section.requestedBy} ${section.requestedAction}`);
    return {
      id: section.id,
      title: section.title,
      decision: "release-stale-lock",
      findings,
      actions
    };
  }

  if (reviewerOverride) {
    actions.push("record reviewer override");
    actions.push("preserve lock audit trail before edit");
    return {
      id: section.id,
      title: section.title,
      decision: "allow-reviewed-override",
      findings,
      actions
    };
  }

  actions.push(`grant ${section.requestedBy} ${section.requestedAction}`);
  return {
    id: section.id,
    title: section.title,
    decision: "allow-owner-edit",
    findings,
    actions
  };
}

function evaluateLocks(sections, now) {
  const decisions = sections.map((section) => evaluateSection(section, now));
  const summary = decisions.reduce(
    (acc, decision) => {
      acc.total += 1;
      acc[decision.decision] = (acc[decision.decision] || 0) + 1;
      acc.findingCount += decision.findings.length;
      return acc;
    },
    { total: 0, findingCount: 0 }
  );

  return {
    generatedAt: now,
    summary,
    decisions
  };
}

module.exports = { STALE_LOCK_MINUTES, evaluateSection, evaluateLocks };
