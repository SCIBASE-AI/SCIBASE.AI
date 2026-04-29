#!/bin/sh
set -e

echo "→  Running migrations..."
npx prisma migrate deploy

echo "→  Seeding templates and badges..."
npx tsx prisma/seed.ts

if [ "${DEMO_SEED:-false}" = "true" ]; then
  echo "→  Seeding demo data..."
  npx tsx prisma/demo-seed.ts
fi

echo "→  Starting server..."
exec npm start
