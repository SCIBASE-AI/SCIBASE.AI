function evaluateAccount(account) {
  const findings = [];

  if (account.invoiceStatus === "paid") {
    return {
      id: account.id,
      decision: "keep-active",
      findings,
      actions: ["keep entitlements active", "allow queued exports"]
    };
  }

  if (account.failedAttempts >= 3) findings.push("retry limit exceeded");
  if (account.daysPastDue >= 7 && !account.dunningNotices.includes("day-7")) findings.push("missing day-7 dunning notice");
  if (account.daysPastDue >= 14 && !account.dunningNotices.includes("day-14")) findings.push("missing day-14 dunning notice");
  if (account.entitlement === "active" && account.daysPastDue >= 14) findings.push("active entitlement beyond grace window");
  if (account.computeCreditsRemaining > 0 && account.failedAttempts >= 3) findings.push("compute credits should be held after repeated payment failure");
  if (account.analyticsExportQueued && account.invoiceStatus === "failed") findings.push("analytics license export queued for unpaid account");
  if (account.institutionalInvoice && account.failedAttempts < 3) findings.push("institutional invoice should route to finance exception workflow");

  const decision = account.institutionalInvoice && account.failedAttempts < 3
    ? "finance-exception"
    : findings.length > 0
      ? "hold-entitlements"
      : "continue-grace";

  const actions = {
    "finance-exception": ["route to institutional billing desk", "pause analytics export until invoice evidence is attached"],
    "hold-entitlements": ["hold risky entitlements", "pause compute credits or exports", "send remediation notice"],
    "continue-grace": ["continue grace period", "schedule next dunning notice"]
  }[decision];

  return { id: account.id, decision, findings, actions };
}

function evaluateBatch(batch) {
  const accounts = batch.accounts.map(evaluateAccount);
  const summary = accounts.reduce((acc, account) => {
    acc.total += 1;
    acc[account.decision] = (acc[account.decision] || 0) + 1;
    acc.findingCount += account.findings.length;
    return acc;
  }, { total: 0, findingCount: 0 });
  return { batchId: batch.id, generatedAt: batch.generatedAt, summary, accounts };
}

module.exports = { evaluateAccount, evaluateBatch };
