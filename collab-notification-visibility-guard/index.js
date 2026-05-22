"use strict";

const crypto = require("crypto");

const EXTERNAL_CHANNELS = new Set(["email", "push", "webhook", "slack_digest"]);
const ACTION_RANK = {
  deliver: 0,
  sanitize: 1,
  hold: 2,
  drop: 3
};

function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function digest(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function asArray(value) {
  if (value === undefined || value === null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function recipientHasScope(recipient, scope) {
  const scopes = new Set(asArray(recipient.scopes));
  return scopes.has("*") || scopes.has(scope);
}

function recipientHasPermission(recipient, permission) {
  return new Set(asArray(recipient.permissions)).has(permission);
}

function routeIsExternal(route) {
  return EXTERNAL_CHANNELS.has(route.channel);
}

function includesRole(roles, role) {
  return roles.includes("*") || roles.includes(role);
}

function redactMessage(text, redactions) {
  let output = String(text || "");

  for (const redaction of redactions) {
    if (!redaction.value) {
      continue;
    }

    output = output.split(redaction.value).join(redaction.replacement);
  }

  return output;
}

function makeSafeSubject(event, action) {
  if (action === "deliver") {
    return event.subject;
  }

  if (event.type === "reviewer_note") {
    return "Restricted reviewer note update";
  }

  if (event.type === "notebook_output") {
    return "Restricted notebook output update";
  }

  if (event.type === "section_lock") {
    return "Restricted section lock update";
  }

  if (event.type === "export_digest") {
    return "Publication export digest requires review";
  }

  return "Collaborative editor update requires review";
}

function buildPayload(event, action, redactions, reasons) {
  const rawPayload = {
    subject: event.subject,
    message: event.message,
    sectionTitle: event.sectionTitle,
    anchor: event.anchor,
    notebookPath: event.notebookPath,
    reviewerIdentity: event.reviewerIdentity,
    threadTitle: event.threadTitle,
    eventType: event.type,
    eventId: event.id
  };

  if (action === "deliver") {
    return {
      ...rawPayload,
      visibility: "full"
    };
  }

  const safePayload = {
    subject: makeSafeSubject(event, action),
    message: redactMessage(event.message, redactions),
    eventType: event.type,
    eventId: event.id,
    visibility: action,
    redactedFields: unique(redactions.map((redaction) => redaction.field)),
    reviewReasons: reasons
  };

  if (event.anchor && !redactions.some((redaction) => redaction.field === "anchor")) {
    safePayload.anchor = event.anchor;
  }

  return safePayload;
}

function routeRecipientIds(event, recipients) {
  if (event.fanout === "all") {
    return recipients.map((recipient) => recipient.id);
  }

  return asArray(event.recipientIds);
}

function evaluateRoute(event, recipient, channel) {
  const reasons = [];
  const redactions = [];
  const requiredScopes = asArray(event.requiredScopes);
  const allowedRoles = asArray(event.allowedRoles.length ? event.allowedRoles : ["*"]);
  const allowedChannels = asArray(event.allowedChannels.length ? event.allowedChannels : ["in_app"]);
  const route = {
    eventId: event.id,
    recipientId: recipient.id,
    recipientRole: recipient.role,
    channel
  };

  if (!includesRole(allowedRoles, recipient.role)) {
    reasons.push("recipient-role-not-allowed");
  }

  for (const scope of requiredScopes) {
    if (!recipientHasScope(recipient, scope)) {
      reasons.push(`missing-scope:${scope}`);
    }
  }

  if (!allowedChannels.includes(channel)) {
    reasons.push(`channel-not-allowed:${channel}`);
  }

  if (event.privateThread && !asArray(event.threadParticipants).includes(recipient.id) && !recipientHasPermission(recipient, "viewPrivateThreads")) {
    reasons.push("not-private-thread-participant");
  }

  if (event.requiresReceipt && routeIsExternal(route) && !recipient.digestReceiptId) {
    reasons.push("missing-external-digest-receipt");
  }

  if (event.blindedReviewerIdentity && !recipientHasPermission(recipient, "viewReviewerIdentity")) {
    reasons.push("blinded-reviewer-identity-hidden");
    redactions.push({
      field: "reviewerIdentity",
      value: event.reviewerIdentity,
      replacement: "[redacted reviewer identity]"
    });
  }

  if (event.privateSectionTitle && !recipientHasScope(recipient, `section:${event.sectionId}`)) {
    reasons.push(`private-section-title-hidden:${event.sectionId}`);
    redactions.push({
      field: "sectionTitle",
      value: event.sectionTitle,
      replacement: "[restricted section]"
    });
  }

  if (event.embargoedAnchor && !recipientHasPermission(recipient, "viewEmbargoedAnchors") && !recipientHasScope(recipient, `embargo:${event.sectionId}`)) {
    reasons.push(`embargoed-anchor-hidden:${event.sectionId}`);
    redactions.push({
      field: "anchor",
      value: event.anchor,
      replacement: "[restricted anchor]"
    });
  }

  if (event.restrictedNotebookPath && !recipientHasPermission(recipient, "viewRestrictedNotebookPaths") && !recipientHasScope(recipient, `notebook:${event.notebookId}`)) {
    reasons.push(`restricted-notebook-path-hidden:${event.notebookId}`);
    redactions.push({
      field: "notebookPath",
      value: event.notebookPath,
      replacement: "[restricted notebook path]"
    });
  }

  if (event.privateCollaboratorNote && !recipientHasPermission(recipient, "viewPrivateThreads")) {
    reasons.push("private-collaborator-note-hidden");
    redactions.push({
      field: "threadTitle",
      value: event.threadTitle,
      replacement: "[private collaborator note]"
    });
  }

  if (routeIsExternal(route) && event.externalDigestSafe !== true) {
    reasons.push("external-channel-requires-sanitized-digest");
  }

  let action = "deliver";

  if (reasons.some((reason) => reason.startsWith("channel-not-allowed") || reason === "recipient-role-not-allowed")) {
    action = "drop";
  } else if (reasons.some((reason) => reason.startsWith("missing-scope") || reason === "not-private-thread-participant" || reason === "missing-external-digest-receipt")) {
    action = "hold";
  } else if (redactions.length > 0 || reasons.includes("external-channel-requires-sanitized-digest")) {
    action = "sanitize";
  }

  return {
    ...route,
    action,
    severity: ACTION_RANK[action],
    reasons: unique(reasons),
    payload: buildPayload(event, action, redactions, unique(reasons)),
    routeDigest: digest({
      eventId: event.id,
      recipientId: recipient.id,
      channel,
      action,
      reasons: unique(reasons)
    })
  };
}

function evaluateNotificationBatch(batch) {
  const recipients = asArray(batch.recipients);
  const recipientMap = new Map(recipients.map((recipient) => [recipient.id, recipient]));
  const routes = [];

  for (const event of asArray(batch.events)) {
    for (const recipientId of routeRecipientIds(event, recipients)) {
      const recipient = recipientMap.get(recipientId);
      if (!recipient) {
        routes.push({
          eventId: event.id,
          recipientId,
          recipientRole: "unknown",
          channel: "unknown",
          action: "drop",
          severity: ACTION_RANK.drop,
          reasons: ["recipient-not-found"],
          payload: {
            eventId: event.id,
            eventType: event.type,
            visibility: "drop"
          },
          routeDigest: digest({ eventId: event.id, recipientId, action: "drop" })
        });
        continue;
      }

      const channel = event.routeChannels && event.routeChannels[recipientId] ? event.routeChannels[recipientId] : recipient.defaultChannel;
      routes.push(evaluateRoute(event, recipient, channel));
    }
  }

  const counts = {
    deliver: 0,
    sanitize: 0,
    hold: 0,
    drop: 0
  };

  for (const route of routes) {
    counts[route.action] += 1;
  }

  const leakageRisks = routes
    .filter((route) => route.action !== "deliver")
    .map((route) => ({
      eventId: route.eventId,
      recipientId: route.recipientId,
      action: route.action,
      reasons: route.reasons
    }));

  const result = {
    projectId: batch.projectId,
    evaluatedAt: batch.evaluatedAt,
    summary: {
      totalRoutes: routes.length,
      ...counts,
      maxSeverity: routes.reduce((max, route) => Math.max(max, route.severity), 0),
      leakageRiskCount: leakageRisks.length
    },
    routes,
    leakageRisks
  };

  return {
    ...result,
    auditDigest: digest(result)
  };
}

function buildReviewReport(result) {
  const lines = [
    "# Collaborative Notification Visibility Guard Report",
    "",
    `Project: ${result.projectId}`,
    `Audit digest: ${result.auditDigest}`,
    "",
    "## Summary",
    "",
    `- Total routes evaluated: ${result.summary.totalRoutes}`,
    `- Delivered without change: ${result.summary.deliver}`,
    `- Sanitized before delivery: ${result.summary.sanitize}`,
    `- Held for review: ${result.summary.hold}`,
    `- Dropped: ${result.summary.drop}`,
    `- Leakage risks found: ${result.summary.leakageRiskCount}`,
    "",
    "## Route Decisions",
    ""
  ];

  for (const route of result.routes) {
    lines.push(`- ${route.eventId} -> ${route.recipientId} via ${route.channel}: ${route.action}`);
    if (route.reasons.length) {
      lines.push(`  - Reasons: ${route.reasons.join(", ")}`);
    }
  }

  lines.push("");
  lines.push("## Reviewer Notes");
  lines.push("");
  lines.push("This guard focuses on notification fanout, not the editor canvas itself. It verifies that in-app alerts, email digests, push alerts, and webhook notifications do not disclose restricted collaborative context to recipients who lack the role, scope, channel, or receipt required to see it.");
  lines.push("");

  return lines.join("\n");
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildSummarySvg(result) {
  const width = 1280;
  const height = 720;
  const bars = [
    ["deliver", "#1f7a4d"],
    ["sanitize", "#1f5f99"],
    ["hold", "#b36b00"],
    ["drop", "#9e2b25"]
  ];
  const max = Math.max(1, ...bars.map(([key]) => result.summary[key]));
  const barSvg = bars.map(([key, color], index) => {
    const value = result.summary[key];
    const barWidth = Math.round((value / max) * 720);
    const y = 230 + index * 86;
    return [
      `<text x="110" y="${y + 27}" font-family="Arial, sans-serif" font-size="28" fill="#1f2937">${escapeXml(key)}</text>`,
      `<rect x="290" y="${y}" width="760" height="42" rx="6" fill="#e5e7eb"/>`,
      `<rect x="290" y="${y}" width="${barWidth}" height="42" rx="6" fill="${color}"/>`,
      `<text x="1080" y="${y + 31}" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#111827">${value}</text>`
    ].join("\n");
  }).join("\n");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="#f8fafc"/>`,
    `<rect x="64" y="58" width="1152" height="604" rx="18" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>`,
    `<text x="110" y="128" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#111827">Notification Visibility Guard</text>`,
    `<text x="110" y="174" font-family="Arial, sans-serif" font-size="24" fill="#475569">Real-time collaborative research editor notification fanout audit</text>`,
    barSvg,
    `<text x="110" y="626" font-family="Arial, sans-serif" font-size="22" fill="#475569">Digest: ${escapeXml(result.auditDigest.slice(0, 24))}</text>`,
    `</svg>`
  ].join("\n");
}

function fillRect(pixels, width, x0, y0, rectWidth, rectHeight, rgb) {
  for (let y = y0; y < y0 + rectHeight; y += 1) {
    for (let x = x0; x < x0 + rectWidth; x += 1) {
      const index = (y * width + x) * 3;
      pixels[index] = rgb[0];
      pixels[index + 1] = rgb[1];
      pixels[index + 2] = rgb[2];
    }
  }
}

function buildDemoFrame(result, width = 1280, height = 720) {
  const header = Buffer.from(`P6\n${width} ${height}\n255\n`);
  const pixels = Buffer.alloc(width * height * 3);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 3;
      pixels[index] = 246;
      pixels[index + 1] = 248;
      pixels[index + 2] = 250;
    }
  }

  fillRect(pixels, width, 64, 58, 1152, 604, [255, 255, 255]);
  fillRect(pixels, width, 64, 58, 1152, 12, [51, 65, 85]);
  fillRect(pixels, width, 110, 130, 620, 20, [31, 41, 55]);
  fillRect(pixels, width, 110, 170, 760, 10, [100, 116, 139]);

  const colors = {
    deliver: [31, 122, 77],
    sanitize: [31, 95, 153],
    hold: [179, 107, 0],
    drop: [158, 43, 37]
  };
  const keys = Object.keys(colors);
  const max = Math.max(1, ...keys.map((key) => result.summary[key]));

  keys.forEach((key, index) => {
    const y = 250 + index * 90;
    const barWidth = Math.max(18, Math.round((result.summary[key] / max) * 740));
    fillRect(pixels, width, 290, y, 760, 44, [226, 232, 240]);
    fillRect(pixels, width, 290, y, barWidth, 44, colors[key]);
    fillRect(pixels, width, 110, y + 8, 130, 18, [31, 41, 55]);
  });

  fillRect(pixels, width, 110, 620, 500, 12, [71, 85, 105]);

  return Buffer.concat([header, pixels]);
}

module.exports = {
  evaluateNotificationBatch,
  buildReviewReport,
  buildSummarySvg,
  buildDemoFrame,
  stableStringify,
  digest
};
