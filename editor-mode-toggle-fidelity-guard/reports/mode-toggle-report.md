# Editor Mode Toggle Fidelity Guard Report

Document: manuscript-editor-309
Mode switch: wysiwyg -> markdown
Decision: block-mode-toggle-edit

| Severity | Finding | Action |
| --- | --- | --- |
| block | Block methods-p2 lost equation tokens during mode toggle. | Keep the pre-toggle equation tokens or require manual equation review. |
| hold | Block methods-p2 lost citation keys during mode toggle. | Rebind citation keys before accepting the converted edit. |
| hold | Block methods-p2 lost notebook-cell links during mode toggle. | Restore notebook-cell anchors before shared edit acceptance. |
| hold | Block methods-p2 lost comment anchors during mode toggle. | Re-anchor comments or defer accepting the converted block. |
| block | Block methods-p2 lost tracked suggestions during mode toggle. | Reject the conversion or preserve suggestion provenance. |
| block | Locked block methods-p2 changed during mode toggle without owner approval. | Require lock-owner approval before accepting the converted edit. |
