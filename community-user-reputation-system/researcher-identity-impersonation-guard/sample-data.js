const reviewContext = {
  reviewDate: "2026-05-28",
  maxVerificationAgeDays: 365,
  profileChangeTrustWindowDays: 14,
  minimumExternalProfileConfidence: 0.8,
  institutionDomains: {
    "northstar-institute": ["northstar.edu", "research.northstar.edu"],
    "mesa-biomed": ["mesa-biomed.org"],
  },
  reservedResearcherNames: ["Elena Voss", "Mira Laghari", "Rafael Chen"],
  trustedProfiles: [
    {
      id: "researcher-elena-voss",
      displayName: "Elena Voss",
      handle: "elena-voss-lab",
      primaryOrcid: "SYNTH-ORCID-ELENA-0001",
    },
    {
      id: "researcher-mira-laghari",
      displayName: "Mira Laghari",
      handle: "mira-laghari",
      primaryOrcid: "SYNTH-ORCID-MIRA-0003",
    },
  ],
};

const impersonationProfile = {
  id: "profile-provisional-884",
  displayName: "Elena Voss",
  handle: "elena-v0ss-lab",
  institutionId: "northstar-institute",
  institutionName: "Northstar Institute",
  emailDomain: "northstar-labs.example",
  affiliationVerifiedAt: "2025-01-20",
  reservedNameApproval: null,
  claimedIdentifiers: [
    {
      type: "ORCID",
      value: "SYNTH-ORCID-ELENA-0001",
      status: "verified",
      verifiedAt: "2025-01-12",
      source: "imported-profile-link",
      existingProfileIds: ["researcher-elena-voss"],
    },
    {
      type: "INSTITUTIONAL_EMAIL",
      value: "evoss@northstar-labs.example",
      status: "pending",
      verifiedAt: null,
      existingProfileIds: [],
    },
  ],
  externalProfiles: [
    {
      platform: "GitHub",
      value: "elena-v0ss-lab",
      proof: "profile-url-only",
      confidence: 0.52,
    },
  ],
  nameCollisions: [
    {
      profileId: "researcher-elena-voss",
      similarity: 0.98,
    },
  ],
  recentChanges: [
    {
      field: "handle",
      from: "ev-lab-provisional",
      to: "elena-v0ss-lab",
      changedAt: "2026-05-24",
    },
    {
      field: "displayName",
      from: "E. Voss Research",
      to: "Elena Voss",
      changedAt: "2026-05-25",
    },
  ],
  pendingTrustEvents: [
    {
      id: "endorsement-77",
      type: "endorsement",
      reputationImpact: "positive",
      reviewMode: "public",
      linksProfileIdentity: false,
    },
    {
      id: "review-credit-19",
      type: "peer-review-credit",
      reputationImpact: "positive",
      reviewMode: "double-blind",
      linksProfileIdentity: true,
    },
    {
      id: "badge-open-science",
      type: "badge",
      reputationImpact: "positive",
      reviewMode: "public",
      linksProfileIdentity: false,
    },
  ],
};

const verifiedProfile = {
  id: "profile-verified-205",
  displayName: "Nadia Okafor",
  handle: "nadia-okafor",
  institutionId: "mesa-biomed",
  institutionName: "Mesa Biomedical",
  emailDomain: "mesa-biomed.org",
  affiliationVerifiedAt: "2026-04-14",
  reservedNameApproval: null,
  claimedIdentifiers: [
    {
      type: "ORCID",
      value: "SYNTH-ORCID-NADIA-0002",
      status: "verified",
      verifiedAt: "2026-04-13",
      source: "oauth",
      existingProfileIds: [],
    },
    {
      type: "INSTITUTIONAL_EMAIL",
      value: "nadia.okafor@mesa-biomed.org",
      status: "verified",
      verifiedAt: "2026-04-13",
      existingProfileIds: [],
    },
  ],
  externalProfiles: [
    {
      platform: "GitHub",
      value: "nadia-okafor-lab",
      proof: "signed-profile-token",
      confidence: 0.94,
    },
  ],
  nameCollisions: [],
  recentChanges: [
    {
      field: "bio",
      from: "computational methods",
      to: "computational methods and imaging",
      changedAt: "2026-05-24",
    },
  ],
  pendingTrustEvents: [
    {
      id: "review-credit-44",
      type: "peer-review-credit",
      reputationImpact: "positive",
      reviewMode: "public",
      linksProfileIdentity: false,
    },
  ],
};

module.exports = {
  reviewContext,
  impersonationProfile,
  verifiedProfile,
};
