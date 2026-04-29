import { PrismaClient, Prisma } from "@prisma/client";
import { computeReputation, type ReputationComponents } from "@/lib/reputation";
import { evaluateBadges } from "@/lib/badges";

export interface LeaderboardEntry {
  id: string;
  name: string | null;
  institution: string | null;
  domain: string | null;
  region: string | null;
  total: number;
  computedAt: Date;
}

// Gathers live component counts from the DB for a single user.
// Citations and forks are stubs until an external data source is wired in.
export async function gatherComponents(
  prisma: PrismaClient,
  userId: string
): Promise<ReputationComponents> {
  const [reviewsCompleted, endorsementsReceived, badgesEarned, reproducibilityVerified] =
    await Promise.all([
      prisma.review.count({
        where: { reviewerId: userId, status: "PUBLISHED", deletedAt: null },
      }),
      prisma.endorsement.count({
        where: { endorseeId: userId, deletedAt: null },
      }),
      prisma.userBadge.count({ where: { userId } }),
      // Count contributions where the user performed a VALIDATION role — the
      // closest proxy for "this user's work has been independently reproduced"
      // until a dedicated reproducibility-verification workflow is built.
      prisma.contribution.count({
        where: { userId, role: "VALIDATION", deletedAt: null },
      }),
    ]);

  return {
    reviewsCompleted,
    endorsementsReceived,
    // TODO: populate from DOI/citation service and project fork counter
    citationsReceived: 0,
    forksReceived: 0,
    reproducibilityVerified,
    // TODO: query from a BountyCompletion table once the bounties feature is built
    bountiesCompleted: 0,
    badgesEarned,
  };
}

// Computes reputation, writes an append-only snapshot, and awards any newly
// unlocked badges. Safe to call concurrently (UserBadge upsert swallows races).
export async function writeSnapshot(prisma: PrismaClient, userId: string) {
  const components = await gatherComponents(prisma, userId);
  const { total, breakdown } = computeReputation(components);

  const snapshot = await prisma.reputationSnapshot.create({
    data: {
      userId,
      total,
      ...components,
      breakdown: breakdown as unknown as Prisma.InputJsonValue,
    },
  });

  const [allBadges, existingUserBadges] = await Promise.all([
    prisma.badge.findMany(),
    prisma.userBadge.findMany({ where: { userId }, include: { badge: true } }),
  ]);

  const newBadges = evaluateBadges(
    components,
    total,
    allBadges,
    existingUserBadges.map((ub) => ub.badge)
  );

  for (const badge of newBadges) {
    await prisma.userBadge
      .create({ data: { userId, badgeId: badge.id } })
      .catch(() => {}); // ignore races — @@unique constraint handles duplicates
  }

  return snapshot;
}

// Returns the latest reputation snapshot per user, filtered and ranked.
// Uses LATERAL JOIN for efficient "latest row per group" without a full scan.
export async function getLeaderboard(
  prisma: PrismaClient,
  filters: { domain?: string; region?: string; institution?: string },
  limit = 50
): Promise<LeaderboardEntry[]> {
  const domain = filters.domain ?? null;
  const region = filters.region ?? null;
  const institution = filters.institution ?? null;

  return prisma.$queryRaw<LeaderboardEntry[]>`
    SELECT
      u.id,
      u.name,
      u.institution,
      u.domain,
      u.region,
      latest.total,
      latest."computedAt"
    FROM "User" u
    JOIN LATERAL (
      SELECT total, "computedAt"
      FROM "ReputationSnapshot"
      WHERE "userId" = u.id
      ORDER BY "computedAt" DESC
      LIMIT 1
    ) latest ON true
    WHERE
      (${domain}::text IS NULL OR u.domain = ${domain})
      AND (${region}::text IS NULL OR u.region = ${region})
      AND (${institution}::text IS NULL OR u.institution = ${institution})
    ORDER BY latest.total DESC
    LIMIT ${limit}
  `;
}
