# Requirements Map

| Issue #12 requirement | Coverage in this slice |
| --- | --- |
| Real-time collaboration | Consumes live collaboration threads, presence export settings, and section version state before external release. |
| Inline comments and suggestions | Blocks private or unresolved release-blocking threads from leaking in reviewer packets. |
| Change tracking and version history | Compares exported section versions with approved and latest collaborative versions. |
| Locking / controlled sections | Treats restricted artifacts and embargoed evidence as release gates. |
| Scientific formatting and publication workflow | Protects journal/preprint release packets from embargo, identity, and policy failures. |
| Jupyter/notebook outputs | Supports notebook-output artifacts through the same embargo/restricted artifact policy model. |
| Autosave and named versions | Emits deterministic release fingerprints and safe manifests for reviewer handoff. |
| Demo requirement | `npm run demo` generates a short local MP4 walkthrough plus reviewer artifacts. |
