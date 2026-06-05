const DEFAULT_POLICY = {
  warningThreshold: 0.75,
  criticalThreshold: 1,
  noticeFreshnessHours: 48,
  minimumContacts: 1,
};

function cents(value) {
  return Math.round(Number(value || 0));
}

function money(value) {
  return `$${(cents(value) / 100).toFixed(2)}`;
}

function hoursBetween(later, earlier) {
  return (new Date(later).getTime() - new Date(earlier).getTime()) / 36e5;
}

function sumUsage(events) {
  return events
    .filter((event) => event.billable !== false)
    .reduce((total, event) => {
      return total + Number(event.units || 0) * cents(event.unitPriceCents);
    }, 0);
}

function latestNoticeForThreshold(notices, threshold) {
  return notices
    .filter((notice) => Number(notice.threshold) >= threshold)
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())[0];
}

function projectSpend(spendCents, periodStart, periodEnd, now) {
  const elapsedHours = Math.max(hoursBetween(now, periodStart), 1);
  const totalHours = Math.max(hoursBetween(periodEnd, periodStart), elapsedHours);
  return Math.round((spendCents / elapsedHours) * totalHours);
}

function evaluateAccount(account, options = {}) {
  const policy = {
    ...DEFAULT_POLICY,
    ...(account.policy || {}),
    ...(options.policy || {}),
  };
  const now = options.now || new Date().toISOString();
  const budgetCents = cents(account.budgetCents);
  const creditCents = cents(account.topUpBalanceCents);
  const spendCents = cents(sumUsage(account.usageEvents || []));
  const approvedLimitCents = budgetCents + creditCents;
  const allowedInvoiceCents = Math.min(spendCents, approvedLimitCents);
  const spendRatio = budgetCents > 0 ? spendCents / budgetCents : Infinity;
  const projectedSpendCents = projectSpend(spendCents, account.periodStart, account.periodEnd, now);
  const projectedRatio = budgetCents > 0 ? projectedSpendCents / budgetCents : Infinity;
  const findings = [];

  function addFinding(severity, code, message, remediation, evidence = {}) {
    findings.push({
      severity,
      code,
      message,
      remediation,
      evidence,
    });
  }

  if (budgetCents <= 0 && spendCents > 0) {
    addFinding(
      "critical",
      "MISSING_APPROVED_BUDGET",
      "Billable compute usage exists without an approved account budget.",
      "Hold compute billing until finance attaches an approved budget or top-up authorization.",
      { spendCents }
    );
  }

  if (spendRatio >= policy.warningThreshold) {
    const notice = latestNoticeForThreshold(account.thresholdNotices || [], policy.warningThreshold);
    const noticeIsFresh =
      notice && hoursBetween(now, notice.sentAt) <= Number(policy.noticeFreshnessHours);

    if ((account.notificationContacts || []).length < policy.minimumContacts) {
      addFinding(
        "high",
        "BUDGET_NOTICE_CONTACTS_MISSING",
        "Budget threshold was crossed, but the account does not have enough notice recipients.",
        "Add finance or account-owner recipients before releasing the compute invoice.",
        {
          contacts: account.notificationContacts || [],
          minimumContacts: policy.minimumContacts,
        }
      );
    }

    if (!noticeIsFresh) {
      addFinding(
        "high",
        "BUDGET_THRESHOLD_NOTICE_STALE",
        "Budget threshold was crossed without a fresh customer notice.",
        "Send or refresh the budget threshold notice before billing the overage.",
        {
          threshold: policy.warningThreshold,
          latestNoticeAt: notice ? notice.sentAt : null,
          noticeFreshnessHours: policy.noticeFreshnessHours,
        }
      );
    }
  }

  if (projectedRatio >= policy.warningThreshold && spendRatio < policy.warningThreshold) {
    addFinding(
      "medium",
      "PROJECTED_BUDGET_WARNING",
      "Projected period-end compute spend will cross the warning threshold.",
      "Queue a proactive budget warning so the customer can top up or reduce usage before invoice release.",
      {
        projectedSpendCents,
        projectedRatio: Number(projectedRatio.toFixed(3)),
      }
    );
  }

  if (spendRatio >= policy.criticalThreshold && account.billingHoldEnabled !== true) {
    addFinding(
      "critical",
      "HARD_CAP_WITHOUT_BILLING_HOLD",
      "Compute usage reached the hard-cap threshold but billing hold controls are not enabled.",
      "Enable billing hold or record an explicit finance override before invoice release.",
      {
        spendCents,
        budgetCents,
        criticalThreshold: policy.criticalThreshold,
      }
    );
  }

  if (spendCents > approvedLimitCents) {
    addFinding(
      "critical",
      "UNCOVERED_COMPUTE_OVERAGE",
      "Compute spend exceeds the approved budget plus prepaid top-up balance.",
      "Hold the invoice, request top-up authorization, or cap the billable amount to the approved limit.",
      {
        spendCents,
        approvedLimitCents,
        uncoveredCents: spendCents - approvedLimitCents,
      }
    );
  }

  const draftInvoice = (account.invoices || []).find((invoice) =>
    ["draft", "pending"].includes(invoice.status)
  );
  if (draftInvoice && cents(draftInvoice.amountCents) !== allowedInvoiceCents) {
    addFinding(
      "high",
      "COMPUTE_INVOICE_AMOUNT_MISMATCH",
      "Draft compute invoice does not match the approved billable amount.",
      "Regenerate the invoice from the metered usage ledger and approved budget/top-up limit.",
      {
        invoiceId: draftInvoice.invoiceId,
        invoiceAmountCents: cents(draftInvoice.amountCents),
        allowedInvoiceCents,
      }
    );
  }

  const decision = findings.some((finding) => finding.severity === "critical")
    ? "HOLD_COMPUTE_BILLING"
    : findings.length > 0
      ? "SEND_NOTICE_BEFORE_BILLING"
      : "CLEAR_TO_BILL";

  return {
    accountId: account.accountId,
    plan: account.plan,
    decision,
    spendCents,
    budgetCents,
    creditCents,
    allowedInvoiceCents,
    spendRatio: budgetCents > 0 ? Number(spendRatio.toFixed(3)) : null,
    projectedSpendCents,
    projectedRatio: budgetCents > 0 ? Number(projectedRatio.toFixed(3)) : null,
    findings,
  };
}

function evaluatePortfolio(portfolio, options = {}) {
  const accounts = portfolio.accounts.map((account) => evaluateAccount(account, options));
  const decisionCounts = accounts.reduce((counts, account) => {
    counts[account.decision] = (counts[account.decision] || 0) + 1;
    return counts;
  }, {});

  return {
    generatedAt: options.now || new Date().toISOString(),
    portfolioId: portfolio.portfolioId,
    accounts,
    totals: {
      spendCents: accounts.reduce((total, account) => total + account.spendCents, 0),
      approvedLimitCents: accounts.reduce(
        (total, account) => total + account.budgetCents + account.creditCents,
        0
      ),
      allowedInvoiceCents: accounts.reduce(
        (total, account) => total + account.allowedInvoiceCents,
        0
      ),
    },
    decisionCounts,
  };
}

function renderMarkdownReport(assessment) {
  const lines = [
    `# Compute Budget Guard Report`,
    "",
    `Generated: ${assessment.generatedAt}`,
    `Portfolio: ${assessment.portfolioId}`,
    "",
    `## Totals`,
    "",
    `- Metered compute spend: ${money(assessment.totals.spendCents)}`,
    `- Approved budget plus top-ups: ${money(assessment.totals.approvedLimitCents)}`,
    `- Approved invoiceable amount: ${money(assessment.totals.allowedInvoiceCents)}`,
    "",
    `## Account Decisions`,
    "",
  ];

  for (const account of assessment.accounts) {
    lines.push(
      `### ${account.accountId}`,
      "",
      `- Decision: ${account.decision}`,
      `- Plan: ${account.plan}`,
      `- Spend: ${money(account.spendCents)} of ${money(account.budgetCents)} budget`,
      `- Top-up credit: ${money(account.creditCents)}`,
      `- Projected spend: ${money(account.projectedSpendCents)}`,
      ""
    );

    if (account.findings.length === 0) {
      lines.push(`No findings.`, "");
      continue;
    }

    for (const finding of account.findings) {
      lines.push(
        `- [${finding.severity.toUpperCase()}] ${finding.code}: ${finding.message}`,
        `  - Remediation: ${finding.remediation}`
      );
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

module.exports = {
  DEFAULT_POLICY,
  evaluateAccount,
  evaluatePortfolio,
  renderMarkdownReport,
  money,
};
