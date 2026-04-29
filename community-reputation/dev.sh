#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# dev.sh — start the SCIBASE Community & Reputation API locally
#
# Usage:
#   ./dev.sh            # auto-detect mode: local if Node ≥18, Docker otherwise
#   ./dev.sh --demo     # also seeds sample users, projects, reviews & endorsements
#   ./dev.sh --reset    # wipe the DB and re-seed before starting
#   ./dev.sh --docker   # force Docker mode (no Node.js required on host)
#
# Docker mode:  requires only Docker Desktop — builds the image and runs
#               everything (Postgres + app + migrations + seed) via compose.
# Local mode:   faster hot-reload dev server; requires Node ≥18 + npm.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Colours ───────────────────────────────────────────────────────────────────
GRN='\033[0;32m'; YLW='\033[1;33m'; BLU='\033[0;34m'
CYN='\033[0;36m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${GRN}  ✓${NC}  $1"; }
info() { echo -e "${BLU}  →${NC}  $1"; }
warn() { echo -e "${YLW}  !${NC}  $1"; }
die()  { echo -e "${RED}  ✗${NC}  $1" >&2; exit 1; }
step() { echo -e "\n${BOLD}${CYN}── $1${NC}"; }

# ── Flags ─────────────────────────────────────────────────────────────────────
DEMO=false
RESET=false
FORCE_DOCKER=false
for arg in "$@"; do
  [[ "$arg" == "--demo"   ]] && DEMO=true
  [[ "$arg" == "--reset"  ]] && RESET=true
  [[ "$arg" == "--docker" ]] && FORCE_DOCKER=true
done

# ── Mode detection ─────────────────────────────────────────────────────────────
has_node() {
  command -v node &>/dev/null || return 1
  local ver
  ver=$(node -e "process.stdout.write(process.versions.node)" 2>/dev/null)
  local major="${ver%%.*}"
  [[ "$major" -ge 18 ]] 2>/dev/null
}

USE_DOCKER=false
if $FORCE_DOCKER; then
  USE_DOCKER=true
elif ! has_node; then
  warn "Node.js ≥18 not found — switching to Docker mode"
  USE_DOCKER=true
fi

command -v docker &>/dev/null || die "Docker is required. Install Docker Desktop from https://docker.com"

# ── Docker mode ───────────────────────────────────────────────────────────────
if $USE_DOCKER; then
  step "Docker mode  (no Node.js required)"

  command -v docker &>/dev/null || die "Docker not found"
  docker info &>/dev/null        || die "Docker daemon is not running — start Docker Desktop"

  if $RESET; then
    info "Removing existing containers and volumes..."
    docker compose --profile full down -v 2>/dev/null || true
    log "Cleaned up"
  fi

  info "Building image and starting services (this takes ~2 min on first run)..."
  $DEMO && info "Demo seed enabled — sample data will be created automatically"

  export DEMO_SEED=$( $DEMO && echo "true" || echo "false" )
  docker compose --profile full up --build -d

  # Wait for the app to be healthy
  info "Waiting for app to be ready..."
  for i in $(seq 1 30); do
    if curl -sf http://localhost:3000/api/leaderboards >/dev/null 2>&1; then break; fi
    sleep 2
  done

  echo ""
  echo -e "${BOLD}${CYN}  ╔══════════════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${CYN}  ║   SCIBASE Community & Reputation                    ║${NC}"
  echo -e "${BOLD}${CYN}  ║   http://localhost:3000                              ║${NC}"
  echo -e "${BOLD}${CYN}  ╚══════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  Logs:  ${YLW}docker compose --profile full logs -f app${NC}"
  echo -e "  Stop:  ${YLW}docker compose --profile full down${NC}"
  echo ""
  exit 0
fi

# ── Local mode ────────────────────────────────────────────────────────────────

# ── 1. Database ───────────────────────────────────────────────────────────────
step "Database"

DB_USER="postgres"
DB_NAME="scibase_community"
POSTGRES_CTR=""

# Prefer the shared demo-postgres container if it's already running
if docker ps --format "{{.Names}}" 2>/dev/null | grep -q "^demo-postgres$"; then
  POSTGRES_CTR="demo-postgres"
  DB_PASS="postgres"
  log "Using demo-postgres container  (postgres / postgres)"
elif docker ps --format "{{.Names}}" 2>/dev/null | grep -qE "community.reputation.*postgres|postgres.*community.reputation"; then
  POSTGRES_CTR="$(docker ps --format "{{.Names}}" | grep -E "community.reputation.*postgres|postgres.*community.reputation" | head -1)"
  DB_PASS="password"
  log "Using existing community-reputation postgres container"
else
  command -v docker compose &>/dev/null || die "docker compose not found — start Postgres manually and set DATABASE_URL in .env"
  info "Starting postgres via docker compose..."
  docker compose up -d postgres
  for i in {1..20}; do
    docker compose exec -T postgres pg_isready -U postgres &>/dev/null && break
    sleep 1
  done
  POSTGRES_CTR="$(docker compose ps -q postgres 2>/dev/null | head -1)"
  DB_PASS="password"
  log "Started community-reputation postgres container"
fi

DB_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"

# Create the database if it doesn't exist
if ! docker exec "$POSTGRES_CTR" psql -U "$DB_USER" \
     -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null | grep -q 1; then
  docker exec "$POSTGRES_CTR" psql -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;" >/dev/null
  log "Created database  $DB_NAME"
else
  log "Database  $DB_NAME  already exists"
fi

# ── 2. .env ───────────────────────────────────────────────────────────────────
step "Environment"

if [ ! -f .env ]; then
  cat > .env <<ENV
DATABASE_URL="${DB_URL}"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dev-secret-not-for-production"
GITHUB_ID="placeholder"
GITHUB_SECRET="placeholder"
CRON_SECRET="dev-cron-secret"
ENV
  log "Created .env"
  warn "GITHUB_ID / GITHUB_SECRET are placeholders — OAuth login won't work until you set real values"
else
  log ".env already exists — skipping"
fi

# ── 3. Dependencies ───────────────────────────────────────────────────────────
step "Dependencies"

if [ ! -d node_modules ]; then
  info "npm install..."
  npm install --silent
  log "Packages installed"
else
  log "node_modules present — skipping"
fi

# ── 4. Prisma ─────────────────────────────────────────────────────────────────
step "Prisma"

# The macOS schema-engine binary can SIGABRT on the first run; retry once.
# stderr is NOT suppressed so failures are visible rather than silently killing the script.
info "Generating Prisma client..."
generate_prisma() {
  PRISMA_CLI_BINARY_TARGETS=darwin NODE_OPTIONS="--max-old-space-size=4096" \
    npx prisma generate >/dev/null
}
generate_prisma || { warn "First attempt failed — retrying..."; generate_prisma; } || \
  die "Prisma client generation failed — run  npx prisma generate  for full output"
log "Prisma client ready"

if $RESET; then
  info "Resetting database (--reset)..."
  DATABASE_URL="$DB_URL" npx prisma migrate reset --force --skip-seed >/dev/null
  log "Database reset"
fi

info "Applying migrations..."
DATABASE_URL="$DB_URL" npx prisma migrate deploy >/dev/null
log "Migrations applied"

info "Seeding review templates and badges..."
DATABASE_URL="$DB_URL" npx tsx prisma/seed.ts >/dev/null
log "Templates and badges seeded"

# ── 5. Demo data ──────────────────────────────────────────────────────────────
if $DEMO; then
  step "Demo data"
  info "Creating sample users, projects, reviews, and endorsements..."
  DATABASE_URL="$DB_URL" npx tsx prisma/demo-seed.ts
fi

# ── 6. Launch ─────────────────────────────────────────────────────────────────
step "Launching"
echo ""
echo -e "${BOLD}${CYN}  ╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYN}  ║   SCIBASE Community & Reputation API                ║${NC}"
echo -e "${BOLD}${CYN}  ║   http://localhost:3000  (hot-reload dev server)     ║${NC}"
echo -e "${BOLD}${CYN}  ╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Quick curl tests:${NC}"
echo -e "  ${YLW}curl -s 'http://localhost:3000/api/leaderboards' | jq .${NC}"
echo -e "  ${YLW}curl -s 'http://localhost:3000/api/leaderboards?domain=biology' | jq .${NC}"
echo -e "  ${YLW}curl -s 'http://localhost:3000/api/reviews' | jq .${NC}"
echo ""
if ! $DEMO; then
  echo -e "  ${YLW}Tip: run  ${BOLD}./dev.sh --demo${NC}${YLW}  to seed sample data you can browse immediately${NC}"
  echo ""
fi

export DATABASE_URL="$DB_URL"
npm run dev
