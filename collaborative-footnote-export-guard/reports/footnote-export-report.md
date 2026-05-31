# Footnote Export Guard Report

Workspace: editor-room-ms-042
Decision: block-export

| Severity | Finding | Action |
| --- | --- | --- |
| block | Marker fn-5 is present in the manuscript without matching note text. | Add the missing note text or remove the marker before export. |
| block | Private note fn-2 would be included in the export packet. | Redact the note or convert it to an export-safe public note after review. |
| block | Note fn-2 changed after section methods entered final-review lock. | Ask the section owner to unlock, approve, or roll back the note edit. |
| hold | Source-backed note fn-3 is missing a citation binding. | Bind the note to an approved bibliography entry before export. |
| warn | Note fn-4 has text but no visible manuscript marker. | Either insert the marker in the manuscript or exclude the unused note from export. |
| hold | Footnote marker fn-2 appears in multiple manuscript sections. | Assign unique note markers or confirm that repeated references use an explicit shared-note alias. |
| hold | Endnote fn-2 is exported as 3, but first appears at position 2. | Rebuild the endnote list from first marker appearance before journal export. |
| hold | Endnote fn-3 is exported as 2, but first appears at position 3. | Rebuild the endnote list from first marker appearance before journal export. |
