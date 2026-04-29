import { PrismaClient } from "@prisma/client";
import { beforeEach, afterAll } from "vitest";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.test.example to .env.test and run: dotenv -e .env.test vitest run tests/integration"
  );
}

export const testPrisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

// Truncate all tables between tests to guarantee isolation.
export async function cleanup() {
  const tables = [
    "UserBadge",
    "ReputationSnapshot",
    "Endorsement",
    "Contribution",
    "Comment",
    "Review",
    "ReviewTemplate",
    "Badge",
    "Project",
    "User",
  ];
  for (const table of tables) {
    await testPrisma.$executeRawUnsafe(`TRUNCATE "${table}" RESTART IDENTITY CASCADE`);
  }
}

beforeEach(cleanup);

afterAll(async () => {
  await testPrisma.$disconnect();
});
