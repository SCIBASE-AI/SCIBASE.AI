const trustedProfile = {
  researcherId: "researcher-ada-001",
  displayName: "Ada Rivera",
  profileMode: "public",
  orcid: "0000-0002-1825-0097",
  verifiedEmails: ["ada.rivera@unam.mx"],
  affiliations: [
    {
      id: "aff-unam",
      institution: "UNAM Climate Lab",
      role: "Principal Investigator",
      source: "institutional-sso",
      verifiedDomain: "unam.mx",
      validFrom: "2024-01-01",
      validUntil: "2027-12-31",
      publicClaim: true,
      evidenceRefs: ["sso:unam:ada.rivera", "orcid:employment:001"],
    },
  ],
  grants: [
    {
      id: "grant-conacyt-42",
      funder: "CONACYT",
      projectId: "project-climate-yield",
      publicClaim: true,
      consent: "public",
      evidenceRefs: ["award:conacyt-42"],
    },
  ],
  trustInputs: {
    useAffiliationsForInvites: true,
    useGrantsForReputation: true,
    publicReputationBadge: true,
  },
};

const riskyProfile = {
  researcherId: "researcher-claim-risk-002",
  displayName: "R. Example",
  profileMode: "public",
  orcid: "",
  verifiedEmails: ["researcher@gmail.com"],
  affiliations: [
    {
      id: "aff-expired",
      institution: "Northbridge Institute",
      role: "Visiting Fellow",
      source: "manual",
      verifiedDomain: "northbridge.edu",
      validFrom: "2021-01-01",
      validUntil: "2024-12-31",
      publicClaim: true,
      evidenceRefs: [],
    },
    {
      id: "aff-active-conflict",
      institution: "West River Labs",
      role: "Advisor",
      source: "admin-attestation",
      verifiedDomain: "westriver.example",
      validFrom: "2025-01-01",
      validUntil: "2027-12-31",
      publicClaim: true,
      evidenceRefs: ["attestation:wr-2026"],
    },
    {
      id: "aff-second-active",
      institution: "East Valley University",
      role: "Faculty",
      source: "orcid",
      verifiedDomain: "evu.example",
      validFrom: "2025-01-01",
      validUntil: "2027-12-31",
      publicClaim: true,
      evidenceRefs: ["orcid:employment:evu"],
    },
  ],
  grants: [
    {
      id: "grant-private-77",
      funder: "Private Foundation",
      projectId: "project-sensitive-review",
      publicClaim: true,
      consent: "private",
      evidenceRefs: [],
    },
  ],
  trustInputs: {
    useAffiliationsForInvites: true,
    useGrantsForReputation: true,
    publicReputationBadge: true,
  },
};

module.exports = {
  trustedProfile,
  riskyProfile,
};
