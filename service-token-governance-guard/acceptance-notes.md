# Acceptance Notes

- Dependency-free Node module with synthetic data only.
- Validates service accounts and API tokens before they can access project artifacts.
- Blocks wildcard scopes, unrestricted restricted-data downloads, missing owner sponsorship, missing token expiry, stale rotation, unverified external integrations, and missing approval events.
- Emits a reviewer-ready JSON packet, Markdown owner queue, SVG summary, and MP4 demo.
- Keeps the public artifact free of credentials, secrets, private keys, and payment information.
