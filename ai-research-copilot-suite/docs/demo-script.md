# Demo Script

1. Run `npm start`.
2. Open `http://localhost:4316`.
3. Confirm the dashboard shows four summary metrics.
4. Inspect the peer-review findings for missing citations and an overstated therapeutic claim.
5. Inspect reproducibility status and prior replication attempts.
6. Inspect the ranked research-gap opportunities and recommended next steps.
7. Run `npm test` to confirm the deterministic engines match the expected behavior.

The dashboard is backed by JSON endpoints, so reviewers can inspect the same payloads through `/api/dashboard`, `/api/review`, `/api/reproducibility`, and `/api/gaps`.
