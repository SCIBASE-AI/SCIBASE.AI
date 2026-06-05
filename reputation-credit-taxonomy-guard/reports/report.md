# Reputation Credit Taxonomy Guard

## Overview
This module guarantees that academic and platform reputation points strictly adhere to the 14 defined roles within the international CRediT (Contributor Roles Taxonomy) specification.

## Validation Rules
1. **Taxonomy Enforcement**: Block custom, free-text, or arbitrary roles (e.g., 'Lead Hacker', 'Idea Guy') from generating reputation.
2. **Payload Completeness**: Refuse payloads without explicitly defined 'contributors' matrices.
3. **Uniformity**: Standardize incoming attribution records for safe multi-agent ingestion.

## Security & Safety
This is a strict payload validator and formatting module. It makes zero external taxonomy API calls, keeps sensitive user IDs isolated from execution, and prevents malicious metric inflation. It operates solely on synthetic test payloads in this slice.
