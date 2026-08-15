"use strict";

const SECRET_PATTERNS = [
  /api[_-]?key\s*=/i,
  /secret\s*=/i,
  /bearer\s+[A-Za-z0-9._-]{16,}/i,
  /-----BEGIN [A-Z ]+PRIVATE KEY-----/i,
  /sk-[A-Za-z0-9]{16,}/i
];

const AI_TOOL_TERMS = [
  "llm",
  "gpt",
  "claude",
  "gemini",
  "copilot",
  "codex",
  "diffusion",
  "agent"
];

function finding(code, severity, message, evidence, remediation) {
  return { code, severity, message, evidence, remediation };
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePacket(packet) {
  return {
    id: packet.id,
    title: packet.title || "Untitled scientific bounty submission",
    challenge: packet.challenge || {},
    challengePolicy: packet.challengePolicy || {},
    aiAssistance: packet.aiAssistance || {},
    humanReview: packet.humanReview || {},
    generatedComponents: Array.isArray(packet.generatedComponents) ? packet.generatedComponents : [],
    reproducibility: packet.reproducibility || {},
    submission: packet.submission || {}
  };
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function containsSecretLikeText(value) {
  const text = String(value || "");
  return SECRET_PATTERNS.some((pattern) => pattern.test(text));
}

function toolLooksAi(tool) {
  const haystack = `${tool.name || ""} ${tool.type || ""} ${tool.purpose || ""}`;
  return AI_TOOL_TERMS.some((term) => normalizeText(haystack).includes(term));
}

function licenseAllowed(license, allowedLicenses) {
  if (!license || allowedLicenses.length === 0) return true;
  return allowedLicenses.map(normalizeText).includes(normalizeText(license));
}

function policyAllowsTool(tool, policy) {
  const approvedTools = list(policy.approvedTools).map(normalizeText);
  if (approvedTools.length === 0) return true;
  return approvedTools.includes(normalizeText(tool.name));
}

function usedProhibitedData(aiAssistance, policy) {
  const used = list(aiAssistance.dataClassesUsed).map(normalizeText);
  const prohibited = list(policy.prohibitedDataClasses).map(normalizeText);
  return used.filter((item) => prohibited.includes(item));
}

function analyzeTools(packet) {
  const findings = [];
  const policy = packet.challengePolicy;
  const tools = list(packet.aiAssistance.tools);

  for (const tool of tools) {
    if (!policyAllowsTool(tool, policy)) {
      findings.push(finding(
        "UNAPPROVED_AI_TOOL_USED",
        "major",
        "The submission used an AI/tooling system that is not listed in the challenge-approved tool policy.",
        { tool: tool.name || null, approvedTools: policy.approvedTools || [] },
        "Add sponsor approval evidence for the tool or rerun the affected work with an approved toolchain."
      ));
    }

    if (toolLooksAi(tool) && tool.disclosed !== true && packet.challengePolicy.requiresAiToolList === true) {
      findings.push(finding(
        "AI_TOOL_NOT_LISTED_IN_DISCLOSURE",
        "major",
        "An apparent AI tool is present in provenance records but not listed as disclosed.",
        { tool: tool.name || null, type: tool.type || null },
        "Update the solver disclosure packet so reviewers can see which AI tools touched the deliverable."
      ));
    }

    if (tool.license && !licenseAllowed(tool.license, list(policy.allowedToolLicenses))) {
      findings.push(finding(
        "TOOL_LICENSE_NOT_ALLOWED",
        "major",
        "A tool license is outside the licenses allowed by the challenge policy.",
        { tool: tool.name || null, license: tool.license, allowedToolLicenses: policy.allowedToolLicenses || [] },
        "Replace the tool, document a sponsor exception, or update the challenge policy before scoring."
      ));
    }
  }

  return findings;
}

function analyzeComponents(packet) {
  const findings = [];
  const generated = packet.generatedComponents;

  for (const component of generated) {
    if (component.aiGenerated === true && component.disclosed !== true) {
      findings.push(finding(
        "GENERATED_COMPONENT_NOT_DISCLOSED",
        "major",
        "An AI-generated component is not clearly disclosed in the submission packet.",
        { path: component.path || null, type: component.type || null },
        "Mark the generated component and explain how it was produced and reviewed."
      ));
    }

    if (component.aiGenerated === true && component.humanReviewed !== true) {
      findings.push(finding(
        "GENERATED_COMPONENT_NOT_HUMAN_REVIEWED",
        "major",
        "An AI-generated component lacks human review attestation.",
        { path: component.path || null },
        "Add human review evidence before the component can be scored or released to a sponsor."
      ));
    }

    if (component.aiGenerated === true && !component.provenanceHash) {
      findings.push(finding(
        "GENERATED_COMPONENT_MISSING_PROVENANCE_HASH",
        "minor",
        "An AI-generated component does not include a provenance or artifact hash.",
        { path: component.path || null },
        "Add a stable artifact hash, prompt digest, or build provenance digest."
      ));
    }

    if (component.license && !licenseAllowed(component.license, list(packet.challengePolicy.allowedSubmissionLicenses))) {
      findings.push(finding(
        "GENERATED_COMPONENT_LICENSE_MISMATCH",
        "major",
        "A generated component uses a license outside the challenge submission policy.",
        { path: component.path || null, license: component.license },
        "Relicense, remove, or obtain sponsor approval before scoring the submission."
      ));
    }
  }

  return findings;
}

function analyzePacket(input) {
  const packet = normalizePacket(input);
  const findings = [];
  const policy = packet.challengePolicy;
  const ai = packet.aiAssistance;
  const submission = packet.submission;

  if (policy.allowsAiAssistance === false && ai.used === true) {
    findings.push(finding(
      "AI_ASSISTANCE_PROHIBITED",
      "critical",
      "The challenge policy prohibits AI assistance, but the submission declares or shows AI use.",
      { allowsAiAssistance: policy.allowsAiAssistance, aiUsed: ai.used },
      "Hold scoring until the sponsor allows AI assistance or the solver resubmits without AI-generated work."
    ));
  }

  if (ai.used === true && policy.requiresDisclosure !== false && ai.disclosed !== true) {
    findings.push(finding(
      "AI_ASSISTANCE_UNDISCLOSED",
      "critical",
      "The submission used AI assistance without the disclosure required by the challenge policy.",
      { aiUsed: ai.used, disclosed: ai.disclosed },
      "Require an explicit AI-use disclosure before scoring, award release, or sponsor handoff."
    ));
  }

  const prohibitedData = usedProhibitedData(ai, policy);
  if (prohibitedData.length > 0) {
    findings.push(finding(
      "PROHIBITED_DATA_SENT_TO_AI",
      "critical",
      "AI assistance appears to have used data classes prohibited by the challenge policy.",
      { prohibitedData },
      "Hold the packet, notify the sponsor, and require a clean-room rerun or documented exception."
    ));
  }

  if (ai.privateDataUsed === true || submission.includesPrivateData === true) {
    findings.push(finding(
      "PRIVATE_DATA_IN_AI_WORKFLOW",
      "critical",
      "The AI workflow or final packet includes private or sponsor-restricted data.",
      { privateDataUsed: ai.privateDataUsed, includesPrivateData: submission.includesPrivateData },
      "Remove private data, regenerate affected artifacts, and provide reviewer-safe provenance evidence."
    ));
  }

  if (ai.promptLeakage === true || submission.promptLeakage === true || containsSecretLikeText(ai.promptExcerpt) || containsSecretLikeText(submission.notes)) {
    findings.push(finding(
      "PROMPT_OR_SECRET_LEAKAGE",
      "critical",
      "The packet appears to expose prompts, secrets, bearer tokens, or private workflow instructions.",
      { promptLeakage: ai.promptLeakage || submission.promptLeakage || false },
      "Redact the packet, rotate any exposed credentials if real, and resubmit reviewer-safe evidence only."
    ));
  }

  if (ai.used === true && packet.humanReview.completed !== true) {
    findings.push(finding(
      "MISSING_HUMAN_REVIEW_ATTESTATION",
      "major",
      "AI-assisted work lacks a completed human review attestation.",
      { humanReviewCompleted: packet.humanReview.completed || false },
      "Add named reviewer, review date, reviewed components, and residual-risk notes."
    ));
  }

  if (ai.used === true && !packet.reproducibility.commands) {
    findings.push(finding(
      "AI_ASSISTED_WORK_NOT_REPRODUCIBLE",
      "major",
      "The submission lacks reproducibility commands or environment notes for AI-assisted deliverables.",
      { commands: packet.reproducibility.commands || null },
      "Add commands, environment, seeds, and artifact hashes sufficient for sponsor-side reproduction."
    ));
  }

  findings.push(...analyzeTools(packet));
  findings.push(...analyzeComponents(packet));

  const decision = decisionFromFindings(findings);
  return {
    id: packet.id,
    title: packet.title,
    challenge: packet.challenge.title || "scientific bounty",
    decision,
    confidence: confidenceFromFindings(findings),
    aiUsed: ai.used === true,
    componentCount: packet.generatedComponents.length,
    findingCount: findings.length,
    findings,
    reviewerNote: reviewerNote(packet, decision, findings)
  };
}

function severityWeight(severity) {
  if (severity === "critical") return 5;
  if (severity === "major") return 3;
  return 1;
}

function decisionFromFindings(findings) {
  if (findings.some((item) => item.severity === "critical")) return "HOLD";
  if (findings.some((item) => item.severity === "major" || item.severity === "minor")) return "REVIEW";
  return "RELEASE";
}

function confidenceFromFindings(findings) {
  const penalty = findings.reduce((total, item) => total + severityWeight(item.severity), 0);
  return Math.max(0.1, Number((0.96 - penalty * 0.065).toFixed(2)));
}

function reviewerNote(packet, decision, findings) {
  if (decision === "RELEASE") {
    return `${packet.challenge.title || "scientific bounty"}: AI-assistance disclosure, provenance, human review, and reproducibility evidence are scoring-ready.`;
  }
  const first = findings[0];
  return `${packet.challenge.title || "scientific bounty"}: ${decision} before scoring because ${first.message.toLowerCase()}`;
}

function analyzePackets(packets) {
  const reviews = packets.map(analyzePacket);
  const counts = reviews.reduce((acc, review) => {
    acc[review.decision] = (acc[review.decision] || 0) + 1;
    return acc;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    packetCount: reviews.length,
    decisionCounts: {
      RELEASE: counts.RELEASE || 0,
      REVIEW: counts.REVIEW || 0,
      HOLD: counts.HOLD || 0
    },
    reviews
  };
}

module.exports = {
  SECRET_PATTERNS,
  analyzePacket,
  analyzePackets,
  containsSecretLikeText,
  decisionFromFindings
};
