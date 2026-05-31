"use strict";

const cleanDigest = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const secondDigest = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const thirdDigest = "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

module.exports = {
  generatedAt: "2026-06-01T00:00:00.000Z",
  projects: [
    {
      id: "project-neuro-crispr",
      title: "Neuro CRISPR Single-cell Notebook",
      owner: "Tokyo Molecular Atlas Lab",
      publicGraph: true,
      runtime: {
        containerDigest: cleanDigest,
        lockfileHash: secondDigest,
        executedAt: "2026-05-30T00:00:00.000Z"
      },
      dependencies: [
        {
          name: "scanpy",
          ecosystem: "pypi",
          declaredVersion: "1.10.1",
          lockfileVersion: "1.10.1",
          runtimeVersion: "1.10.1",
          declaredIn: "environment.yml",
          license: "BSD-3-Clause",
          packageUrl: "pkg:pypi/scanpy@1.10.1",
          source: { access: "public", repository: "https://github.com/scverse/scanpy" },
          evidence: {
            lockfileHash: secondDigest,
            sbomRef: "bom-ref:scanpy-1.10.1",
            resolvedAt: "2026-05-28T00:00:00.000Z",
            citedDoi: "10.1186/s13059-017-1382-0"
          }
        },
        {
          name: "scipy",
          ecosystem: "pypi",
          declaredVersion: "1.13.0",
          lockfileVersion: "1.13.0",
          runtimeVersion: "1.13.0",
          declaredIn: "environment.yml",
          license: "BSD-3-Clause",
          packageUrl: "pkg:pypi/scipy@1.13.0",
          source: { access: "public", repository: "https://github.com/scipy/scipy" },
          evidence: {
            lockfileHash: secondDigest,
            sbomRef: "bom-ref:scipy-1.13.0",
            resolvedAt: "2026-05-28T00:00:00.000Z"
          }
        }
      ],
      recommendations: [
        {
          id: "rec-single-cell-pipeline",
          title: "Recommend the single-cell preprocessing pipeline",
          public: true,
          dependencies: ["pypi:scanpy", "pypi:scipy"]
        }
      ]
    },
    {
      id: "project-quantum-cavity",
      title: "Quantum Cavity Simulation Graph",
      owner: "Materials Consortium",
      publicGraph: true,
      runtime: {
        containerDigest: thirdDigest,
        lockfileHash: cleanDigest,
        executedAt: "2026-03-01T00:00:00.000Z"
      },
      dependencies: [
        {
          name: "qutip",
          ecosystem: "pypi",
          declaredVersion: "4.7.6",
          lockfileVersion: "4.7.6",
          runtimeVersion: "4.7.6",
          declaredIn: "requirements.txt",
          license: "BSD-3-Clause",
          packageUrl: "pkg:pypi/qutip@4.7.6",
          source: { access: "public", repository: "https://github.com/qutip/qutip" },
          deprecated: {
            deprecatedAt: "2026-01-15T00:00:00.000Z",
            replacement: "qutip>=5.0.0"
          },
          evidence: {
            lockfileHash: cleanDigest,
            resolvedAt: "2026-01-20T00:00:00.000Z"
          }
        }
      ],
      recommendations: [
        {
          id: "rec-cavity-operators",
          title: "Suggest cavity-operator examples for adjacent projects",
          public: true,
          dependencies: ["pypi:qutip"]
        }
      ]
    },
    {
      id: "project-clinical-proteomics",
      title: "Clinical Proteomics Cohort Linkage",
      owner: "Kyoto Translational Proteomics",
      publicGraph: true,
      runtime: {
        containerDigest: cleanDigest,
        lockfileHash: cleanDigest,
        executedAt: "2026-05-29T00:00:00.000Z"
      },
      dependencies: [
        {
          name: "clinic-cohort-linker",
          ecosystem: "npm",
          declaredVersion: "2.4.0",
          lockfileVersion: "2.4.0",
          runtimeVersion: "2.4.0",
          declaredIn: "package-lock.json",
          license: "Proprietary",
          packageUrl: "pkg:npm/clinic-cohort-linker@2.4.0",
          source: { access: "private", repository: "ssh://git.example/private/clinic-cohort-linker" },
          evidence: {
            lockfileHash: cleanDigest,
            sbomRef: "bom-ref:clinic-cohort-linker-2.4.0",
            resolvedAt: "2026-05-24T00:00:00.000Z"
          }
        }
      ],
      recommendations: [
        {
          id: "rec-clinical-cohort",
          title: "Recommend the cohort-linkage workflow to public labs",
          public: true,
          dependencies: ["npm:clinic-cohort-linker"]
        }
      ]
    },
    {
      id: "project-legacy-climate",
      title: "Legacy Climate Reuse Map",
      owner: "Oceanic Reanalysis Group",
      publicGraph: true,
      runtime: {
        containerDigest: thirdDigest,
        lockfileHash: thirdDigest,
        executedAt: "2026-05-29T00:00:00.000Z"
      },
      dependencies: [
        {
          name: "node-sass",
          ecosystem: "npm",
          declaredVersion: "4.14.1",
          lockfileVersion: "4.14.1",
          runtimeVersion: "4.14.1",
          declaredIn: "package-lock.json",
          license: "MIT",
          packageUrl: "pkg:npm/node-sass@4.14.1",
          source: { access: "public", repository: "https://github.com/sass/node-sass" },
          deprecated: {
            deprecatedAt: "2024-07-24T00:00:00.000Z"
          },
          advisory: {
            id: "GHSA-node-sass-legacy-build-chain",
            severity: "critical"
          },
          evidence: {
            lockfileHash: thirdDigest,
            sbomRef: "bom-ref:node-sass-4.14.1",
            resolvedAt: "2026-05-20T00:00:00.000Z"
          }
        }
      ],
      recommendations: [
        {
          id: "rec-climate-dashboard",
          title: "Recommend the legacy dashboard build chain",
          public: true,
          dependencies: ["npm:node-sass"]
        }
      ]
    }
  ]
};
