# Collaborative Reference Merge Guard: collab-editor-neuro-042

Library revision: refs-r17
Decision: hold-export
Generated: 2026-05-22T16:10:00Z
References: 3
Citation anchors: 2

## Visible Actions
- notify-collaborators

## Gated Actions
- sync-reference-library
- export-manuscript

## Findings
- duplicate-source-identifier: doi:10.1101/2026.04.01.123456 - References zotero-a1, bibtex-b9 share source identifier 10.1101/2026.04.01.123456.
- citation-key-collision: nguyen2026atlas - Citation key Nguyen2026Atlas points to multiple references: zotero-a1, bibtex-b9.
- stale-citation-anchor: sec-discussion-p2-c1 - Citation anchor sec-discussion-p2-c1 references Missing2023Trial, which is absent from the merged library.
- locked-reference-edit: endnote-locked - Locked reference endnote-locked has proposed changes to title, doi.

## Remediation Plan
- deduplicate-source-record: doi:10.1101/2026.04.01.123456 - Merge or remove duplicate reference records for 10.1101/2026.04.01.123456 before syncing the collaborative library.
- rename-citation-key: nguyen2026atlas - Assign unique citation keys for zotero-a1, bibtex-b9 and update manuscript anchors before export.
- repair-citation-anchor: sec-discussion-p2-c1 - Reconnect sec-discussion-p2-c1 to an active reference key or remove the stale in-text citation before export.
- review-locked-reference-edit: endnote-locked - Require reference owner approval before applying locked endnote-locked edits from orcid:0000-0002-2222-3333.

---
# Collaborative Reference Merge Guard: collab-editor-ecology-019

Library revision: refs-r08
Decision: merge-review
Generated: 2026-05-22T16:20:00Z
References: 2
Citation anchors: 2

## Visible Actions
- sync-reference-library
- notify-collaborators

## Gated Actions
- export-manuscript

## Findings
- missing-source-metadata: zotero-fieldnote - Reference zotero-fieldnote is missing DOI/PMID or core title, author, and year metadata.
- unresolved-reference-conflict: zotero-fieldnote - Reference zotero-fieldnote still has an unresolved merge conflict from a collaborator library import.

## Remediation Plan
- complete-source-metadata: zotero-fieldnote - Complete DOI/PMID plus title, author, and year metadata for zotero-fieldnote before final manuscript export.
- resolve-reference-conflict: zotero-fieldnote - Pick the winning source metadata for zotero-fieldnote and record the merge decision before export.

---
# Collaborative Reference Merge Guard: collab-editor-physics-007

Library revision: refs-r22
Decision: export-ready
Generated: 2026-05-22T16:30:00Z
References: 2
Citation anchors: 2

## Visible Actions
- sync-reference-library
- export-manuscript
- notify-collaborators

## Gated Actions
- None

## Findings
- None

## Remediation Plan
- No remediation required
