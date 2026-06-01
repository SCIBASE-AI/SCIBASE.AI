const HIGH = "high";
const MEDIUM = "medium";
const LOW = "low";

function requiredString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function array(value, field) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${field} must be an array`);
  }
  return value;
}

function unique(values) {
  return [...new Set(values.map(String))];
}

function normalizeChallenge(raw) {
  return {
    challengeId: requiredString(raw.challengeId, "challengeId"),
    title: requiredString(raw.title, "title"),
    currentRuleDigest: requiredString(raw.currentRuleDigest, "currentRuleDigest"),
    solverTeams: array(raw.solverTeams || [], "solverTeams").map((team) => ({
      id: requiredString(team.id, "team.id"),
      requiredLanguages: unique(array(team.requiredLanguages || [], "team.requiredLanguages")),
      accessibilityNeeds: unique(array(team.accessibilityNeeds || [], "team.accessibilityNeeds")),
      timezone: requiredString(team.timezone || "UTC", "team.timezone"),
    })),
    materials: array(raw.materials || [], "materials").map((material) => ({
      id: requiredString(material.id, "material.id"),
      required: Boolean(material.required),
      type: requiredString(material.type, "material.type"),
      languageVersions: material.languageVersions || {},
      accessibleFormats: unique(array(material.accessibleFormats || [], "material.accessibleFormats")),
    })),
    deadlines: array(raw.deadlines || [], "deadlines").map((deadline) => ({
      id: requiredString(deadline.id, "deadline.id"),
      timestamp: requiredString(deadline.timestamp, "deadline.timestamp"),
      displayTimezones: unique(array(deadline.displayTimezones || [], "deadline.displayTimezones")),
    })),
    forms: array(raw.forms || [], "forms").map((form) => ({
      id: requiredString(form.id, "form.id"),
      required: Boolean(form.required),
      languageVersions: form.languageVersions || {},
      accessibleFormats: unique(array(form.accessibleFormats || [], "form.accessibleFormats")),
    })),
  };
}

function finding(code, severity, sourceId, message, affectedTeams, remediation) {
  return { code, severity, sourceId, message, affectedTeams, remediation };
}

function hasNeedCoverage(formats, need, materialType) {
  if (need === "captions") {
    if (materialType !== "video") {
      return true;
    }
    return formats.includes("captions") || formats.includes("transcript");
  }
  if (need === "screen-reader") {
    if (materialType === "video") {
      return formats.includes("transcript") || formats.includes("audio-description");
    }
    return formats.includes("screen-reader") || formats.includes("html") || formats.includes("pdf-tagged");
  }
  return formats.includes(need);
}

function assessAccessibilityLocalization(rawChallenge) {
  const challenge = normalizeChallenge(rawChallenge);
  const findings = [];
  const allLanguages = unique(challenge.solverTeams.flatMap((team) => team.requiredLanguages));

  for (const material of challenge.materials.filter((item) => item.required)) {
    for (const language of allLanguages) {
      const digest = material.languageVersions[language];
      if (!digest) {
        const teams = challenge.solverTeams
          .filter((team) => team.requiredLanguages.includes(language))
          .map((team) => team.id);
        findings.push(
          finding(
            "MISSING_REQUIRED_LANGUAGE",
            HIGH,
            material.id,
            `${material.id} is missing required ${language} language coverage.`,
            teams,
            "Provide the missing translation before opening submissions or mark the language as not required."
          )
        );
      } else if (digest !== challenge.currentRuleDigest) {
        const teams = challenge.solverTeams
          .filter((team) => team.requiredLanguages.includes(language))
          .map((team) => team.id);
        findings.push(
          finding(
            "STALE_TRANSLATION_DIGEST",
            HIGH,
            material.id,
            `${material.id} ${language} version references ${digest}, not current ${challenge.currentRuleDigest}.`,
            teams,
            "Regenerate translated materials from the current rule digest and restart any affected timing windows."
          )
        );
      }
    }

    for (const team of challenge.solverTeams) {
      const missingNeeds = team.accessibilityNeeds.filter((need) => !hasNeedCoverage(material.accessibleFormats, need, material.type));
      if (missingNeeds.length > 0) {
        findings.push(
          finding(
            "ACCESSIBILITY_FORMAT_GAP",
            HIGH,
            material.id,
            `${material.id} lacks accessible formats for ${missingNeeds.join(", ")}.`,
            [team.id],
            "Add equivalent accessible formats, then notify affected teams before submissions open."
          )
        );
      }
    }

    if (material.type === "video" && !material.accessibleFormats.includes("captions") && !material.accessibleFormats.includes("transcript")) {
      findings.push(
        finding(
          "VIDEO_CAPTION_TRANSCRIPT_GAP",
          MEDIUM,
          material.id,
          `${material.id} is a required video without captions or transcript.`,
          challenge.solverTeams.map((team) => team.id),
          "Add captions or a transcript before treating the walkthrough as required."
        )
      );
    }
  }

  for (const deadline of challenge.deadlines) {
    const missingTimezones = challenge.solverTeams
      .filter((team) => !deadline.displayTimezones.includes(team.timezone))
      .map((team) => team.id);
    if (missingTimezones.length > 0) {
      findings.push(
        finding(
          "TIMEZONE_DISPLAY_GAP",
          MEDIUM,
          deadline.id,
          `${deadline.id} deadline is not displayed in every solver team's timezone.`,
          missingTimezones,
          "Display UTC plus each eligible team's local timezone before the challenge clock starts."
        )
      );
    }
  }

  for (const form of challenge.forms.filter((item) => item.required)) {
    for (const language of allLanguages) {
      if (!form.languageVersions[language]) {
        const teams = challenge.solverTeams
          .filter((team) => team.requiredLanguages.includes(language))
          .map((team) => team.id);
        findings.push(
          finding(
            "FORM_LANGUAGE_GAP",
            MEDIUM,
            form.id,
            `${form.id} form is missing ${language} localization.`,
            teams,
            "Localize prequalification forms before requiring teams to complete them."
          )
        );
      }
    }
    if (!form.accessibleFormats.includes("keyboard") || !form.accessibleFormats.includes("screen-reader")) {
      findings.push(
        finding(
          "FORM_ACCESSIBILITY_GAP",
          MEDIUM,
          form.id,
          `${form.id} form is not keyboard and screen-reader accessible.`,
          challenge.solverTeams.map((team) => team.id),
          "Add keyboard navigation and screen-reader labels before using the form for eligibility."
        )
      );
    }
  }

  const high = findings.filter((item) => item.severity === HIGH).length;
  const medium = findings.filter((item) => item.severity === MEDIUM).length;
  return {
    challengeId: challenge.challengeId,
    title: challenge.title,
    decision: high > 0 ? "hold" : medium > 0 ? "revise" : "release",
    summary: {
      teamsReviewed: challenge.solverTeams.length,
      materialsReviewed: challenge.materials.length,
      formsReviewed: challenge.forms.length,
      findings: findings.length,
      high,
      medium,
      low: findings.filter((item) => item.severity === LOW).length,
    },
    findings,
    releaseCriteria: [
      "Required challenge materials cover every solver-team language.",
      "Translations reference the current immutable rule digest.",
      "Required documents, videos, and forms include equivalent accessible formats.",
      "Deadlines are shown in UTC and each eligible team's local timezone.",
    ],
  };
}

module.exports = {
  assessAccessibilityLocalization,
  normalizeChallenge,
};
