# Chat Mention Scope Guard Report

Workspace: editor-room-chat-118
Decision: block-mention-fanout

| Severity | Finding | Action |
| --- | --- | --- |
| hold | Reviewer B is mentioned outside their allowed section scope. | Invite the collaborator to the section or remove the mention. |
| block | Author-visible thread thread-1 would reveal blinded reviewer Reviewer B. | Redact the reviewer mention or move the message to a reviewer-only thread. |
| hold | Reviewer B is mentioned on notebook cell cell-qc-4 without cell access. | Grant cell access or move the mention to a document-level thread. |
| hold | External Analyst is mentioned outside their allowed section scope. | Invite the collaborator to the section or remove the mention. |
| block | External collaborator External Analyst is mentioned in restricted section methods. | Remove the mention or approve restricted-section access before fanout. |
| hold | External Analyst is mentioned on notebook cell cell-qc-4 without cell access. | Grant cell access or move the mention to a document-level thread. |
| hold | Thread thread-1 mentions collaborators inside locked section methods without owner approval. | Ask the section owner to approve the mention fanout or defer it until unlock. |
| hold | Thread thread-1 fanout preview includes a private section title. | Redact the section title in the mention preview before alerting collaborators. |
