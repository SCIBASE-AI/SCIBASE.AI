export const exportPackages = [
  {
    id: "pkg-cell-atlas-2026",
    title: "Single-cell Atlas Reanalysis",
    institution: "Northbridge University",
    version: "v3.2.0",
    license: "CC-BY-4.0",
    exportedAt: "2026-05-20T14:00:00.000Z",
    artifacts: [
      {
        path: "data/cell-atlas.parquet",
        sha256: "6d8e8517adf9b92d8e76f7e6aa73fa55a2bb84fd6dbe1b7a6509de8ff2a0a101",
      },
      {
        path: "code/reproduce.py",
        sha256: "38df9b77b79f84425dd3d18a31b5420bcb2a58cf747b4b91f9f867df36d82068",
      },
      {
        path: "manuscript/supplement.pdf",
        sha256: "ea7e2b4fd1488dacbbd210f0cd340796551ab192acb62e806ca14181483664cf",
      },
    ],
    contributors: [
      {
        name: "Ada Park",
        orcid: "0000-0002-1111-2222",
        creditRoles: ["Data curation", "Formal analysis"],
      },
      {
        name: "Luis Moreno",
        orcid: "0000-0003-3333-4444",
        creditRoles: ["Software", "Visualization"],
      },
    ],
    funderMandates: [
      {
        funder: "NIH",
        repository: "zenodo-cell-atlas",
        openAccessBy: "2026-06-30",
      },
      {
        funder: "NIH",
        repository: "dspace-cell-atlas",
        openAccessBy: "2026-06-30",
      },
    ],
    repositoryTargets: [
      {
        id: "zenodo-cell-atlas",
        name: "Zenodo",
        expectedPersistentId: "10.5281/zenodo.998877",
        expectedAccess: "public",
        requiredMetadata: ["datacite", "schemaOrg", "license", "orcid", "version"],
        webhookTopic: "repository.deposit.indexed",
      },
      {
        id: "dspace-cell-atlas",
        name: "DSpace Institutional Repository",
        expectedPersistentId: "hdl:10022/cell-atlas/v3.2.0",
        expectedAccess: "public",
        requiredMetadata: ["datacite", "schemaOrg", "license", "orcid", "version"],
        webhookTopic: "repository.deposit.indexed",
      },
    ],
    receipts: [
      {
        targetId: "zenodo-cell-atlas",
        receiptId: "zenodo-rcpt-8812",
        status: "indexed",
        repositoryVersion: "v3.2.0",
        persistentId: "10.5281/zenodo.998877",
        access: "public",
        embargoEnd: null,
        indexedAt: "2026-05-20T14:08:00.000Z",
        metadata: {
          datacite: true,
          schemaOrg: true,
          version: "v3.2.0",
          license: "CC-BY-4.0",
          contributors: [
            {
              name: "Ada Park",
              orcid: "0000-0002-1111-2222",
              creditRoles: ["Data curation", "Formal analysis"],
            },
            {
              name: "Luis Moreno",
              orcid: "0000-0003-3333-4444",
              creditRoles: ["Software", "Visualization"],
            },
          ],
        },
        files: [
          {
            path: "data/cell-atlas.parquet",
            sha256: "6d8e8517adf9b92d8e76f7e6aa73fa55a2bb84fd6dbe1b7a6509de8ff2a0a101",
          },
          {
            path: "code/reproduce.py",
            sha256: "38df9b77b79f84425dd3d18a31b5420bcb2a58cf747b4b91f9f867df36d82068",
          },
          {
            path: "manuscript/supplement.pdf",
            sha256: "ea7e2b4fd1488dacbbd210f0cd340796551ab192acb62e806ca14181483664cf",
          },
        ],
        webhook: {
          deliveredAt: "2026-05-20T14:09:00.000Z",
          signatureValid: true,
          statusCode: 200,
        },
      },
      {
        targetId: "dspace-cell-atlas",
        receiptId: "dspace-rcpt-5520",
        status: "indexed",
        repositoryVersion: "v3.1.0",
        persistentId: "hdl:10022/cell-atlas/draft",
        access: "restricted",
        embargoEnd: "2026-08-15",
        indexedAt: "2026-05-20T15:20:00.000Z",
        metadata: {
          datacite: true,
          schemaOrg: false,
          version: "v3.1.0",
          license: "CC-BY-NC-4.0",
          contributors: [
            {
              name: "Ada Park",
              orcid: "0000-0002-1111-2222",
              creditRoles: ["Data curation"],
            },
          ],
        },
        files: [
          {
            path: "data/cell-atlas.parquet",
            sha256: "6d8e8517adf9b92d8e76f7e6aa73fa55a2bb84fd6dbe1b7a6509de8ff2a0a101",
          },
          {
            path: "code/reproduce.py",
            sha256: "00009b77b79f84425dd3d18a31b5420bcb2a58cf747b4b91f9f867df36d82068",
          },
        ],
        webhook: {
          deliveredAt: "2026-05-20T15:21:00.000Z",
          signatureValid: false,
          statusCode: 200,
        },
      },
    ],
  },
  {
    id: "pkg-crop-resilience-preprint",
    title: "Crop Resilience Preprint Package",
    institution: "Westlake Plant Science Institute",
    version: "v1.0.0",
    license: "CC0-1.0",
    exportedAt: "2026-05-20T16:00:00.000Z",
    artifacts: [
      {
        path: "data/drought-trials.csv",
        sha256: "487fc2a94117a0cf2464f93c89cf7c79ee92208dced88e030efbbf74220864d1",
      },
      {
        path: "notebooks/analysis.ipynb",
        sha256: "249be1ebf73bdff2621af0af930cf34cd7f2596fd5c11ad692d12efd598245fc",
      },
    ],
    contributors: [
      {
        name: "Mira Chen",
        orcid: "0000-0001-5555-6666",
        creditRoles: ["Investigation", "Writing - original draft"],
      },
    ],
    funderMandates: [
      {
        funder: "Horizon Europe",
        repository: "invenio-crop",
        openAccessBy: "2026-07-01",
      },
    ],
    repositoryTargets: [
      {
        id: "invenio-crop",
        name: "InvenioRDM",
        expectedPersistentId: "10.1234/wpsi.crop.2026.1",
        expectedAccess: "embargoed",
        requiredMetadata: ["datacite", "schemaOrg", "license", "orcid", "version"],
        webhookTopic: "repository.deposit.indexed",
      },
    ],
    receipts: [
      {
        targetId: "invenio-crop",
        receiptId: "invenio-rcpt-2041",
        status: "accepted",
        repositoryVersion: "v1.0.0",
        persistentId: "10.1234/wpsi.crop.2026.1",
        access: "embargoed",
        embargoEnd: "2026-06-28",
        indexedAt: null,
        metadata: {
          datacite: true,
          schemaOrg: false,
          version: "v1.0.0",
          license: "CC0-1.0",
          contributors: [
            {
              name: "Mira Chen",
              orcid: "0000-0001-5555-6666",
              creditRoles: ["Investigation"],
            },
          ],
        },
        files: [
          {
            path: "data/drought-trials.csv",
            sha256: "487fc2a94117a0cf2464f93c89cf7c79ee92208dced88e030efbbf74220864d1",
          },
          {
            path: "notebooks/analysis.ipynb",
            sha256: "249be1ebf73bdff2621af0af930cf34cd7f2596fd5c11ad692d12efd598245fc",
          },
        ],
        webhook: null,
      },
    ],
  },
]
