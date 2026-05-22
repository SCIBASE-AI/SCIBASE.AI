# Dependency Advisory SBOM Guard Report

As of: 2026-05-22
Portfolio digest: `afeb093df56a72feaaae7c6225929330bacd368c5b4b9790161ad4a2abc5e355`

## Summary

- Artifacts reviewed: 5
- Advisory findings: 3
- Blocked artifacts: ART-NB-440, ART-MODEL-880, ART-NB-510
- Actions: quarantine_execution_surfaces=2, refresh_lockfile_before_rerun=1, hold_missing_lockfile=1, allow_preview_rerun_export=1

## Artifact Decisions

| Artifact | Type | Action | Severity | Findings | Reason |
| --- | --- | --- | --- | ---: | --- |
| ART-NB-440 | notebook | quarantine_execution_surfaces | critical | 1 | critical or high runtime advisory affects executable preview/rerun/export surfaces |
| ART-MODEL-880 | model-training-code | quarantine_execution_surfaces | critical | 1 | critical or high runtime advisory affects executable preview/rerun/export surfaces |
| ART-CODE-120 | code | refresh_lockfile_before_rerun | medium | 1 | lockfile freshness exceeds policy window |
| ART-NB-510 | notebook | hold_missing_lockfile | high | 0 | executable artifact has no lockfile/SBOM freshness evidence |
| ART-NB-700 | notebook | allow_preview_rerun_export | low | 0 | no matching advisories and lockfile evidence satisfies policy |

## Guardrails

- Uses synthetic SBOM, lockfile, and advisory records only.
- Does not call package registries, vulnerability scanners, external SBOM services, or execution sandboxes.
- Holds executable previews, reproduce buttons, scheduled reruns, and export bundles when critical runtime advisories match.
- Preserves deterministic audit digests for reviewer packets.
