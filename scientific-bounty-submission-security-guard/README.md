# Scientific Bounty Submission Security Guard

Focused slice for SCIBASE issue #18, Scientific Bounty System.

This module reviews solver submission packages before sponsor or reviewer access. It detects unsafe executable artifacts, path traversal, dependency install hooks, privileged containers, notebook network calls, secret-like environment values, Office macros, and reviewer-sandbox gaps.

## What it checks

- Submission manifests cannot write outside the review workspace.
- Executable files require explicit declaration, hash evidence, and reviewer sandbox approval.
- Dependency lifecycle scripts are blocked or stripped before reviewer execution.
- Notebooks with shell, network, or local-path cells are quarantined.
- Containers cannot request privileged mode, host mounts, or uncontrolled outbound network.
- Secret-like environment variables are not bundled into challenge packages.
- Sponsor/reviewer packets get deterministic allow, sanitize, quarantine, or hold decisions.

## Local verification

```bash
node scientific-bounty-submission-security-guard/test.js
node scientific-bounty-submission-security-guard/demo.js
node scientific-bounty-submission-security-guard/make-demo-video.js
```

Generated reviewer artifacts are written to `scientific-bounty-submission-security-guard/reports/`.

## Safety

Fixtures are synthetic. The module does not execute submitted code, unpack archives, call malware scanners, contact package registries, use credentials, or touch live challenge workspaces.
