/**
 * Demo seed — creates realistic sample data for local exploration.
 * Safe to run multiple times (upserts where possible, skips existing rows).
 *
 * Run via:  DATABASE_URL=... npx tsx prisma/demo-seed.ts
 * Or via:   ./dev.sh --demo
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { computeReputation, type ReputationComponents } from "../src/lib/reputation";

const prisma = new PrismaClient();

// ── helpers ──────────────────────────────────────────────────────────────────

const upsertUser = (data: {
  email: string;
  name: string;
  institution: string;
  domain: string;
  region: string;
}) =>
  prisma.user.upsert({
    where: { email: data.email },
    update: {},
    create: data,
  });

async function snapshotUser(userId: string) {
  const [reviewsCompleted, endorsementsReceived, badgesEarned, reproducibilityVerified] =
    await Promise.all([
      prisma.review.count({ where: { reviewerId: userId, status: "PUBLISHED", deletedAt: null } }),
      prisma.endorsement.count({ where: { endorseeId: userId, deletedAt: null } }),
      prisma.userBadge.count({ where: { userId } }),
      prisma.contribution.count({ where: { userId, role: "VALIDATION", deletedAt: null } }),
    ]);

  const components: ReputationComponents = {
    reviewsCompleted,
    endorsementsReceived,
    citationsReceived: 0,
    forksReceived: 0,
    reproducibilityVerified,
    bountiesCompleted: 0,
    badgesEarned,
  };
  const { total, breakdown } = computeReputation(components);

  await prisma.reputationSnapshot.create({
    data: {
      userId,
      total,
      ...components,
      breakdown: breakdown as unknown as Prisma.InputJsonValue,
    },
  });

  // Award any newly unlocked badges
  const allBadges = await prisma.badge.findMany();
  const existingBadgeSlugs = new Set(
    (await prisma.userBadge.findMany({ where: { userId }, include: { badge: true } })).map(
      (ub) => ub.badge.slug
    )
  );
  for (const badge of allBadges) {
    if (existingBadgeSlugs.has(badge.slug)) continue;
    const threshold = badge.threshold as { component: string; value: number };
    const value =
      threshold.component === "total"
        ? total
        : (components[threshold.component as keyof ReputationComponents] ?? 0);
    if (value >= threshold.value) {
      await prisma.userBadge.create({ data: { userId, badgeId: badge.id } }).catch(() => {});
    }
  }

  return total;
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  // ── Users ─────────────────────────────────────────────────────────────────
  const alice = await upsertUser({
    email: "alice.chen@mit.edu",
    name: "Alice Chen",
    institution: "MIT",
    domain: "biology",
    region: "us",
  });
  const bob = await upsertUser({
    email: "bob.mehta@stanford.edu",
    name: "Bob Mehta",
    institution: "Stanford",
    domain: "physics",
    region: "us",
  });
  const claire = await upsertUser({
    email: "claire.dupont@oxford.ac.uk",
    name: "Claire Dupont",
    institution: "University of Oxford",
    domain: "social_sciences",
    region: "eu",
  });
  const diana = await upsertUser({
    email: "diana.osei@harvard.edu",
    name: "Diana Osei",
    institution: "Harvard",
    domain: "biology",
    region: "us",
  });

  // ── Projects ──────────────────────────────────────────────────────────────
  const aliceProject = await prisma.project.upsert({
    where: { id: "demo-project-alice" },
    update: {},
    create: {
      id: "demo-project-alice",
      title: "CRISPR off-target effects in human stem cells",
      ownerId: alice.id,
    },
  });
  const bobProject = await prisma.project.upsert({
    where: { id: "demo-project-bob" },
    update: {},
    create: {
      id: "demo-project-bob",
      title: "Topological insulators at room temperature",
      ownerId: bob.id,
    },
  });
  const claireProject = await prisma.project.upsert({
    where: { id: "demo-project-claire" },
    update: {},
    create: {
      id: "demo-project-claire",
      title: "Social media echo chambers and political polarisation",
      ownerId: claire.id,
    },
  });

  // ── Contributions (CRediT) ────────────────────────────────────────────────
  const contrib = async (userId: string, projectId: string, role: string, description?: string) => {
    const existing = await prisma.contribution.findFirst({ where: { userId, projectId, role: role as never } });
    if (existing) return existing;
    return prisma.contribution.create({
      data: { userId, projectId, role: role as never, description: description ?? null },
    });
  };

  await contrib(alice.id, aliceProject.id, "CONCEPTUALIZATION", "Led the study design");
  await contrib(alice.id, aliceProject.id, "INVESTIGATION", "Ran all CRISPR experiments");
  await contrib(alice.id, aliceProject.id, "WRITING_ORIGINAL_DRAFT");
  await contrib(diana.id, aliceProject.id, "DATA_CURATION", "Curated sequencing datasets");
  await contrib(diana.id, aliceProject.id, "FORMAL_ANALYSIS", "Statistical analysis of off-target sites");
  await contrib(diana.id, aliceProject.id, "VALIDATION", "Independently reproduced key results");

  await contrib(bob.id, bobProject.id, "CONCEPTUALIZATION");
  await contrib(bob.id, bobProject.id, "METHODOLOGY", "Developed the synthesis protocol");
  await contrib(bob.id, bobProject.id, "INVESTIGATION");
  await contrib(bob.id, bobProject.id, "WRITING_ORIGINAL_DRAFT");

  await contrib(claire.id, claireProject.id, "CONCEPTUALIZATION");
  await contrib(claire.id, claireProject.id, "DATA_CURATION", "Built the social graph dataset");
  await contrib(claire.id, claireProject.id, "SOFTWARE", "Implemented network analysis pipeline");
  await contrib(claire.id, claireProject.id, "VISUALIZATION");
  await contrib(claire.id, claireProject.id, "WRITING_ORIGINAL_DRAFT");

  // ── Reviews ───────────────────────────────────────────────────────────────
  const review = async (
    projectId: string,
    reviewerId: string,
    content: string,
    scores: { clarity: number; rigor: number; novelty: number; reproducibility: number },
    visibility = "PUBLIC"
  ) => {
    const existing = await prisma.review.findFirst({ where: { projectId, reviewerId, deletedAt: null } });
    if (existing) return existing;
    return prisma.review.create({
      data: {
        projectId,
        reviewerId,
        content,
        ...scores,
        visibility: visibility as never,
        status: "PUBLISHED",
      },
    });
  };

  // Bob reviews Alice's project
  const r1 = await review(
    aliceProject.id, bob.id,
    "Rigorous experimental design with clear controls. The off-target analysis is thorough. Minor concern: sample size in Figure 3 is underpowered. Overall a strong contribution to the field.",
    { clarity: 4, rigor: 5, novelty: 4, reproducibility: 4 }
  );
  // Claire reviews Alice's project (anonymous)
  const r2 = await review(
    aliceProject.id, claire.id,
    "Well-written. The statistical methods could be better described in the methods section. The implications for gene therapy are well-argued.",
    { clarity: 4, rigor: 4, novelty: 3, reproducibility: 4 },
    "ANONYMOUS"
  );
  // Alice reviews Bob's project
  const r3 = await review(
    bobProject.id, alice.id,
    "Fascinating results. The room-temperature claim needs stronger supporting evidence — the supplemental figures are promising but the confidence intervals are wide.",
    { clarity: 5, rigor: 3, novelty: 5, reproducibility: 3 }
  );
  // Diana reviews Bob's project (semi-private)
  const r4 = await review(
    bobProject.id, diana.id,
    "The synthesis protocol is detailed and reproducible. I was able to replicate the main result in our lab. The discussion of applications is appropriately cautious.",
    { clarity: 5, rigor: 5, novelty: 4, reproducibility: 5 },
    "SEMI_PRIVATE"
  );
  // Bob reviews Claire's project
  const r5 = await review(
    claireProject.id, bob.id,
    "Solid methodology. The network analysis pipeline is well-documented. The causal claims about polarisation need more careful hedging given the observational design.",
    { clarity: 4, rigor: 4, novelty: 4, reproducibility: 4 }
  );

  // ── Comments ──────────────────────────────────────────────────────────────
  const comment = async (authorId: string, targetId: string, body: string, parentId?: string) => {
    const existing = await prisma.comment.findFirst({
      where: { authorId, targetId, body, targetType: "REVIEW", deletedAt: null },
    });
    if (existing) return existing;
    return prisma.comment.create({
      data: { authorId, body, targetType: "REVIEW", targetId, parentId: parentId ?? null },
    });
  };

  const c1 = await comment(alice.id, r1.id, "Thanks for the feedback on Figure 3 — we're running additional replicates and will update the manuscript.");
  await comment(bob.id, r1.id, "Happy to review the updated version once you have more data.", c1.id);
  await comment(diana.id, r4.id, "Glad you could replicate it! What cell line did you use?");

  // ── Endorsements ──────────────────────────────────────────────────────────
  const endorse = async (endorserId: string, endorseeId: string, skill: string, note?: string) => {
    try {
      await prisma.endorsement.upsert({
        where: { endorserId_endorseeId_skill: { endorserId, endorseeId, skill } },
        create: { endorserId, endorseeId, skill, note: note ?? null },
        update: { deletedAt: null },
      });
    } catch {
      // skip if already exists and unique constraint fires
    }
  };

  await endorse(bob.id, alice.id, "experimental-biology", "Alice's CRISPR work is meticulous.");
  await endorse(diana.id, alice.id, "experimental-biology");
  await endorse(claire.id, alice.id, "scientific-writing");
  await endorse(alice.id, bob.id, "condensed-matter-physics");
  await endorse(diana.id, bob.id, "reproducibility");
  await endorse(alice.id, claire.id, "network-analysis");
  await endorse(bob.id, claire.id, "data-visualisation");
  await endorse(alice.id, diana.id, "statistical-analysis");
  await endorse(bob.id, diana.id, "reproducibility");
  await endorse(claire.id, diana.id, "statistical-analysis");

  // ── Admin badge for Alice ─────────────────────────────────────────────────
  const adminBadge = await prisma.badge.findUnique({ where: { slug: "admin" } });
  if (adminBadge) {
    await prisma.userBadge
      .upsert({
        where: { userId_badgeId: { userId: alice.id, badgeId: adminBadge.id } },
        create: { userId: alice.id, badgeId: adminBadge.id },
        update: {},
      })
      .catch(() => {});
  }

  // ── Reputation snapshots ──────────────────────────────────────────────────
  const scores: Record<string, number> = {};
  for (const [name, user] of [["Alice", alice], ["Bob", bob], ["Claire", claire], ["Diana", diana]] as const) {
    scores[name] = await snapshotUser(user.id);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n  Demo data ready.\n");
  console.log("  ┌─────────────────────────────────────────────────────────────┐");
  console.log("  │  User IDs (copy these into curl commands below)            │");
  console.log("  ├─────────────────────────────────────────────────────────────┤");
  console.log(`  │  Alice Chen  (biology/MIT)          ${alice.id}  │`);
  console.log(`  │  Bob Mehta   (physics/Stanford)     ${bob.id}  │`);
  console.log(`  │  Claire Dupont (social/Oxford)      ${claire.id}  │`);
  console.log(`  │  Diana Osei  (biology/Harvard)      ${diana.id}  │`);
  console.log("  ├─────────────────────────────────────────────────────────────┤");
  console.log("  │  Project IDs                                               │");
  console.log("  ├─────────────────────────────────────────────────────────────┤");
  console.log(`  │  CRISPR study          demo-project-alice                  │`);
  console.log(`  │  Topological insulators demo-project-bob                   │`);
  console.log(`  │  Social media study    demo-project-claire                 │`);
  console.log("  └─────────────────────────────────────────────────────────────┘");
  console.log("");
  console.log("  Reputation scores:");
  for (const [name, score] of Object.entries(scores)) {
    const bar = "█".repeat(Math.max(1, Math.round(score / 3)));
    console.log(`    ${name.padEnd(10)}  ${score.toFixed(2).padStart(6)}  ${bar}`);
  }
  console.log("");
  console.log("  Try once the server is up:");
  console.log("    curl -s 'http://localhost:3000/api/leaderboards' | jq .");
  console.log("    curl -s 'http://localhost:3000/api/leaderboards?domain=biology' | jq .");
  console.log(`    curl -s 'http://localhost:3000/api/reputation/${alice.id}' | jq .`);
  console.log(`    curl -s 'http://localhost:3000/api/reputation/${alice.id}/history' | jq .`);
  console.log(`    curl -s 'http://localhost:3000/api/users/${alice.id}/badges' | jq .`);
  console.log(`    curl -s 'http://localhost:3000/api/reviews?projectId=demo-project-alice' | jq .`);
  console.log(`    curl -s 'http://localhost:3000/api/contributions?userId=${alice.id}' | jq .`);
  console.log(`    curl -s 'http://localhost:3000/api/contributions/export?userId=${alice.id}'`);
  console.log(`    curl -s 'http://localhost:3000/api/endorsements?endorseeId=${alice.id}' | jq .`);
  console.log("");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
