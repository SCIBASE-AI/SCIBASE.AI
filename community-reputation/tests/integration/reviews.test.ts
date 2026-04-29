import { describe, it, expect } from "vitest";
import { testPrisma } from "./setup";
import { createReview, listReviews, getReview } from "@/services/review.service";
import { writeSnapshot } from "@/services/reputation.service";

async function seed() {
  const reviewer = await testPrisma.user.create({
    data: { email: "reviewer@example.com", name: "Reviewer" },
  });
  const author = await testPrisma.user.create({
    data: { email: "author@example.com", name: "Author" },
  });
  const project = await testPrisma.project.create({
    data: { title: "Test Project", ownerId: author.id },
  });
  return { reviewer, author, project };
}

describe("Review service integration", () => {
  it("creates a DRAFT review and it does not appear in default list", async () => {
    const { reviewer, project } = await seed();
    await createReview(testPrisma, {
      projectId: project.id,
      reviewerId: reviewer.id,
      content: "Initial thoughts.",
    });

    const listed = await listReviews(testPrisma, { projectId: project.id }, null);
    expect(listed).toHaveLength(0); // DRAFT — not published
  });

  it("published review appears in list and increments reputation snapshot", async () => {
    const { reviewer, project } = await seed();
    const review = await createReview(testPrisma, {
      projectId: project.id,
      reviewerId: reviewer.id,
      content: "Excellent methodology.",
      clarity: 4,
      rigor: 5,
      novelty: 3,
      reproducibility: 4,
    });

    await testPrisma.review.update({
      where: { id: review.id },
      data: { status: "PUBLISHED" },
    });

    const listed = await listReviews(testPrisma, { projectId: project.id }, null);
    expect(listed).toHaveLength(1);

    const snapshot = await writeSnapshot(testPrisma, reviewer.id);
    expect(snapshot.reviewsCompleted).toBe(1);
    expect(snapshot.total).toBeGreaterThan(0);
  });

  it("getReview returns null for non-existent id", async () => {
    const result = await getReview(testPrisma, "nonexistent-id", null);
    expect(result).toBeNull();
  });

  it("soft-deleted review does not appear in list or getReview", async () => {
    const { reviewer, project } = await seed();
    const review = await createReview(testPrisma, {
      projectId: project.id,
      reviewerId: reviewer.id,
      content: "To be deleted.",
    });

    await testPrisma.review.update({
      where: { id: review.id },
      data: { status: "PUBLISHED", deletedAt: new Date() },
    });

    const listed = await listReviews(testPrisma, { projectId: project.id }, null);
    expect(listed).toHaveLength(0);

    const fetched = await getReview(testPrisma, review.id, null);
    expect(fetched).toBeNull();
  });
});
