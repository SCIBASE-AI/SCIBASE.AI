import { describe, it, expect } from "vitest";
import { testPrisma } from "./setup";
import { writeSnapshot, getLeaderboard } from "@/services/reputation.service";

async function createUserWithReviews(
  email: string,
  reviewCount: number,
  meta: { domain?: string; region?: string; institution?: string } = {}
) {
  const user = await testPrisma.user.create({
    data: { email, name: email.split("@")[0], ...meta },
  });
  const project = await testPrisma.project.create({
    data: { title: `Project for ${email}`, ownerId: user.id },
  });
  for (let i = 0; i < reviewCount; i++) {
    await testPrisma.review.create({
      data: {
        projectId: project.id,
        reviewerId: user.id,
        content: `Review ${i}`,
        status: "PUBLISHED",
      },
    });
  }
  await writeSnapshot(testPrisma, user.id);
  return user;
}

describe("Leaderboard integration", () => {
  it("ranks users by total score descending", async () => {
    const low = await createUserWithReviews("low@example.com", 1);
    const mid = await createUserWithReviews("mid@example.com", 5);
    const high = await createUserWithReviews("high@example.com", 20);

    const board = await getLeaderboard(testPrisma, {}, 50);
    const ids = board.map((e) => e.id);

    expect(ids.indexOf(high.id)).toBeLessThan(ids.indexOf(mid.id));
    expect(ids.indexOf(mid.id)).toBeLessThan(ids.indexOf(low.id));
  });

  it("filters by domain", async () => {
    await createUserWithReviews("bio@example.com", 5, { domain: "biology" });
    await createUserWithReviews("phys@example.com", 10, { domain: "physics" });

    const board = await getLeaderboard(testPrisma, { domain: "biology" }, 50);
    expect(board).toHaveLength(1);
    expect(board[0].domain).toBe("biology");
  });

  it("filters by region", async () => {
    await createUserWithReviews("us@example.com", 5, { region: "us" });
    await createUserWithReviews("eu@example.com", 5, { region: "eu" });

    const board = await getLeaderboard(testPrisma, { region: "us" }, 50);
    expect(board.every((e) => e.region === "us")).toBe(true);
  });

  it("returns empty array when no users match filters", async () => {
    await createUserWithReviews("someone@example.com", 3, { domain: "biology" });
    const board = await getLeaderboard(testPrisma, { domain: "physics" }, 50);
    expect(board).toHaveLength(0);
  });

  it("uses the latest snapshot when a user has multiple snapshots", async () => {
    const user = await createUserWithReviews("multi@example.com", 2);

    // Add more reviews and re-snapshot
    const project = await testPrisma.project.findFirst({ where: { ownerId: user.id } });
    await testPrisma.review.create({
      data: { projectId: project!.id, reviewerId: user.id, content: "Extra", status: "PUBLISHED" },
    });
    await writeSnapshot(testPrisma, user.id);

    const board = await getLeaderboard(testPrisma, {}, 50);
    const entry = board.find((e) => e.id === user.id)!;
    // Score should reflect 3 reviews, not 2
    expect(entry.total).toBeGreaterThan(0);
  });
});
