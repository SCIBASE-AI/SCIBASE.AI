# Fork Provenance Attribution Audit: Derived Neuro Biomarker Repository

- Decision: hold-publication-export
- Risk score: 100
- Commits reviewed: 3
- Merge requests reviewed: 2
- Tags reviewed: 1
- Export bundles reviewed: 1
- Audit digest: 922a03cd0afd1781

## Findings

- [high] ATTRIBUTION_DROPPED
  - Upstream contributor lin is absent from derived repository attribution.
  - Recommendation: Restore contributor attribution from the upstream fork lineage.
- [high] MERGE_BASE_AMBIGUOUS
  - Merge request mr-101 has missing or unknown merge base missing-base.
  - Recommendation: Require a single merge base or explicit conflict-resolution provenance.
- [critical] UNREVIEWED_PROVENANCE_REWRITE
  - Merge request mr-102 rewrites history without maintainer provenance review.
  - Recommendation: Require maintainer review for history rewrites affecting provenance.
- [high] DOI_VERSION_DRIFT
  - DOI metadata for preprint-v2.1 does not match tag commit or metadata hash.
  - Recommendation: Reissue or correct DOI metadata for the tagged repository version.
- [critical] EXPORT_MANIFEST_HASH_MISMATCH
  - Export export-001 manifest hash not-the-real-hash does not match computed 01898eb9e33b80d5.
  - Recommendation: Regenerate the export manifest from the committed files.
- [medium] DOI_VERSION_DRIFT
  - Export export-001 points to exp-101 while tag preprint-v2.1 points to tag-200.
  - Recommendation: Reissue or correct DOI metadata for the tagged repository version.
- [critical] DERIVATION_LICENSE_CONFLICT
  - Derived license proprietary conflicts with upstream CC-BY-4.0.
  - Recommendation: Block export until derivative licensing is compatible with upstream terms.
- [medium] CITATION_BADGE_STALE
  - Citation badge cite-preprint-v2 is stale for tag preprint-v2.1.
  - Recommendation: Regenerate citation badge metadata from the latest tagged version.

## Provenance Gates

- [x] Fork lineage points to an upstream project and commit.
- [!] Derived repository preserves upstream contributor attribution.
- [!] Merge requests have clear bases and reviewed history rewrites.
- [!] DOI, tag, citation, and export metadata agree.
- [!] Derivative license is compatible with upstream terms.
