"use strict";

module.exports = {
  generatedAt: "2026-06-01T00:00:00.000Z",
  tenants: [
    {
      id: "tenant-tokyo-molecular",
      name: "Tokyo Molecular Imaging Lab",
      adminContact: "sso-admins@tokyo-molecular.example",
      metadata: {
        url: "https://idp.tokyo-molecular.example/metadata",
        entityId: "https://idp.tokyo-molecular.example/saml",
        acsUrl: "https://scibase.example/saml/acs/tokyo-molecular",
        lastFetchedAt: "2026-05-30T08:00:00.000Z"
      },
      endpoint: {
        expectedEntityId: "https://idp.tokyo-molecular.example/saml",
        expectedAcsUrl: "https://scibase.example/saml/acs/tokyo-molecular"
      },
      rollover: {
        ticketId: "ENT-SSO-1042",
        owner: "Rika Tanaka",
        stagedCertId: "tokyo-2027",
        notifyBeforeDays: 45,
        overlapRequiredDays: 21,
        fallbackLoginTestedAt: "2026-05-29T10:15:00.000Z"
      },
      certificates: [
        {
          id: "tokyo-2026",
          role: "signing",
          primary: true,
          fingerprint: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
          algorithm: "RSA-SHA256",
          keySize: 3072,
          notBefore: "2025-09-01T00:00:00.000Z",
          notAfter: "2026-12-15T00:00:00.000Z"
        },
        {
          id: "tokyo-2027",
          role: "signing",
          primary: false,
          fingerprint: "sha256:2222222222222222222222222222222222222222222222222222222222222222",
          algorithm: "RSA-SHA384",
          keySize: 3072,
          notBefore: "2026-11-15T00:00:00.000Z",
          notAfter: "2028-11-15T00:00:00.000Z"
        }
      ],
      connectedSystems: [
        { name: "DSpace repository sync", owner: "library-integrations", lastMetadataRefreshAt: "2026-05-29T00:00:00.000Z" },
        { name: "Canvas research methods LMS", owner: "teaching-platforms", lastMetadataRefreshAt: "2026-05-30T00:00:00.000Z" }
      ]
    },
    {
      id: "tenant-kyoto-research",
      name: "Kyoto Research Office",
      adminContact: "research-it@kyoto-research.example",
      metadata: {
        url: "https://login.kyoto-research.example/saml/metadata",
        entityId: "https://login.kyoto-research.example/saml",
        acsUrl: "https://scibase.example/saml/acs/kyoto-research",
        lastFetchedAt: "2026-05-20T00:00:00.000Z"
      },
      endpoint: {
        expectedEntityId: "https://login.kyoto-research.example/saml",
        expectedAcsUrl: "https://scibase.example/saml/acs/kyoto-research"
      },
      rollover: {
        ticketId: "ENT-SSO-1098",
        owner: "Naomi Ito",
        stagedCertId: "kyoto-2027",
        notifyBeforeDays: 45,
        overlapRequiredDays: 14,
        fallbackLoginTestedAt: "2026-05-01T00:00:00.000Z"
      },
      certificates: [
        {
          id: "kyoto-2026",
          role: "signing",
          primary: true,
          fingerprint: "sha256:3333333333333333333333333333333333333333333333333333333333333333",
          algorithm: "RSA-SHA256",
          keySize: 2048,
          notBefore: "2025-06-18T00:00:00.000Z",
          notAfter: "2026-06-13T00:00:00.000Z"
        },
        {
          id: "kyoto-2027",
          role: "signing",
          primary: false,
          fingerprint: "sha256:4444444444444444444444444444444444444444444444444444444444444444",
          algorithm: "RSA-SHA256",
          keySize: 2048,
          notBefore: "2026-05-20T00:00:00.000Z",
          notAfter: "2027-05-20T00:00:00.000Z"
        }
      ],
      connectedSystems: [
        { name: "Invenio institutional archive", owner: "library-it", lastMetadataRefreshAt: "2026-05-15T00:00:00.000Z" },
        { name: "HRIS people analytics", owner: "people-ops", lastMetadataRefreshAt: "2026-05-29T00:00:00.000Z" }
      ]
    },
    {
      id: "tenant-materials-consortium",
      name: "National Materials Consortium",
      adminContact: "sso-team@materials-consortium.example",
      metadata: {
        url: "https://idp.materials-consortium.example/metadata",
        entityId: "https://idp.materials-consortium.example/legacy",
        acsUrl: "https://scibase.example/saml/acs/materials-consortium",
        lastFetchedAt: "2026-04-24T00:00:00.000Z"
      },
      endpoint: {
        expectedEntityId: "https://idp.materials-consortium.example/saml",
        expectedAcsUrl: "https://scibase.example/saml/acs/materials-consortium"
      },
      rollover: {
        ticketId: null,
        owner: null,
        stagedCertId: null,
        notifyBeforeDays: 60,
        overlapRequiredDays: 21,
        fallbackLoginTestedAt: null
      },
      certificates: [
        {
          id: "materials-legacy",
          role: "signing",
          primary: true,
          fingerprint: "sha1:legacy-materials-fingerprint",
          algorithm: "RSA-SHA1",
          keySize: 1024,
          notBefore: "2024-06-01T00:00:00.000Z",
          notAfter: "2026-06-05T00:00:00.000Z"
        }
      ],
      connectedSystems: [
        { name: "Lab inventory bridge", owner: "materials-it", lastMetadataRefreshAt: "2026-04-30T00:00:00.000Z" }
      ]
    },
    {
      id: "tenant-oceanic-biocore",
      name: "Oceanic BioCore Institute",
      adminContact: "identity@oceanic-biocore.example",
      metadata: {
        url: "https://sso.oceanic-biocore.example/metadata",
        entityId: "https://sso.oceanic-biocore.example/saml",
        acsUrl: "https://scibase.example/saml/acs/oceanic-biocore-v2",
        lastFetchedAt: "2026-05-31T01:00:00.000Z"
      },
      endpoint: {
        expectedEntityId: "https://sso.oceanic-biocore.example/saml",
        expectedAcsUrl: "https://scibase.example/saml/acs/oceanic-biocore"
      },
      rollover: {
        ticketId: "ENT-SSO-1116",
        owner: "Mara Chen",
        stagedCertId: "oceanic-2027",
        notifyBeforeDays: 45,
        overlapRequiredDays: 21,
        fallbackLoginTestedAt: "2026-05-31T02:00:00.000Z"
      },
      certificates: [
        {
          id: "oceanic-2026",
          role: "signing",
          primary: true,
          fingerprint: "sha256:5555555555555555555555555555555555555555555555555555555555555555",
          algorithm: "RSA-SHA256",
          keySize: 2048,
          notBefore: "2025-07-01T00:00:00.000Z",
          notAfter: "2026-07-01T00:00:00.000Z"
        },
        {
          id: "oceanic-2027",
          role: "signing",
          primary: false,
          fingerprint: "sha256:6666666666666666666666666666666666666666666666666666666666666666",
          algorithm: "ECDSA-SHA256",
          keySize: 256,
          notBefore: "2026-06-25T00:00:00.000Z",
          notAfter: "2027-06-25T00:00:00.000Z"
        }
      ],
      connectedSystems: [
        { name: "Moodle doctoral program", owner: "teaching-platforms", lastMetadataRefreshAt: "2026-05-31T00:00:00.000Z" }
      ]
    }
  ]
};
