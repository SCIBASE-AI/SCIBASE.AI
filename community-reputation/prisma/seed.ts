import { PrismaClient } from "@prisma/client";
import { REVIEW_TEMPLATES } from "../src/lib/review-templates";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding review templates...");
  for (const t of REVIEW_TEMPLATES) {
    await prisma.reviewTemplate.upsert({
      where: { discipline_name: { discipline: t.discipline, name: t.name } },
      update: { fields: t.fields as object[] },
      create: { discipline: t.discipline, name: t.name, fields: t.fields as object[] },
    });
  }

  console.log("Seeding badges...");
  const badges = [
    {
      slug: "trusted_reviewer",
      name: "Trusted Reviewer",
      description: "Completed 10 or more published peer reviews",
      threshold: { component: "reviewsCompleted", value: 10 },
    },
    {
      slug: "open_science_champion",
      name: "Open Science Champion",
      description: "Received 20 or more peer endorsements",
      threshold: { component: "endorsementsReceived", value: 20 },
    },
    {
      slug: "reproducibility_verified",
      name: "Reproducibility Verified",
      description: "Achieved a total reputation score of 50 or higher",
      threshold: { component: "total", value: 50 },
    },
    {
      slug: "prolific_contributor",
      name: "Prolific Contributor",
      description: "Work cited 10 or more times",
      threshold: { component: "citationsReceived", value: 10 },
    },
    {
      slug: "admin",
      name: "Admin",
      // Threshold set impossibly high — awarded manually in demo-seed, never auto-unlocked.
      description: "SCIBASE platform administrator",
      threshold: { component: "total", value: 999999 },
    },
  ];

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { slug: badge.slug },
      update: { name: badge.name, description: badge.description, threshold: badge.threshold },
      create: badge,
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
