import crypto from "node:crypto";

const DECISION_RANK = {
  RELEASE: 0,
  REVIEW: 1,
  HOLD: 2,
};

function strongerDecision(current, next) {
  return DECISION_RANK[next] > DECISION_RANK[current] ? next : current;
}

function round(value, places = 3) {
  return Number(value.toFixed(places));
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function stddev(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (values.length - 1);
  return Math.sqrt(variance);
}

function finding(id, severity, title, evidence, action) {
  return { id, severity, title, evidence, action };
}

function digestPacket(packet) {
  const stable = JSON.stringify(packet, Object.keys(packet).sort());
  return crypto.createHash("sha256").update(stable).digest("hex").slice(0, 16);
}

function normalizeRecords(records = []) {
  return records.map((record, index) => ({
    index,
    participantId: String(record.participantId ?? `row-${index + 1}`),
    group: String(record.group ?? "unknown"),
    value: Number(record.value),
    collectedAt: record.collectedAt,
    operatorId: String(record.operatorId ?? "unknown"),
  }));
}

function findDuplicateRows(records) {
  const seen = new Map();
  const duplicates = [];
  for (const record of records) {
    const key = [
      record.group,
      record.value,
      record.collectedAt,
      record.operatorId,
    ].join("|");
    if (seen.has(key)) {
      duplicates.push([seen.get(key), record.index]);
    } else {
      seen.set(key, record.index);
    }
  }

  if (duplicates.length === 0) return null;
  return finding(
    "duplicate-measurement-rows",
    "high",
    "Repeated measurement rows need raw-data verification",
    `${duplicates.length} duplicate row pair(s): ${duplicates
      .map(([a, b]) => `#${a + 1}/#${b + 1}`)
      .join(", ")}`,
    "Hold AI review output until source instruments, audit trail, and import logs explain the repeated rows.",
  );
}

function findImpossibleTimestamps(records) {
  const invalidRows = records.filter((record) => {
    const parsed = new Date(record.collectedAt);
    return Number.isNaN(parsed.getTime());
  });

  if (invalidRows.length === 0) return null;
  return finding(
    "invalid-collection-timestamps",
    "high",
    "Collection timestamps are not machine-auditable",
    `Invalid timestamp rows: ${invalidRows.map((row) => `#${row.index + 1}`).join(", ")}`,
    "Require normalized ISO-8601 collection timestamps before the assistant cites this dataset.",
  );
}

function findDigitPreference(records) {
  const numericRows = records.filter((record) => Number.isFinite(record.value));
  if (numericRows.length < 10) return null;

  const terminalCounts = new Map();
  for (const record of numericRows) {
    const terminal = Math.abs(Math.round(record.value * 10)) % 10;
    terminalCounts.set(terminal, (terminalCounts.get(terminal) ?? 0) + 1);
  }

  const [digit, count] = [...terminalCounts.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0];
  const share = count / numericRows.length;

  if (share < 0.45) return null;
  return finding(
    "terminal-digit-preference",
    "medium",
    "Terminal digit distribution is unusually concentrated",
    `${round(share * 100, 1)}% of numeric measurements end in ${digit}`,
    "Ask for raw instrument exports or an explanation of rounding rules before trusting fine-grained effects.",
  );
}

function findTooSmoothSequence(records) {
  const byGroup = Map.groupBy(
    records.filter((record) => Number.isFinite(record.value)),
    (record) => record.group,
  );
  const suspicious = [];

  for (const [group, groupRecords] of byGroup.entries()) {
    if (groupRecords.length < 6) continue;
    const sorted = [...groupRecords].sort(
      (a, b) => new Date(a.collectedAt) - new Date(b.collectedAt),
    );
    const deltas = sorted
      .slice(1)
      .map((record, index) => round(record.value - sorted[index].value, 4));
    const deltaSpread = stddev(deltas);
    const valueSpread = stddev(sorted.map((record) => record.value));
    if (valueSpread > 0 && deltaSpread / valueSpread < 0.045) {
      suspicious.push(`${group} delta sd/value sd=${round(deltaSpread / valueSpread, 4)}`);
    }
  }

  if (suspicious.length === 0) return null;
  return finding(
    "over-smooth-measurement-series",
    "medium",
    "Measurement series is smoother than expected for independent observations",
    suspicious.join("; "),
    "Route to statistical reviewer for instrument drift, interpolation, or synthetic-row checks.",
  );
}

function findPerfectSeparation(records) {
  const byGroup = Map.groupBy(
    records.filter((record) => Number.isFinite(record.value)),
    (record) => record.group,
  );
  if (byGroup.size < 2) return null;
  const summaries = [...byGroup.entries()].map(([group, groupRecords]) => {
    const values = groupRecords.map((record) => record.value);
    return {
      group,
      n: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      median: median(values),
    };
  });

  const ordered = summaries.sort((a, b) => a.median - b.median);
  const gaps = ordered
    .slice(1)
    .map((summary, index) => summary.min - ordered[index].max);
  const separated = gaps.some((gap) => gap > 0);
  const allGroupsLargeEnough = summaries.every((summary) => summary.n >= 6);

  if (!separated || !allGroupsLargeEnough) return null;
  return finding(
    "perfect-between-group-separation",
    "medium",
    "Groups separate perfectly without overlap",
    summaries
      .map(
        (summary) =>
          `${summary.group}: n=${summary.n}, range=${round(summary.min)}-${round(summary.max)}`,
      )
      .join("; "),
    "Require preregistered exclusion rules and raw row provenance before strong causal or classification claims are released.",
  );
}

export function evaluateFabricationAnomalyPacket(packet) {
  const records = normalizeRecords(packet.records);
  const findings = [
    findDuplicateRows(records),
    findImpossibleTimestamps(records),
    findDigitPreference(records),
    findTooSmoothSequence(records),
    findPerfectSeparation(records),
  ].filter(Boolean);

  let decision = "RELEASE";
  for (const item of findings) {
    decision = strongerDecision(
      decision,
      item.severity === "high" ? "HOLD" : "REVIEW",
    );
  }

  return {
    packetId: packet.id,
    manuscriptTitle: packet.manuscriptTitle,
    decision,
    findingCount: findings.length,
    findings,
    auditDigest: digestPacket({
      id: packet.id,
      records,
      findings: findings.map((item) => item.id),
    }),
    assistantScope:
      "Synthetic data-fabrication anomaly red flags before AI peer-review output is trusted.",
  };
}

export function summarizeReview(result) {
  const lines = [
    `# Data fabrication anomaly review: ${result.manuscriptTitle}`,
    "",
    `Decision: **${result.decision}**`,
    `Audit digest: \`${result.auditDigest}\``,
    "",
  ];

  if (result.findings.length === 0) {
    lines.push("No fabrication-anomaly red flags were detected in the synthetic packet.");
  } else {
    lines.push("## Findings", "");
    for (const item of result.findings) {
      lines.push(
        `- **${item.severity.toUpperCase()}** ${item.title} (${item.id})`,
        `  Evidence: ${item.evidence}`,
        `  Action: ${item.action}`,
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

export function renderSummarySvg(result) {
  const hold = result.decision === "HOLD";
  const review = result.decision === "REVIEW";
  const accent = hold ? "#b91c1c" : review ? "#b45309" : "#047857";
  const rows = result.findings.slice(0, 4);
  const findingRows = rows
    .map(
      (item, index) =>
        `<text x="34" y="${180 + index * 34}" font-size="18" fill="#111827">${item.severity.toUpperCase()} - ${item.id}</text>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <rect width="960" height="540" fill="#f8fafc"/>
  <rect x="24" y="24" width="912" height="492" rx="10" fill="#ffffff" stroke="#d1d5db"/>
  <text x="34" y="72" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#111827">Data Fabrication Anomaly Assistant</text>
  <text x="34" y="112" font-family="Arial, sans-serif" font-size="20" fill="#374151">${result.manuscriptTitle}</text>
  <rect x="34" y="136" width="180" height="44" rx="6" fill="${accent}"/>
  <text x="58" y="165" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#ffffff">${result.decision}</text>
  <text x="240" y="165" font-family="Arial, sans-serif" font-size="18" fill="#374151">Findings: ${result.findingCount} | Digest: ${result.auditDigest}</text>
  <g font-family="Arial, sans-serif">${findingRows || '<text x="34" y="180" font-size="18" fill="#111827">No red flags detected.</text>'}</g>
  <text x="34" y="482" font-family="Arial, sans-serif" font-size="16" fill="#6b7280">Synthetic data only. No live manuscripts, private datasets, credentials, or external APIs.</text>
</svg>
`;
}
