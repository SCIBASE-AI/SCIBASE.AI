# Acceptance Notes

- Dependency-free Node.js implementation.
- Synthetic fixtures only; no private graph data, external ontology services, credentials, network calls, or live graph mutations.
- TDD red check was observed before implementation: `npm --prefix knowledge-graph-temporal-validity-guard test` failed because `./index` did not exist.
- Demo intentionally includes one temporal hold packet and one temporal-ready packet.
