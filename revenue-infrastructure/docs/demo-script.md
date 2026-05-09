# Demo script

1. Start the app with `npm run dev`.
2. Open `http://localhost:3000`.
3. Show the platform revenue summary cards:
   - Subscription MRR
   - Usage MRR
   - Licensing ARR
   - Projected MRR
4. Click `Generate invoice` for:
   - Ada Chen to show an individual plan with coupon and top-up credits
   - Quantum Materials Lab to show annual billing, seat expansion, volume discount, and EU tax
   - European Open Science Consortium to show institutional invoicing and licensing API overages
5. Click `Preview export` to show aggregated licensing data and confirm private events are excluded.
6. Run `npm test` to verify billing, entitlement, revenue summary, and licensing privacy behavior.
