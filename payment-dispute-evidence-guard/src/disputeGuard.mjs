const REQUIRED_EVIDENCE = [
  'contract',
  'invoice',
  'deliveryProof',
  'usageLogs',
  'termsAcceptance',
  'customerCommunication',
  'redactedReceipt',
];

const DECISION_RANK = {
  RELEASE_RESPONSE: 0,
  REVIEW_BEFORE_RESPONSE: 1,
  HOLD_RESPONSE: 2,
};

const SEVERITY_RANK = {
  info: 0,
  warning: 1,
  critical: 2,
};

const DEFAULT_NOW = '2026-06-27T08:00:00Z';
const HOUR_MS = 60 * 60 * 1000;
const RESPONSE_URGENCY_HOURS = 48;
const CUSTOMER_NOTICE_HOURS = 72;

function parseDate(value, fieldName) {
  if (!value) {
    throw new Error(`Missing required date field: ${fieldName}`);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date field ${fieldName}: ${value}`);
  }

  return parsed;
}

function money(cents) {
  return Number.isFinite(cents) ? cents : 0;
}

function hasFullCardNumber(text = '') {
  const compact = String(text).replace(/[ -]/g, '');
  return /\d{13,19}/.test(compact);
}

function addFinding(findings, severity, code, message, remediation) {
  findings.push({ severity, code, message, remediation });
}

function strongestAction(findings) {
  if (findings.some((finding) => finding.severity === 'critical')) {
    return 'HOLD_RESPONSE';
  }

  if (findings.some((finding) => finding.severity === 'warning')) {
    return 'REVIEW_BEFORE_RESPONSE';
  }

  return 'RELEASE_RESPONSE';
}

function strongestFindingSeverity(findings) {
  return findings.reduce((highest, finding) => {
    return SEVERITY_RANK[finding.severity] > SEVERITY_RANK[highest]
      ? finding.severity
      : highest;
  }, 'info');
}

export function evaluateDisputePacket(packet, options = {}) {
  const now = parseDate(options.now ?? DEFAULT_NOW, 'now');
  const findings = [];
  const responseDueAt = parseDate(packet.responseDueAt, 'responseDueAt');
  const disputeReceivedAt = parseDate(packet.disputeReceivedAt, 'disputeReceivedAt');
  const hoursUntilDue = (responseDueAt.getTime() - now.getTime()) / HOUR_MS;
  const netAmountAtRiskCents = Math.max(
    0,
    money(packet.disputedAmountCents) - money(packet.priorRefundCents) - money(packet.creditMemoCents),
  );

  if (responseDueAt < now) {
    addFinding(
      findings,
      'critical',
      'RESPONSE_WINDOW_EXPIRED',
      'The processor response deadline has already passed.',
      'Hold revenue release and escalate to finance counsel before submitting a late dispute packet.',
    );
  } else if (hoursUntilDue <= RESPONSE_URGENCY_HOURS) {
    addFinding(
      findings,
      'warning',
      'RESPONSE_WINDOW_URGENT',
      `The processor response deadline is within ${Math.ceil(hoursUntilDue)} hours.`,
      'Route to a reviewer before release and confirm the packet can be submitted before cutoff.',
    );
  }

  const missingEvidence = REQUIRED_EVIDENCE.filter((key) => packet.evidence?.[key] !== true);
  if (missingEvidence.length > 0) {
    addFinding(
      findings,
      'critical',
      'MISSING_DISPUTE_EVIDENCE',
      `Missing dispute evidence: ${missingEvidence.join(', ')}.`,
      'Attach the missing evidence before any dispute response leaves the revenue workflow.',
    );
  }

  if (hasFullCardNumber(packet.receiptText)) {
    addFinding(
      findings,
      'critical',
      'SENSITIVE_RECEIPT_DATA',
      'Receipt evidence appears to contain a full payment card number.',
      'Redact card, bank, and token data before exporting the response packet.',
    );
  }

  if (!packet.customerNotifiedAt) {
    addFinding(
      findings,
      'warning',
      'CUSTOMER_NOTICE_MISSING',
      'No customer notification timestamp is recorded for this dispute.',
      'Notify the billing contact or document why notice is blocked before release.',
    );
  } else {
    const customerNotifiedAt = parseDate(packet.customerNotifiedAt, 'customerNotifiedAt');
    const noticeDelayHours = (customerNotifiedAt.getTime() - disputeReceivedAt.getTime()) / HOUR_MS;
    if (noticeDelayHours > CUSTOMER_NOTICE_HOURS) {
      addFinding(
        findings,
        'warning',
        'CUSTOMER_NOTICE_LATE',
        `Customer notice was recorded after ${Math.round(noticeDelayHours)} hours.`,
        'Have finance confirm late notice is acceptable for this account and region.',
      );
    }
  }

  if (netAmountAtRiskCents === 0 && money(packet.disputedAmountCents) > 0) {
    addFinding(
      findings,
      'warning',
      'DISPUTE_ALREADY_OFFSET',
      'Prior refunds or credit memos fully offset the disputed amount.',
      'Avoid duplicate recovery. Link the refund and credit memo evidence before responding.',
    );
  }

  if (money(packet.revenueRecognizedCents) > netAmountAtRiskCents && netAmountAtRiskCents > 0) {
    addFinding(
      findings,
      'warning',
      'RECOGNIZED_REVENUE_EXCEEDS_RISK',
      'Recognized revenue is higher than the current net disputed amount.',
      'Confirm whether deferred revenue or a reserve adjustment is needed before release.',
    );
  }

  return {
    id: packet.id,
    accountId: packet.accountId,
    invoiceId: packet.invoiceId,
    processorCaseId: packet.processorCaseId,
    netAmountAtRiskCents,
    hoursUntilDue: Math.round(hoursUntilDue * 10) / 10,
    findingCount: findings.length,
    highestSeverity: strongestFindingSeverity(findings),
    decision: strongestAction(findings),
    findings,
  };
}

export function evaluateDisputeBatch(packets, options = {}) {
  const caseCounts = new Map();

  for (const packet of packets) {
    const caseId = packet.processorCaseId;
    caseCounts.set(caseId, (caseCounts.get(caseId) ?? 0) + 1);
  }

  const results = packets.map((packet) => {
    const result = evaluateDisputePacket(packet, options);
    if (caseCounts.get(packet.processorCaseId) > 1) {
      addFinding(
        result.findings,
        'critical',
        'DUPLICATE_PROCESSOR_CASE',
        `Processor case ${packet.processorCaseId} appears in more than one packet.`,
        'Merge or split the evidence packets before any response is submitted.',
      );
      result.findingCount = result.findings.length;
      result.highestSeverity = strongestFindingSeverity(result.findings);
      result.decision = strongestAction(result.findings);
    }
    return result;
  });

  const summary = results.reduce(
    (acc, result) => {
      acc.totalPackets += 1;
      acc.totalNetAmountAtRiskCents += result.netAmountAtRiskCents;
      acc.decisions[result.decision] += 1;
      acc.findings += result.findingCount;
      if (DECISION_RANK[result.decision] > DECISION_RANK[acc.overallDecision]) {
        acc.overallDecision = result.decision;
      }
      return acc;
    },
    {
      totalPackets: 0,
      totalNetAmountAtRiskCents: 0,
      decisions: {
        RELEASE_RESPONSE: 0,
        REVIEW_BEFORE_RESPONSE: 0,
        HOLD_RESPONSE: 0,
      },
      findings: 0,
      overallDecision: 'RELEASE_RESPONSE',
    },
  );

  return { generatedAt: options.now ?? DEFAULT_NOW, summary, results };
}

export { REQUIRED_EVIDENCE };
