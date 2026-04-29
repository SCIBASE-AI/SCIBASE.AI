# SCIBASE Community & Reputation System

Data + API layer for Issue #15 — peer reviews, CRediT contributor credits, and transparent reputation scoring.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Database | PostgreSQL 16 |
| ORM | Prisma 5 |
| Auth | NextAuth.js v4 (GitHub provider — swap as needed) |
| Validation | Zod |
| Tests | Vitest |

## Setup

The fastest way to run the project is `dev.sh`. It handles Postgres, migrations, seeding, and the dev server in one step. The only hard requirement is Docker (for Postgres).

```bash
# If you have Node ≥ 18 installed:
./dev.sh --demo          # seed sample data + start hot-reload dev server

# If you only have Docker (no Node required on host):
./dev.sh --demo --docker  # builds the image, runs everything in containers
```

The `--demo` flag seeds four researchers (Alice Chen, Bob Mehta, Claire Dupont, Diana Osei) with projects, reviews, endorsements, and reputation snapshots so you can explore the UI immediately.

### Manual setup (optional)

```bash
# 1. Start Postgres
docker compose up -d postgres

# 2. Install dependencies
npm install

# 3. Configure env
cp .env.example .env
# Edit .env — fill in NEXTAUTH_SECRET, GITHUB_ID, GITHUB_SECRET, CRON_SECRET

# 4. Run migrations & generate Prisma client
npm run db:migrate

# 5. Seed review templates and badges
npm run db:seed

# 6. Start dev server
npm run dev
```

## Running tests

```bash
# Unit tests (no database required)
npm run test:unit

# Integration tests (requires Postgres)
cp .env.test.example .env.test
npm run db:migrate:test          # migrate the test database
dotenv -e .env.test -- npm run test:integration
```

## Project layout

```
community-reputation/
├── prisma/
│   ├── schema.prisma           # Full data model
│   └── seed.ts                 # Seeds templates + badges
├── src/
│   ├── lib/
│   │   ├── credit.ts           # CRediT taxonomy enum + labels
│   │   ├── reputation.ts       # Pure scoring function (log1p smoothed)
│   │   ├── visibility.ts       # serializeReview() — anonymity enforcement
│   │   ├── badges.ts           # evaluateBadges() — threshold checks
│   │   ├── review-templates.ts # Discipline-specific template definitions
│   │   ├── auth.ts             # NextAuth config + requireAuth/getAuth helpers
│   │   ├── prisma.ts           # Singleton Prisma client
│   │   └── api.ts              # Shared error handler
│   ├── services/               # Business logic + DB queries (testable without HTTP)
│   │   ├── review.service.ts
│   │   ├── comment.service.ts
│   │   ├── contribution.service.ts
│   │   ├── endorsement.service.ts
│   │   └── reputation.service.ts
│   └── app/api/                # Thin route handlers (parse → service → respond)
│       ├── auth/[...nextauth]/
│       ├── reviews/
│       ├── comments/
│       ├── contributions/
│       ├── endorsements/
│       ├── reputation/[userId]/
│       ├── reputation/[userId]/history/
│       ├── users/[userId]/badges/
│       ├── leaderboards/
│       └── cron/reputation-snapshots/
└── tests/
    ├── unit/                   # reputation, visibility, badges — no DB needed
    └── integration/            # full flows against a real test database
```

## API Reference

All write endpoints require a valid NextAuth session cookie. Read endpoints are public but apply visibility enforcement.

### Reviews

#### `POST /api/reviews`
Create a new review (starts as DRAFT).

```json
{
  "projectId": "cuid",
  "templateId": "cuid (optional)",
  "clarity": 1–5,
  "rigor": 1–5,
  "novelty": 1–5,
  "reproducibility": 1–5,
  "content": "string (required)",
  "visibility": "PUBLIC | SEMI_PRIVATE | ANONYMOUS | DOUBLE_BLIND"
}
```

#### `GET /api/reviews?projectId=&reviewerId=&status=`
List reviews. Defaults to `status=PUBLISHED`. Reviewer identity is masked according to visibility rules.

#### `GET /api/reviews/:id`
Fetch a single review. Applies visibility serialisation.

#### `PATCH /api/reviews/:id`
Update a review (reviewer only). Supports any subset of: `clarity`, `rigor`, `novelty`, `reproducibility`, `content`, `visibility`, `status`.

---

### Comments

#### `POST /api/comments`
```json
{
  "body": "string",
  "targetType": "DOCUMENT | DATASET | CODE_BLOCK | NOTEBOOK_CELL | REVIEW | PROJECT",
  "targetId": "string",
  "anchor": { "start": 0, "end": 10 },
  "parentId": "cuid (optional, for replies)"
}
```

#### `GET /api/comments?targetType=REVIEW&targetId=:id`
List top-level comments with nested replies.

---

### Contributions (CRediT)

#### `POST /api/contributions`
Log a contributor credit against a project.

```json
{
  "projectId": "cuid",
  "role": "CONCEPTUALIZATION | DATA_CURATION | FORMAL_ANALYSIS | ...",
  "description": "string (optional)",
  "occurredAt": "ISO date (optional, for backfilling)"
}
```

Full CRediT taxonomy: `CONCEPTUALIZATION`, `DATA_CURATION`, `FORMAL_ANALYSIS`, `FUNDING_ACQUISITION`, `INVESTIGATION`, `METHODOLOGY`, `PROJECT_ADMINISTRATION`, `RESOURCES`, `SOFTWARE`, `SUPERVISION`, `VALIDATION`, `VISUALIZATION`, `WRITING_ORIGINAL_DRAFT`, `WRITING_REVIEW_EDITING`.

#### `GET /api/contributions?userId=&projectId=`
List contributions. Filter by user, project, or both.

#### `DELETE /api/contributions/:id`
Soft-delete a contribution (author only). Returns `204`.

#### `GET /api/contributions/export?userId=`
Download a CRediT-aligned CSV suitable for tenure/promotion applications. Returns `text/csv` with columns: `project_title`, `project_id`, `credit_role`, `credit_role_label`, `description`, `occurred_at`.

---

### Endorsements

#### `POST /api/endorsements`
```json
{ "endorseeId": "cuid", "skill": "peer-review", "note": "optional" }
```
Self-endorsement returns 422. Rate-limited to 10 endorsements per calendar day per endorser (returns 429 on breach). Re-endorsing after retraction is supported.

#### `DELETE /api/endorsements`
```json
{ "endorseeId": "cuid", "skill": "peer-review" }
```

#### `GET /api/endorsements?endorseeId=:id`
List all active endorsements for a user.

---

### Reputation

#### `GET /api/reputation/:userId`
Returns a live score with full breakdown. Does not write a snapshot.

```json
{
  "user": { "id": "...", "name": "...", "institution": "...", "domain": "..." },
  "total": 42.73,
  "components": {
    "reviewsCompleted": 8,
    "endorsementsReceived": 12,
    "citationsReceived": 0,
    "forksReceived": 0,
    "reproducibilityVerified": 2,
    "bountiesCompleted": 0,
    "badgesEarned": 1
  },
  "breakdown": [
    { "component": "reviewsCompleted", "rawValue": 8, "smoothed": 2.197, "weighted": 54.9 },
    ...
  ]
}
```

#### `GET /api/reputation/:userId/history?limit=90`
Returns up to `limit` (max 365) historical `ReputationSnapshot` records ordered by `computedAt` ascending. Used for score sparklines.

#### `GET /api/users/:userId/badges`
Returns all badges earned by a user with full badge metadata, ordered by `awardedAt` descending.

#### `GET /api/leaderboards?domain=&region=&institution=&limit=50`
Ranked list from the latest `ReputationSnapshot` per user. All filters are optional.

---

### Cron

#### `GET /api/cron/reputation-snapshots`
Recomputes and persists a `ReputationSnapshot` for every user. Protected by `x-cron-secret` header. Configure in Vercel Cron or any scheduler.

---

## Reputation scoring formula

```
score = Σ weight_i × log1p(component_i)

Weights:
  reviewsCompleted        25
  endorsementsReceived    20
  citationsReceived       20
  forksReceived           10
  reproducibilityVerified 10
  bountiesCompleted       10
  badgesEarned             5
  ─────────────────────────
  total                  100
```

`log1p` smoothing prevents power-user dominance — each additional unit of activity contributes less than the previous one. The `breakdown` field in every API response shows the per-component contribution so scores are fully auditable.

**Live components:** `reviewsCompleted`, `endorsementsReceived`, `reproducibilityVerified` (counts VALIDATION-role contributions), `badgesEarned`.

**Stubbed components (return 0 until wired):**
- `citationsReceived` — wire to a DOI/citation service in `gatherComponents()` in `src/services/reputation.service.ts`
- `forksReceived` — wire to your project fork counter in the same function
- `bountiesCompleted` — wire to a `BountyCompletion` table once the bounties feature is built

## Visibility modes

| Mode | Authors see reviewer | Outsiders see reviewer | Reviewer sees self |
|---|---|---|---|
| PUBLIC | Yes | Yes | Yes |
| SEMI_PRIVATE | Yes | No | Yes |
| ANONYMOUS | No | No | Yes |
| DOUBLE_BLIND | No | No | Yes |

All visibility logic flows through `serializeReview()` in `src/lib/visibility.ts` — the single enforcement point for every read path.

## Badges

Seeded badges and their thresholds:

| Slug | Threshold |
|---|---|
| `trusted_reviewer` | reviewsCompleted ≥ 10 |
| `open_science_champion` | endorsementsReceived ≥ 20 |
| `reproducibility_verified` | total score ≥ 50 |
| `prolific_contributor` | citationsReceived ≥ 10 |

Add new badges via `prisma/seed.ts` — no code changes required.

## UI pages

Three pages are included alongside the API:

| Route | Description |
|---|---|
| `/leaderboard` | Ranked table with domain / region / institution filters |
| `/users/:userId` | Profile — reputation breakdown, badges, endorsements by skill, CRediT contributions |
| `/projects/:projectId` | Contributor graph (CRediT), peer reviews with star ratings, inline review submission form, threaded comments per review |

A dev-only **Demo login bar** appears at the top of every page in development. Click any of the four seed users to sign in instantly (no OAuth setup needed). Alice Chen carries the **Admin** badge and can post reviews, comments, and endorsements from the UI.

## Known limitations / future work

- **Citations and forks** feed into the reputation formula but are stubbed at 0. Wire `gatherComponents()` in `src/services/reputation.service.ts` to an external DOI registry and an internal project fork counter.
- **Bounty completions** are stubbed at 0. Wire to a `BountyCompletion` table once that feature is built.
- **Reproducibility badge trigger** — the `reproducibility_verified` badge threshold is currently score-based (total ≥ 50). A production system should gate it on a formal notebook re-run verification flow.
- **Pagination** — list endpoints (`/reviews`, `/comments`, `/contributions`) return all matching rows. Add cursor-based pagination before exposing to large datasets.
- **GitHub OAuth** — `GITHUB_ID` / `GITHUB_SECRET` in `.env.example` are placeholders. The dev credentials provider is a local-only bypass; production login requires real OAuth credentials.
