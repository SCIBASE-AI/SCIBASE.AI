"use strict";

const crypto = require("node:crypto");

const REQUIRED_CREDIT_ROLES = [
  "Conceptualization",
  "Methodology",
  "Data curation",
  "Formal analysis",
  "Writing - original draft",
  "Writing - review & editing",
];

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function stableHash(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function requireFields(object, fields, label) {
  const missing = fields.filter((field) => object[field] === undefined || object[field] === null);
  if (missing.length > 0) throw new Error(`${label} is missing required field(s): ${missing.join(", ")}`);
}

function finding(severity, id, title, detail, remediation, targetIds = []) {
  return { severity, id, title, detail, remediation, targetIds };
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid date: ${value}`);
  return parsed;
}

function assertBundle(bundle) {
  requireFields(bundle, ["manuscript", "authors", "contributors", "comments", "suggestions"], "authorship governance bundle");
  requireFields(bundle.manuscript, ["id", "title", "currentHash", "targetJournal", "blocks"], "manuscript");
}

function evaluateCreditCoverage(authors) {
  const findings = [];
  const coveredRoles = new Set(authors.flatMap((author) => author.creditRoles || []));

  for (const role of REQUIRED_CREDIT_ROLES) {
    if (!coveredRoles.has(role)) {
      findings.push(finding(
        "blocker",
        "credit-role-uncovered",
        "Required CRediT contribution role is uncovered",
        `${role} has no assigned author.`,
        "Assign an author to every required contribution role before submission.",
        [role],
      ));
    }
  }

  return findings;
}

function evaluateAuthorApprovals(authors, manuscript) {
  const findings = [];

  for (const author of authors) {
    const approved = author.approvals.some((approval) => {
      return approval.manuscriptHash === manuscript.currentHash && approval.status === "approved";
    });
    if (!approved) {
      findings.push(finding(
        "blocker",
        "author-approval-missing",
        "Author has not approved the current manuscript hash",
        `${author.name} has not approved ${manuscript.currentHash}.`,
        "Collect current-version approval from every listed author.",
        [author.id],
      ));
    }

    if (!author.coiDisclosure || author.coiDisclosure.status !== "submitted") {
      findings.push(finding(
        "blocker",
        "coi-disclosure-missing",
        "Author conflict-of-interest disclosure is missing",
        `${author.name} has no submitted COI disclosure.`,
        "Require a submitted COI disclosure before final submission.",
        [author.id],
      ));
    }
  }

  return findings;
}

function evaluateContributorGaps(authors, contributors, manuscript) {
  const findings = [];
  const authorIds = new Set(authors.map((author) => author.id));
  const blockEditorIds = new Set(manuscript.blocks.flatMap((block) => block.lastEditedBy || []));

  for (const contributor of contributors) {
    if (authorIds.has(contributor.id)) continue;
    if (blockEditorIds.has(contributor.id) && contributor.acknowledgementStatus !== "acknowledged") {
      findings.push(finding(
        "warning",
        "contributor-acknowledgement-missing",
        "Non-author contributor edited manuscript content without acknowledgement",
        `${contributor.name} edited manuscript blocks but is not an author or acknowledged contributor.`,
        "Resolve whether the contributor should be an author or acknowledged before submission.",
        [contributor.id],
      ));
    }
  }

  return findings;
}

function evaluateReviewObjects(comments, suggestions) {
  const findings = [];
  const blockingComments = comments.filter((comment) => comment.status === "open" && comment.blocking === true);
  const blockingSuggestions = suggestions.filter((suggestion) => {
    return suggestion.status === "open" && suggestion.requiredBeforeSubmission === true;
  });

  if (blockingComments.length > 0) {
    findings.push(finding(
      "blocker",
      "blocking-comments-open",
      "Blocking editor comments remain open",
      `${blockingComments.length} blocking comment(s) must be resolved before submission.`,
      "Resolve or explicitly waive every blocking comment.",
      blockingComments.map((comment) => comment.id),
    ));
  }

  if (blockingSuggestions.length > 0) {
    findings.push(finding(
      "blocker",
      "required-suggestions-open",
      "Required suggestions remain open",
      `${blockingSuggestions.length} required suggestion(s) are still pending.`,
      "Accept, reject with rationale, or waive required suggestions before submission.",
      blockingSuggestions.map((suggestion) => suggestion.id),
    ));
  }

  return findings;
}

function evaluateFigureTableApprovals(manuscript, authors) {
  const findings = [];
  const authorApprovalById = new Map(authors.map((author) => [author.id, new Set(author.assetApprovals || [])]));

  for (const block of manuscript.blocks) {
    if (!["figure", "table", "equation"].includes(block.type)) continue;
    const ownerApprovals = authorApprovalById.get(block.ownerAuthorId);
    if (!ownerApprovals || !ownerApprovals.has(block.id)) {
      findings.push(finding(
        "warning",
        "asset-owner-approval-missing",
        "Scientific asset lacks owner approval",
        `${block.type} ${block.id} has no approval from owner ${block.ownerAuthorId}.`,
        "Collect owner approval for figures, tables, and equations before journal export.",
        [block.id],
      ));
    }
  }

  return findings;
}

function buildSubmissionActions(findings) {
  const actions = [];
  if (findings.some((item) => item.id === "author-approval-missing")) actions.push("collect-author-approvals");
  if (findings.some((item) => item.id === "coi-disclosure-missing")) actions.push("collect-coi-disclosures");
  if (findings.some((item) => item.id === "credit-role-uncovered")) actions.push("assign-credit-roles");
  if (findings.some((item) => item.id === "blocking-comments-open")) actions.push("resolve-blocking-comments");
  if (findings.some((item) => item.id === "required-suggestions-open")) actions.push("resolve-required-suggestions");
  if (findings.some((item) => item.id === "contributor-acknowledgement-missing")) actions.push("review-non-author-contributors");
  if (findings.some((item) => item.id === "asset-owner-approval-missing")) actions.push("collect-asset-owner-approvals");
  return actions;
}

function decide(findings) {
  if (findings.some((item) => item.severity === "blocker")) return "submission-blocked";
  if (findings.some((item) => item.severity === "warning")) return "manual-review";
  return "ready-for-submission";
}

function analyzeAuthorshipGovernance(bundle, options = {}) {
  assertBundle(bundle);
  const now = parseDate(options.now || bundle.now || new Date().toISOString());
  const findings = [
    ...evaluateCreditCoverage(bundle.authors),
    ...evaluateAuthorApprovals(bundle.authors, bundle.manuscript),
    ...evaluateContributorGaps(bundle.authors, bundle.contributors, bundle.manuscript),
    ...evaluateReviewObjects(bundle.comments, bundle.suggestions),
    ...evaluateFigureTableApprovals(bundle.manuscript, bundle.authors),
  ];
  const submissionActions = buildSubmissionActions(findings);
  const decision = decide(findings);
  const auditDigest = stableHash({
    manuscriptId: bundle.manuscript.id,
    manuscriptHash: bundle.manuscript.currentHash,
    decision,
    findings,
    submissionActions,
    evaluatedAt: now.toISOString(),
  });

  return {
    manuscriptId: bundle.manuscript.id,
    title: bundle.manuscript.title,
    targetJournal: bundle.manuscript.targetJournal,
    manuscriptHash: bundle.manuscript.currentHash,
    evaluatedAt: now.toISOString(),
    decision,
    findings,
    submissionActions,
    auditDigest: `sha256:${auditDigest}`,
  };
}

module.exports = {
  REQUIRED_CREDIT_ROLES,
  analyzeAuthorshipGovernance,
  stableHash,
  stableStringify,
};
