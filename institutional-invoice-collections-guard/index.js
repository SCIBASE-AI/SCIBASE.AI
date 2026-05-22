'use strict';

const crypto = require('crypto');

const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_POLICY = Object.freeze({
  asOfDate: '2026-05-22',
  gentleReminderDays: 1,
  financeEscalationDays: 31,
  collectionsEscalationDays: 61,
  writeOffReviewDays: 91,
  promiseGraceDays: 10,
  promiseCoverageRatio: 0.6,
  maxDunningEventsPerWeek: 2,
  minimumFinanceContacts: 2,
  softHoldActions: [
    'pause new AI compute top-ups',
    'block paid plan upgrades',
    'keep existing research workspaces readable'
  ]
});

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash('sha256').update(stableStringify(value)).digest('hex');
}

function toDate(dateValue, fieldName) {
  const parsed = new Date(`${dateValue}T00:00:00Z`);
  if (!dateValue || Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${fieldName}: ${dateValue}`);
  }
  return parsed;
}

function daysBetween(startDate, endDate) {
  return Math.floor((toDate(endDate, 'endDate') - toDate(startDate, 'startDate')) / DAY_MS);
}

function cents(value) {
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid amount: ${value}`);
  }
  return Math.round(value);
}

function formatMoney(centsValue, currency) {
  return `${currency || 'USD'} ${(cents(centsValue) / 100).toFixed(2)}`;
}

function sumPostedPayments(payments) {
  return (payments || [])
    .filter((payment) => payment.status === 'posted' || payment.status === 'settled')
    .reduce((total, payment) => total + cents(payment.amountCents || 0), 0);
}

function getOutstandingCents(invoice) {
  return Math.max(0, cents(invoice.amountCents || 0) - sumPostedPayments(invoice.payments));
}

function getDaysPastDue(invoice, asOfDate) {
  return Math.max(0, daysBetween(invoice.dueDate, asOfDate));
}

function getAgingBucket(daysPastDue, outstandingCents) {
  if (outstandingCents <= 0) return 'settled';
  if (daysPastDue === 0) return 'current';
  if (daysPastDue <= 30) return '1-30';
  if (daysPastDue <= 60) return '31-60';
  if (daysPastDue <= 90) return '61-90';
  return '90+';
}

function hasRecentDunningOverload(invoice, policy) {
  const history = invoice.dunningHistory || [];
  const asOf = policy.asOfDate;
  const recentEvents = history.filter((event) => {
    const daysAgo = daysBetween(event.date, asOf);
    return daysAgo >= 0 && daysAgo <= 7;
  });
  return recentEvents.length >= policy.maxDunningEventsPerWeek;
}

function findValidPromise(invoice, outstandingCents, policy) {
  return (invoice.promisedPays || []).find((promise) => {
    const daysUntilPromise = daysBetween(policy.asOfDate, promise.date);
    const promisedCents = cents(promise.amountCents || 0);
    return Boolean(promise.evidenceId)
      && daysUntilPromise >= 0
      && daysUntilPromise <= policy.promiseGraceDays
      && promisedCents >= Math.ceil(outstandingCents * policy.promiseCoverageRatio);
  }) || null;
}

function getContactRisk(invoice, policy) {
  const contacts = invoice.financeContacts || [];
  const verifiedContacts = contacts.filter((contact) => contact.verified && contact.email);
  if (verifiedContacts.length >= policy.minimumFinanceContacts) {
    return { risk: 0, reason: 'sufficient verified finance contacts' };
  }
  return {
    risk: policy.minimumFinanceContacts - verifiedContacts.length,
    reason: `needs ${policy.minimumFinanceContacts - verifiedContacts.length} more verified finance contact(s)`
  };
}

function chooseCollectionsAction(context) {
  const {
    invoice,
    outstandingCents,
    daysPastDue,
    bucket,
    validPromise,
    contactRisk,
    dunningOverload
  } = context;

  if (outstandingCents <= 0) {
    return {
      action: 'mark_settled',
      severity: 'low',
      reason: 'invoice has no outstanding balance',
      entitlementTreatment: 'keep entitlements active'
    };
  }

  if (!invoice.deliveryAccepted) {
    return {
      action: 'hold_collections_missing_acceptance',
      severity: 'medium',
      reason: 'delivery or customer acceptance evidence is missing',
      entitlementTreatment: 'do not restrict entitlements until acceptance is resolved'
    };
  }

  const unresolvedDispute = (invoice.disputes || []).find((dispute) => dispute.status !== 'resolved');
  if (unresolvedDispute) {
    return {
      action: 'route_to_dispute_owner',
      severity: 'medium',
      reason: `unresolved ${unresolvedDispute.type || 'billing'} dispute blocks collections`,
      entitlementTreatment: 'freeze dunning and preserve existing access until dispute owner decision'
    };
  }

  if (validPromise) {
    return {
      action: 'pause_dunning_for_promised_pay',
      severity: 'low',
      reason: `promised payment ${validPromise.evidenceId} covers the policy threshold`,
      entitlementTreatment: 'keep entitlements active during promise grace window'
    };
  }

  if (dunningOverload) {
    return {
      action: 'rate_limit_dunning',
      severity: 'medium',
      reason: 'dunning cadence already reached weekly cap',
      entitlementTreatment: 'avoid new customer notices until cadence window resets'
    };
  }

  if (bucket === 'current') {
    return {
      action: 'monitor_current_invoice',
      severity: 'low',
      reason: 'invoice is not past due',
      entitlementTreatment: 'keep entitlements active'
    };
  }

  if (bucket === '1-30') {
    return {
      action: 'send_gentle_reminder',
      severity: 'low',
      reason: `${daysPastDue} day(s) past due`,
      entitlementTreatment: 'keep entitlements active'
    };
  }

  if (bucket === '31-60') {
    return {
      action: 'finance_owner_escalation',
      severity: contactRisk.risk > 0 ? 'high' : 'medium',
      reason: `${daysPastDue} day(s) past due; ${contactRisk.reason}`,
      entitlementTreatment: 'pause new paid plan upgrades until finance owner confirms payment path'
    };
  }

  if (bucket === '61-90') {
    return {
      action: 'collections_escalation_packet',
      severity: 'high',
      reason: `${daysPastDue} day(s) past due requires collections review`,
      entitlementTreatment: invoice.activeResearch
        ? 'soft hold: pause new billable usage while preserving active research access'
        : 'soft hold: pause new billable usage and paid feature expansion'
    };
  }

  return {
    action: 'write_off_or_payment_plan_review',
    severity: 'critical',
    reason: `${daysPastDue} day(s) past due requires write-off or payment-plan approval`,
    entitlementTreatment: invoice.activeResearch
      ? 'executive approval required before any disruptive entitlement change'
      : 'suspend new billable usage and queue write-off review'
  };
}

function buildNextSteps(invoice, action, policy) {
  const steps = [];

  if (action.action === 'hold_collections_missing_acceptance') {
    steps.push('request signed delivery or acceptance evidence');
    steps.push('block collections notice until acceptance evidence is attached');
  } else if (action.action === 'route_to_dispute_owner') {
    steps.push('assign dispute owner and response due date');
    steps.push('attach dispute resolution note before resuming dunning');
  } else if (action.action === 'pause_dunning_for_promised_pay') {
    steps.push('schedule promise verification on promised payment date');
    steps.push('resume aging review if payment is not posted by grace deadline');
  } else if (action.action === 'rate_limit_dunning') {
    steps.push('suppress additional dunning events for current cadence window');
    steps.push('queue next review after cadence cap resets');
  } else if (action.action === 'send_gentle_reminder') {
    steps.push('send low-risk reminder to billing contact');
    steps.push('capture customer response or promised-pay evidence');
  } else if (action.action === 'finance_owner_escalation') {
    steps.push('notify finance owner and customer success manager');
    steps.push('request payment ETA, PO correction, or dispute creation');
  } else if (action.action === 'collections_escalation_packet') {
    steps.push('generate collections packet with invoice, payment, and dunning history');
    steps.push('apply non-disruptive soft hold to new billable usage');
  } else if (action.action === 'write_off_or_payment_plan_review') {
    steps.push('route to controller for write-off, reserve, or payment-plan approval');
    steps.push('require executive sign-off before disrupting active research access');
  } else if (action.action === 'monitor_current_invoice') {
    steps.push('monitor until due date or posted payment');
  } else {
    steps.push('close collections case and retain settlement receipt');
  }

  if ((invoice.financeContacts || []).filter((contact) => contact.verified).length < policy.minimumFinanceContacts) {
    steps.push('collect additional verified finance contact before next notice');
  }

  return steps;
}

function evaluateInvoice(invoice, options = {}) {
  const policy = Object.assign({}, DEFAULT_POLICY, options.policy || {}, {
    asOfDate: options.asOfDate || (options.policy && options.policy.asOfDate) || DEFAULT_POLICY.asOfDate
  });

  toDate(invoice.issueDate, 'issueDate');
  toDate(invoice.dueDate, 'dueDate');
  toDate(policy.asOfDate, 'asOfDate');

  const outstandingCents = getOutstandingCents(invoice);
  const daysPastDue = getDaysPastDue(invoice, policy.asOfDate);
  const bucket = getAgingBucket(daysPastDue, outstandingCents);
  const validPromise = findValidPromise(invoice, outstandingCents, policy);
  const contactRisk = getContactRisk(invoice, policy);
  const dunningOverload = hasRecentDunningOverload(invoice, policy);
  const action = chooseCollectionsAction({
    invoice,
    outstandingCents,
    daysPastDue,
    bucket,
    validPromise,
    contactRisk,
    dunningOverload
  });

  const riskScore = calculateRiskScore({
    invoice,
    outstandingCents,
    daysPastDue,
    bucket,
    validPromise,
    contactRisk,
    action
  });

  const packet = {
    invoiceId: invoice.id,
    customer: invoice.customer,
    currency: invoice.currency || 'USD',
    amountCents: cents(invoice.amountCents || 0),
    outstandingCents,
    outstandingDisplay: formatMoney(outstandingCents, invoice.currency || 'USD'),
    daysPastDue,
    agingBucket: bucket,
    action: action.action,
    severity: action.severity,
    reason: action.reason,
    entitlementTreatment: action.entitlementTreatment,
    activeResearch: Boolean(invoice.activeResearch),
    validPromise: validPromise ? {
      date: validPromise.date,
      amountCents: cents(validPromise.amountCents || 0),
      evidenceId: validPromise.evidenceId
    } : null,
    contactRisk,
    dunningCadenceBlocked: dunningOverload,
    nextSteps: buildNextSteps(invoice, action, policy),
    policySnapshot: {
      asOfDate: policy.asOfDate,
      promiseGraceDays: policy.promiseGraceDays,
      maxDunningEventsPerWeek: policy.maxDunningEventsPerWeek,
      minimumFinanceContacts: policy.minimumFinanceContacts,
      softHoldActions: policy.softHoldActions.slice()
    },
    riskScore
  };

  packet.auditDigest = digest({
    invoice: sanitizeInvoice(invoice),
    packet: Object.assign({}, packet, { auditDigest: undefined })
  });

  return packet;
}

function calculateRiskScore(context) {
  const { invoice, outstandingCents, daysPastDue, bucket, validPromise, contactRisk, action } = context;
  if (outstandingCents <= 0) return 0;

  let score = Math.min(50, Math.floor(daysPastDue / 2));
  score += Math.min(20, Math.floor(outstandingCents / 100000));
  score += contactRisk.risk * 8;
  if (bucket === '61-90') score += 15;
  if (bucket === '90+') score += 25;
  if ((invoice.disputes || []).some((dispute) => dispute.status !== 'resolved')) score -= 20;
  if (validPromise) score -= 25;
  if (invoice.activeResearch && action.action !== 'monitor_current_invoice') score += 5;

  return Math.max(0, Math.min(100, score));
}

function sanitizeInvoice(invoice) {
  return {
    id: invoice.id,
    customer: invoice.customer,
    currency: invoice.currency || 'USD',
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    amountCents: cents(invoice.amountCents || 0),
    postedPaymentTotal: sumPostedPayments(invoice.payments),
    deliveryAccepted: Boolean(invoice.deliveryAccepted),
    disputeCount: (invoice.disputes || []).length,
    promiseCount: (invoice.promisedPays || []).length,
    dunningEventCount: (invoice.dunningHistory || []).length,
    activeResearch: Boolean(invoice.activeResearch)
  };
}

function evaluatePortfolio(invoices, options = {}) {
  const packets = invoices.map((invoice) => evaluateInvoice(invoice, options));
  const totals = packets.reduce((summary, packet) => {
    summary.outstandingCents += packet.outstandingCents;
    summary.byBucket[packet.agingBucket] = (summary.byBucket[packet.agingBucket] || 0) + packet.outstandingCents;
    summary.byAction[packet.action] = (summary.byAction[packet.action] || 0) + 1;
    if (packet.severity === 'high' || packet.severity === 'critical') {
      summary.highRiskInvoices.push(packet.invoiceId);
    }
    return summary;
  }, {
    outstandingCents: 0,
    byBucket: {},
    byAction: {},
    highRiskInvoices: []
  });

  const portfolio = {
    asOfDate: options.asOfDate || DEFAULT_POLICY.asOfDate,
    invoiceCount: packets.length,
    outstandingCents: totals.outstandingCents,
    outstandingDisplay: formatMoney(totals.outstandingCents, 'USD'),
    byBucket: totals.byBucket,
    byAction: totals.byAction,
    highRiskInvoices: totals.highRiskInvoices,
    packets
  };

  portfolio.auditDigest = digest(portfolio);
  return portfolio;
}

module.exports = {
  DEFAULT_POLICY,
  daysBetween,
  digest,
  evaluateInvoice,
  evaluatePortfolio,
  formatMoney,
  getAgingBucket,
  getOutstandingCents
};
