# Section Lock Autosave Auditor

This prototype covers controlled section locking, autosave, and version-history safety for the real-time collaborative research editor.

It audits synthetic collaboration sessions for:

- non-owner edits inside hard-locked manuscript sections
- expired lock leases
- unauthorized unlock events
- cursor presence inside locked regions
- offline edits that conflict with active locks
- autosave lag against a project policy
- missing version parents
- restore requests that would overwrite unsaved edits
- named-version creation while the document is dirty

## Run

```sh
node collaborative-research-editor/section-lock-autosave-auditor/test.js
node collaborative-research-editor/section-lock-autosave-auditor/demo.js
node collaborative-research-editor/section-lock-autosave-auditor/make-demo-video.js
```

All fixtures are synthetic. The auditor performs no private document, account, credential, notebook, kernel, or external API access.
