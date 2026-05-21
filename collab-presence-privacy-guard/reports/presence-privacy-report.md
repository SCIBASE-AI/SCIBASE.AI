# Collaborative Presence Privacy Report

Status: hold
Audit digest: 0295bdd6cf55dba2613a9b3b27c3ec85dd597c30da2e64a0784fe5b938d0d978

## Room

Title: Manuscript v2 collaborative editing room

## Broadcast Summary

- Safe broadcasts: 0
- Warning broadcasts: 0
- Blocked broadcasts: 5

## Viewer Evaluation

| Viewer | Presence user | Status | Broadcast location | Blockers |
| --- | --- | --- | --- | --- |
| u-viewer | u-owner | blocked | Restricted section | viewer_lacks_section_access, locked_sensitive_section_cursor |
| u-viewer | u-reviewer | blocked | Restricted section | viewer_lacks_section_access, anonymous_identity_leak |
| u-viewer | u-collab | blocked | Restricted section | viewer_lacks_section_access, locked_sensitive_section_cursor |
| u-collab | u-owner | blocked | Restricted section | viewer_lacks_section_access, locked_sensitive_section_cursor |
| u-collab | u-reviewer | blocked | Restricted section | viewer_lacks_section_access, anonymous_identity_leak |

## Blockers

- u-viewer_u-owner_viewer_lacks_section_access
- u-viewer_u-owner_locked_sensitive_section_cursor
- u-viewer_u-reviewer_viewer_lacks_section_access
- u-viewer_u-reviewer_anonymous_identity_leak
- u-viewer_u-collab_viewer_lacks_section_access
- u-viewer_u-collab_locked_sensitive_section_cursor
- u-collab_u-owner_viewer_lacks_section_access
- u-collab_u-owner_locked_sensitive_section_cursor
- u-collab_u-reviewer_viewer_lacks_section_access
- u-collab_u-reviewer_anonymous_identity_leak

## Warnings

- u-viewer_u-collab_stale_presence

## Reviewer Actions

- u-viewer_u-owner_suppress_cursor_location_for_viewer
- u-viewer_u-owner_redact_locked_section_cursor_anchor
- u-viewer_u-reviewer_suppress_cursor_location_for_viewer
- u-viewer_u-reviewer_replace_display_name_with_alias
- u-viewer_u-collab_expire_stale_presence_session
- u-viewer_u-collab_suppress_cursor_location_for_viewer
- u-viewer_u-collab_redact_locked_section_cursor_anchor
- u-collab_u-owner_suppress_cursor_location_for_viewer
- u-collab_u-owner_redact_locked_section_cursor_anchor
- u-collab_u-reviewer_suppress_cursor_location_for_viewer
- u-collab_u-reviewer_replace_display_name_with_alias
