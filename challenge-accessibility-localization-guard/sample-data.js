const accessibleChallenge = {
  challengeId: "sb-access-001",
  title: "Open climate forecasting challenge",
  currentRuleDigest: "rules-v5",
  solverTeams: [
    { id: "team-mx", requiredLanguages: ["en", "es"], accessibilityNeeds: ["captions"], timezone: "America/Mexico_City" },
    { id: "team-jp", requiredLanguages: ["en", "ja"], accessibilityNeeds: ["screen-reader"], timezone: "Asia/Tokyo" },
  ],
  materials: [
    {
      id: "rules",
      required: true,
      type: "document",
      languageVersions: { en: "rules-v5", es: "rules-v5", ja: "rules-v5" },
      accessibleFormats: ["html", "pdf-tagged", "screen-reader"],
    },
    {
      id: "walkthrough",
      required: true,
      type: "video",
      languageVersions: { en: "rules-v5", es: "rules-v5", ja: "rules-v5" },
      accessibleFormats: ["captions", "transcript", "audio-description"],
    },
  ],
  deadlines: [
    { id: "submission", timestamp: "2026-07-10T17:00:00Z", displayTimezones: ["UTC", "America/Mexico_City", "Asia/Tokyo"] },
  ],
  forms: [
    { id: "prequalification", required: true, languageVersions: { en: "rules-v5", es: "rules-v5", ja: "rules-v5" }, accessibleFormats: ["keyboard", "screen-reader"] },
  ],
};

const riskyChallenge = {
  ...accessibleChallenge,
  challengeId: "sb-access-002",
  materials: [
    {
      id: "rules",
      required: true,
      type: "document",
      languageVersions: { en: "rules-v5", es: "rules-v4" },
      accessibleFormats: ["pdf"],
    },
    {
      id: "walkthrough",
      required: true,
      type: "video",
      languageVersions: { en: "rules-v5" },
      accessibleFormats: ["video-only"],
    },
  ],
  deadlines: [
    { id: "submission", timestamp: "2026-07-10T17:00:00Z", displayTimezones: ["UTC"] },
  ],
  forms: [
    { id: "prequalification", required: true, languageVersions: { en: "rules-v5" }, accessibleFormats: ["mouse"] },
  ],
};

module.exports = {
  accessibleChallenge,
  riskyChallenge,
};
