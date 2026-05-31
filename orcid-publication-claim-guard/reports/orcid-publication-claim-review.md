# ORCID Publication Claim Guard Report

Researcher: Ada Kim (0000-0002-1825-0097)
Generated: 2026-05-31T06:40:07.465Z

## Summary

- Total imports checked: 5
- Auto accepted: 1
- Needs review: 1
- Quarantined: 3

## Decisions

### pub-exact-orcid - auto_accept

- Title: Reproducible notebooks for kinase pathway triage
- DOI: 10.5555/northbridge.2025.042
- Score: 86
- Audit digest: fb4879a5f58f01e8166d49170546a7fffb452782cbb1cffe750f9dafe22ac106
- Evidence: exact ORCID match on an author row; author affiliation matches researcher profile; known coauthor overlap: mina patel; publication year falls inside profile window; normalized DOI: 10.5555/northbridge.2025.042
- Blockers: none
- Actions: attach to profile and include in reputation metrics

### pub-homonym-orcid-mismatch - quarantine

- Title: Hydrogen electrolyzer scheduling in microgrids
- DOI: 10.7777/westlake.2026.014
- Score: 14
- Audit digest: 6091cef81158046c74cd975865b92a7c6e5bf2e79f75e432b0f36ad4901575bf
- Evidence: publication year falls inside profile window; normalized DOI: 10.7777/westlake.2026.014
- Blockers: matching name has different ORCID 0000-0003-4444-7788; author affiliation 'Westlake Energy Systems' is not in profile
- Actions: treat as homonym until the alternate ORCID is reconciled; ask researcher to confirm affiliation at publication time

### pub-weak-but-reviewable - review

- Title: Sparse pathway graphs for reproducibility audits
- DOI: 10.5555/northbridge.2026.081
- Score: 59
- Audit digest: 0da5f48db0ec6ce9f5a6f9abeefb7b2254df777d8bf85c7ede618790e83e30fb
- Evidence: normalized author name matches profile name or alias; author affiliation matches researcher profile; known coauthor overlap: grace lee; publication year falls inside profile window; normalized DOI: 10.5555/northbridge.2026.081
- Blockers: none
- Actions: hold for reviewer approval before affecting metrics

### pub-duplicate-doi - quarantine

- Title: Grid-scale battery dispatch under volatile demand
- DOI: 10.7777/westlake.2024.009
- Score: 32
- Audit digest: 34a98c869c817ce327a67f538283d188787e86da2b21be6fd5d3c0fa20413799
- Evidence: normalized author name matches profile name or alias; publication year falls inside profile window; normalized DOI: 10.7777/westlake.2024.009
- Blockers: DOI already claimed by researcher-ada-kim-energy: 10.7777/westlake.2024.009; author affiliation 'Westlake Energy Systems' is not in profile
- Actions: quarantine duplicate DOI until the existing owner is reviewed; ask researcher to confirm affiliation at publication time

### pub-retracted - quarantine

- Title: Automated profile scoring from unreconciled citations
- DOI: 10.9999/example.2022.100
- Score: 59
- Audit digest: 57b56560faf9b3e7319ac2ed2050123164d26c77aff9637167af98977355bfd3
- Evidence: normalized author name matches profile name or alias; author affiliation matches researcher profile; known coauthor overlap: omar singh; publication year falls inside profile window; normalized DOI: 10.9999/example.2022.100
- Blockers: publication status is retracted
- Actions: hold non-published or retracted work out of profile metrics

