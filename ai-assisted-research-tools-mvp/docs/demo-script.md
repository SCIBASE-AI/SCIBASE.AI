# Demo Script

1. Run `npm run check`.
2. Inspect `docs/demo/assistant-report-snapshot.json` for the API payload.
3. Inspect `docs/demo/ai-assisted-research-tools-demo.gif` for the short walkthrough.
4. Run `npm start` and open `http://localhost:4183`.
5. Confirm the dashboard shows summary modes, peer-review diagnostics, and citation recommendations.
6. Use `curl -s "http://localhost:4183/api/summary?mode=layperson"` to verify alternate summary mode output.
7. Use `curl -s "http://localhost:4183/api/citations?style=nature"` to verify formatted citation recommendations.
