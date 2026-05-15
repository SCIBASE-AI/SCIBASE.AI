const crypto = require("node:crypto");

const SUCCESS_STATUS_MIN = 200;
const SUCCESS_STATUS_MAX = 299;

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function digest(value) {
  return `sha256:${crypto.createHash("sha256").update(stableStringify(value)).digest("hex")}`;
}

function buildDestinationIndex(manifest) {
  return new Map((manifest.destinations || []).map((destination) => [destination.id, destination]));
}

function isSuccess(statusCode) {
  return statusCode >= SUCCESS_STATUS_MIN && statusCode <= SUCCESS_STATUS_MAX;
}

function isRetryableStatus(statusCode) {
  return statusCode === 408 || statusCode === 425 || statusCode === 429 || statusCode >= 500;
}

function assertIsoDate(value, label, errors) {
  if (!value || Number.isNaN(Date.parse(value))) {
    errors.push(`${label} must be an ISO timestamp`);
  }
}

function validateManifest(manifest) {
  const errors = [];
  if (manifest.schemaVersion !== "enterprise-webhook-ledger.v1") {
    errors.push("schemaVersion must be enterprise-webhook-ledger.v1");
  }
  if (!manifest.organization?.id) {
    errors.push("organization.id is required");
  }
  assertIsoDate(manifest.evaluationTime, "evaluationTime", errors);

  const destinationIds = new Set();
  for (const destination of manifest.destinations || []) {
    if (!destination.id) {
      errors.push("every destination requires an id");
    }
    if (destinationIds.has(destination.id)) {
      errors.push(`duplicate destination id: ${destination.id}`);
    }
    destinationIds.add(destination.id);
    if (!destination.endpoint?.startsWith("https://")) {
      errors.push(`destination ${destination.id} requires an https endpoint`);
    }
    if (!destination.signingKeyId) {
      errors.push(`destination ${destination.id} requires a signingKeyId`);
    }
    if (!Number.isInteger(destination.maxAttempts) || destination.maxAttempts < 1) {
      errors.push(`destination ${destination.id} requires maxAttempts >= 1`);
    }
  }

  for (const event of manifest.events || []) {
    if (!event.id || !event.type) {
      errors.push("every event requires id and type");
    }
    assertIsoDate(event.occurredAt, `${event.id}.occurredAt`, errors);
    for (const delivery of event.deliveries || []) {
      if (!destinationIds.has(delivery.destinationId)) {
        errors.push(`event ${event.id} references missing destination ${delivery.destinationId}`);
      }
      for (const attempt of delivery.attempts || []) {
        assertIsoDate(attempt.attemptedAt, `${event.id}.${delivery.destinationId}.attemptedAt`, errors);
        if (!Number.isInteger(attempt.statusCode)) {
          errors.push(`event ${event.id}.${delivery.destinationId} attempt requires integer statusCode`);
        }
      }
      if (delivery.approvedForReplayAt) {
        assertIsoDate(delivery.approvedForReplayAt, `${event.id}.${delivery.destinationId}.approvedForReplayAt`, errors);
      }
    }
  }

  return errors;
}

function buildEnvelope(manifest, event, destination) {
  const body = {
    organizationId: manifest.organization.id,
    destinationId: destination.id,
    eventId: event.id,
    eventType: event.type,
    occurredAt: event.occurredAt,
    projectId: event.projectId,
    actorId: event.actorId,
    payload: event.payload
  };

  const idempotencyKey = digest({
    organizationId: manifest.organization.id,
    destinationId: destination.id,
    eventId: event.id,
    eventType: event.type
  }).slice("sha256:".length, "sha256:".length + 24);

  return {
    id: `${destination.id}:${event.id}`,
    idempotencyKey,
    signingKeyId: destination.signingKeyId,
    bodyDigest: digest(body),
    signaturePreview: digest({
      signingKeyId: destination.signingKeyId,
      bodyDigest: digest(body)
    }).slice(0, 24),
    body
  };
}

function nextRetryAt(delivery, destination) {
  const attempts = delivery.attempts || [];
  if (attempts.length === 0 || attempts.length >= destination.maxAttempts) {
    return null;
  }

  const lastAttempt = attempts.at(-1);
  const backoff = destination.retryBackoffMinutes[Math.min(attempts.length - 1, destination.retryBackoffMinutes.length - 1)] || 0;
  return new Date(Date.parse(lastAttempt.attemptedAt) + backoff * 60 * 1000).toISOString();
}

function classifyDelivery(manifest, event, delivery) {
  const destination = buildDestinationIndex(manifest).get(delivery.destinationId);
  const attempts = delivery.attempts || [];
  const lastAttempt = attempts.at(-1);
  const envelope = buildEnvelope(manifest, event, destination);
  const supportedEvent = destination.acceptedEventTypes.includes(event.type);

  if (!supportedEvent) {
    return {
      state: "manual-review",
      reason: "Destination is not subscribed to this event type.",
      replayable: false,
      envelope,
      destination,
      attempts
    };
  }

  if (attempts.some((attempt) => isSuccess(attempt.statusCode))) {
    return {
      state: "delivered",
      reason: "At least one delivery attempt succeeded.",
      replayable: false,
      envelope,
      destination,
      attempts
    };
  }

  if (!lastAttempt) {
    return {
      state: "queued",
      reason: "Delivery has not been attempted yet.",
      replayable: false,
      nextRetryAt: event.occurredAt,
      envelope,
      destination,
      attempts
    };
  }

  if (isRetryableStatus(lastAttempt.statusCode) && attempts.length < destination.maxAttempts) {
    return {
      state: "retryable",
      reason: `Last response ${lastAttempt.statusCode} is retryable and attempts remain.`,
      replayable: false,
      nextRetryAt: nextRetryAt(delivery, destination),
      envelope,
      destination,
      attempts
    };
  }

  const approved = Boolean(delivery.approvedForReplayBy && delivery.approvedForReplayAt);
  const needsApproval = destination.replayRequiresApproval && !approved;

  return {
    state: needsApproval ? "manual-review" : "dead-letter",
    reason: needsApproval
      ? "Replay requires enterprise admin approval before leaving the dead-letter queue."
      : `Delivery exhausted ${attempts.length} attempt(s) with final status ${lastAttempt.statusCode}.`,
    replayable: !needsApproval,
    envelope,
    destination,
    attempts,
    approval: approved
      ? {
          approvedBy: delivery.approvedForReplayBy,
          approvedAt: delivery.approvedForReplayAt
        }
      : null
  };
}

function buildReplayPlan(event, classified) {
  return {
    eventId: event.id,
    eventType: event.type,
    destinationId: classified.destination.id,
    destinationName: classified.destination.name,
    state: classified.state,
    replayable: classified.replayable,
    idempotencyKey: classified.envelope.idempotencyKey,
    bodyDigest: classified.envelope.bodyDigest,
    requiredAction: classified.replayable
      ? "Replay the signed envelope with the same idempotency key."
      : "Collect enterprise approval or destination configuration before replay.",
    retentionExpiresAt: new Date(
      Date.parse(event.occurredAt) + classified.destination.retentionDays * 24 * 60 * 60 * 1000
    ).toISOString()
  };
}

function createWebhookLedger(manifest) {
  const validationErrors = validateManifest(manifest);
  if (validationErrors.length > 0) {
    return {
      valid: false,
      validationErrors,
      health: "invalid-manifest",
      deliveries: [],
      replayPlans: [],
      summary: {
        totalDeliveries: 0,
        delivered: 0,
        retryable: 0,
        deadLetter: 0,
        replayReady: 0,
        manualReview: 0
      }
    };
  }

  const deliveries = [];
  for (const event of manifest.events) {
    for (const delivery of event.deliveries) {
      const classified = classifyDelivery(manifest, event, delivery);
      deliveries.push({
        eventId: event.id,
        eventType: event.type,
        projectId: event.projectId,
        destinationId: delivery.destinationId,
        destinationName: classified.destination.name,
        state: classified.state,
        reason: classified.reason,
        replayable: classified.replayable,
        nextRetryAt: classified.nextRetryAt || null,
        attempts: classified.attempts.length,
        idempotencyKey: classified.envelope.idempotencyKey,
        envelopeDigest: classified.envelope.bodyDigest,
        signaturePreview: classified.envelope.signaturePreview,
        approval: classified.approval || null
      });
    }
  }

  const replayPlans = [];
  for (const event of manifest.events) {
    for (const delivery of event.deliveries) {
      const classified = classifyDelivery(manifest, event, delivery);
      if (["dead-letter", "manual-review"].includes(classified.state)) {
        replayPlans.push(buildReplayPlan(event, classified));
      }
    }
  }

  const count = (state) => deliveries.filter((delivery) => delivery.state === state).length;
  const manualReview = count("manual-review");
  const deadLetter = count("dead-letter") + manualReview;
  const summary = {
    organizationId: manifest.organization.id,
    totalDeliveries: deliveries.length,
    delivered: count("delivered"),
    retryable: count("retryable"),
    deadLetter,
    replayReady: deliveries.filter((delivery) => delivery.state === "dead-letter" && delivery.replayable).length,
    manualReview
  };

  const health =
    summary.manualReview > 0 || summary.deadLetter > 0
      ? "degraded"
      : summary.retryable > 0
        ? "watch"
        : "healthy";

  return {
    valid: true,
    validationErrors: [],
    health,
    deliveries,
    replayPlans,
    summary,
    auditDigest: digest({
      summary,
      deliveries: deliveries.map((delivery) => ({
        eventId: delivery.eventId,
        destinationId: delivery.destinationId,
        state: delivery.state,
        envelopeDigest: delivery.envelopeDigest
      }))
    })
  };
}

function formatLedgerReport(ledger) {
  if (!ledger.valid) {
    return [`Manifest invalid:`, ...ledger.validationErrors.map((error) => `- ${error}`)].join("\n");
  }

  const lines = [
    `Enterprise delivery health: ${ledger.health}`,
    `Total deliveries: ${ledger.summary.totalDeliveries}`,
    `Delivered events: ${ledger.summary.delivered}`,
    `Dead-letter events: ${ledger.summary.deadLetter}`,
    `Replay-ready events: ${ledger.summary.replayReady}`,
    `Manual review events: ${ledger.summary.manualReview}`,
    `Audit digest: ${ledger.auditDigest}`,
    ""
  ];

  for (const delivery of ledger.deliveries) {
    lines.push(`${delivery.state.toUpperCase()} ${delivery.eventId} -> ${delivery.destinationId}`);
    lines.push(`  reason: ${delivery.reason}`);
    lines.push(`  idempotency: ${delivery.idempotencyKey}`);
  }

  return lines.join("\n");
}

module.exports = {
  buildEnvelope,
  createWebhookLedger,
  digest,
  formatLedgerReport,
  stableStringify,
  validateManifest
};
