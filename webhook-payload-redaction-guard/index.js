const SEVERITY_WEIGHTS = {
  critical: 34,
  high: 20,
  medium: 10,
  low: 4
};

function addFinding(findings, severity, rule, message, action, refs = []) {
  findings.push({ severity, rule, message, action, refs });
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function walkObject(value, visitor, path = []) {
  if (!isPlainObject(value) && !Array.isArray(value)) {
    return;
  }
  const entries = Array.isArray(value) ? value.entries() : Object.entries(value);
  for (const [key, child] of entries) {
    const nextPath = path.concat(String(key));
    visitor(String(key), child, nextPath);
    walkObject(child, visitor, nextPath);
  }
}

function pathString(path) {
  return path.join(".");
}

function evaluateEvent(event, project, findings) {
  if (!project.policy.allowedEventTypes.includes(event.eventType)) {
    addFinding(
      findings,
      "critical",
      "webhook-event-type-not-allowlisted",
      `${event.eventId} uses non-allowlisted event type ${event.eventType}.`,
      "Block delivery until the event type is approved for the destination connector.",
      [event.eventId, event.eventType]
    );
  }

  for (const field of Object.keys(event)) {
    if (!project.policy.allowedTopLevelFields.includes(field) && field !== "destination") {
      addFinding(
        findings,
        "medium",
        "webhook-top-level-field-not-allowlisted",
        `${event.eventId} includes non-allowlisted top-level field ${field}.`,
        "Drop non-contract fields before webhook delivery.",
        [event.eventId, field]
      );
    }
  }

  if (!project.policy.allowedRegions.includes(event.destination.region)) {
    addFinding(
      findings,
      "high",
      "webhook-region-not-allowed",
      `${event.eventId} targets region ${event.destination.region}.`,
      "Hold delivery until data-residency routing is approved.",
      [event.eventId, event.destination.region]
    );
  }

  const signature = event.signature || {};
  for (const field of project.policy.requiredSignatureFields) {
    if (!signature[field]) {
      addFinding(
        findings,
        "high",
        "webhook-signature-metadata-incomplete",
        `${event.eventId} is missing signature field ${field}.`,
        "Regenerate signed event metadata before delivery.",
        [event.eventId, field]
      );
    }
  }
  if (signature.algorithm && signature.algorithm !== "HMAC-SHA256") {
    addFinding(
      findings,
      "critical",
      "webhook-signature-algorithm-unsafe",
      `${event.eventId} uses unsafe signature algorithm ${signature.algorithm}.`,
      "Block delivery until a production signing algorithm is used.",
      [event.eventId, signature.algorithm]
    );
  }

  walkObject(event, (key, value, path) => {
    if (project.policy.piiFieldNames.includes(key)) {
      addFinding(
        findings,
        "critical",
        "webhook-pii-field-present",
        `${event.eventId} includes PII field ${pathString(path)}.`,
        "Redact direct identifiers before institutional webhook delivery.",
        [event.eventId, pathString(path)]
      );
    }
    if (project.policy.blockedProjectFields.includes(key)) {
      addFinding(
        findings,
        "high",
        "webhook-private-project-field-present",
        `${event.eventId} includes private project field ${pathString(path)}.`,
        "Remove private workspace fields from outbound payloads.",
        [event.eventId, pathString(path)]
      );
    }
    if (typeof value === "string" && value.includes("storage.example/private")) {
      addFinding(
        findings,
        "critical",
        "webhook-private-storage-link-present",
        `${event.eventId} exposes a private storage URL at ${pathString(path)}.`,
        "Replace private URLs with DOI/metadata links or suppress the field.",
        [event.eventId, pathString(path)]
      );
    }
  });

  if (event.project && event.project.visibility !== "public" && event.destination.purpose === "public-metadata") {
    addFinding(
      findings,
      "high",
      "private-project-routed-to-public-metadata",
      `${event.eventId} routes ${event.project.visibility} project metadata to a public destination.`,
      "Hold delivery until the workspace visibility and payload purpose agree.",
      [event.eventId, event.project.id]
    );
  }

  if (event.dataset) {
    if (!project.policy.publicDatasetAccess.includes(event.dataset.access)) {
      addFinding(
        findings,
        "critical",
        "webhook-dataset-access-not-public-safe",
        `${event.eventId} includes dataset ${event.dataset.id} with access ${event.dataset.access}.`,
        "Suppress dataset delivery or emit metadata-only redacted payload.",
        [event.eventId, event.dataset.id, event.dataset.access]
      );
    }
    if (event.dataset.access === "embargoed-metadata-only" && event.dataset.downloadUrl) {
      addFinding(
        findings,
        "high",
        "embargoed-dataset-download-url-present",
        `${event.eventId} includes a download URL for embargoed dataset ${event.dataset.id}.`,
        "Remove download links while preserving DOI and metadata.",
        [event.eventId, event.dataset.id]
      );
    }
  }
}

function evaluateWebhookPayloads(project) {
  const findings = [];
  for (const event of project.outboundEvents) {
    evaluateEvent(event, project, findings);
  }

  const eventDecisions = project.outboundEvents.map((event) => {
    const eventFindings = findings.filter((finding) => finding.refs.includes(event.eventId));
    const hasCritical = eventFindings.some((finding) => finding.severity === "critical");
    const hasHigh = eventFindings.some((finding) => finding.severity === "high");
    return {
      eventId: event.eventId,
      decision: hasCritical ? "block-delivery" : hasHigh ? "redact-and-review" : "deliver",
      rules: eventFindings.map((finding) => finding.rule)
    };
  });

  const severitySummary = findings.reduce(
    (summary, finding) => {
      summary[finding.severity] += 1;
      return summary;
    },
    { critical: 0, high: 0, medium: 0, low: 0 }
  );
  const score = Math.max(0, 100 - findings.reduce((sum, finding) => sum + SEVERITY_WEIGHTS[finding.severity], 0));

  return { findings, eventDecisions, severitySummary, score };
}

function decisionFromEvaluation(evaluation) {
  if (evaluation.severitySummary.critical > 0) {
    return "block-unsafe-webhook-delivery";
  }
  if (evaluation.severitySummary.high > 0 || evaluation.score < 75) {
    return "redact-and-review-before-delivery";
  }
  if (evaluation.score < 90) {
    return "manual-webhook-payload-review";
  }
  return "webhook-payload-ready";
}

function buildReviewPacket(project) {
  const evaluation = evaluateWebhookPayloads(project);
  return {
    guard: "webhook-payload-redaction-guard",
    issue: "SCIBASE-AI/SCIBASE.AI#19",
    asOfDate: project.asOfDate,
    decision: decisionFromEvaluation(evaluation),
    score: evaluation.score,
    severitySummary: evaluation.severitySummary,
    findings: evaluation.findings,
    eventDecisions: evaluation.eventDecisions,
    safety: [
      "Synthetic webhook, project, dataset, review, and connector data only",
      "No live webhook delivery, repository sync, LMS sync, identity, storage, or external provider calls",
      "No private institutional payloads, credentials, secrets, real users, or live admin mutations"
    ]
  };
}

function renderMarkdownReport(packet) {
  const lines = [
    "# Webhook Payload Redaction Guard",
    "",
    `Issue: ${packet.issue}`,
    `Decision: ${packet.decision}`,
    `Score: ${packet.score}`,
    "",
    "## Event Decisions",
    ""
  ];

  for (const decision of packet.eventDecisions) {
    lines.push(`- ${decision.eventId}: ${decision.decision}`);
    if (decision.rules.length > 0) {
      lines.push(`  - Rules: ${decision.rules.join(", ")}`);
    }
  }

  lines.push("", "## Findings", "");
  for (const finding of packet.findings) {
    lines.push(`- **${finding.severity} / ${finding.rule}**: ${finding.message}`);
    lines.push(`  - Action: ${finding.action}`);
    lines.push(`  - Refs: ${finding.refs.join(", ") || "none"}`);
  }

  lines.push("", "## Safety", "");
  for (const item of packet.safety) {
    lines.push(`- ${item}`);
  }

  return `${lines.join("\n")}\n`;
}

function renderSvgSummary(packet) {
  const scoreWidth = Math.max(44, Math.min(760, packet.score * 7.6));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Webhook payload redaction guard summary">
  <rect width="960" height="540" fill="#f8fafc"/>
  <text x="48" y="66" font-family="Arial" font-size="34" font-weight="700" fill="#111827">Webhook Payload Redaction Guard</text>
  <text x="48" y="104" font-family="Arial" font-size="18" fill="#475569">SCIBASE #19 enterprise outbound payload review</text>
  <rect x="48" y="142" width="864" height="94" rx="8" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="76" y="181" font-family="Arial" font-size="21" font-weight="700" fill="#b91c1c">${packet.decision}</text>
  <text x="76" y="213" font-family="Arial" font-size="17" fill="#334155">Critical ${packet.severitySummary.critical} | High ${packet.severitySummary.high} | Findings ${packet.findings.length}</text>
  <rect x="48" y="274" width="864" height="76" rx="8" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="76" y="307" font-family="Arial" font-size="18" fill="#334155">Payload readiness score</text>
  <rect x="76" y="324" width="760" height="14" rx="7" fill="#e5e7eb"/>
  <rect x="76" y="324" width="${scoreWidth}" height="14" rx="7" fill="#4f46e5"/>
  <text x="852" y="339" font-family="Arial" font-size="16" text-anchor="end" fill="#111827">${packet.score}/100</text>
  <rect x="48" y="390" width="864" height="76" rx="8" fill="#eef2ff" stroke="#a5b4fc"/>
  <text x="76" y="423" font-family="Arial" font-size="18" font-weight="700" fill="#3730a3">Block unsafe institutional delivery</text>
  <text x="76" y="451" font-family="Arial" font-size="16" fill="#3730a3">Checks schema allowlists, PII, private fields, storage links, residency, signatures, and dataset access.</text>
</svg>
`;
}

module.exports = {
  buildReviewPacket,
  decisionFromEvaluation,
  evaluateWebhookPayloads,
  renderMarkdownReport,
  renderSvgSummary
};
