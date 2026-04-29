import { describe, it, expect } from "vitest";
import { testPrisma } from "./setup";
import { createReview, listReviews, getReview } from "@/services/review.service";
import { writeSnapshot, getLeaderboard } from "@/services/reputation.service";
import { createEndorsement } from "@/services/endorsement.service";

async function seed() {
  const reviewer = await testPrisma.user.create({
    data: { email: "anon-reviewer@example.com", name: "Hidden Reviewer" },
  });
  const author = await testPrisma.user.create({
    data: { email: "project-author@example.com", name: "Author" },
  });
  const outsider = await testPrisma.user.create({
    data: { email: "outsider@example.com", name: "Outsider" },
  });
  const project = await testPrisma.project.create({
    data: { title: "Sensitive Project", ownerId: author.id },
  });
  return { reviewer, author, outsider, project };
}

describe("Anonymity enforcement", () => {
  it("ANONYMOUS review: author cannot see reviewer identity", async () => {
    const { reviewer, author, project } = await seed();

    const review = await createReview(testPrisma, {
      projectId: project.id,
      reviewerId: reviewer.id,
      content: "Anonymous feedback.",
      visibility: "ANONYMOUS",
    });
    await testPrisma.review.update({ where: { id: review.id }, data: { status: "PUBLISHED" } });

    const [authorView] = await listReviews(testPrisma, { projectId: project.id }, author.id);
    expect(authorView.reviewerId).toBeNull();
    expect(authorView.reviewer).toBeNull();
    expect(authorView.content).toBe("Anonymous feedback."); // content still visible
  });

  it("ANONYMOUS review: reviewer can see their own identity", async () => {
    const { reviewer, project } = await seed();

    const review = await createReview(testPrisma, {
      projectId: project.id,
      reviewerId: reviewer.id,
      content: "My own review.",
      visibility: "ANONYMOUS",
    });
    await testPrisma.review.update({ where: { id: review.id }, data: { status: "PUBLISHED" } });

    const [selfView] = await listReviews(testPrisma, { projectId: project.id }, reviewer.id);
    expect(selfView.reviewerId).toBe(reviewer.id);
  });

  it("DOUBLE_BLIND review: project author cannot see reviewer identity", async () => {
    const { reviewer, author, project } = await seed();

    const review = await createReview(testPrisma, {
      projectId: project.id,
      reviewerId: reviewer.id,
      content: "Double-blind feedback.",
      visibility: "DOUBLE_BLIND",
    });
    await testPrisma.review.update({ where: { id: review.id }, data: { status: "PUBLISHED" } });

    const fetched = await getReview(testPrisma, review.id, author.id);
    expect(fetched?.reviewerId).toBeNull();
  });

  it("anonymous reviewer still earns reputation — leaderboard does not leak identity", async () => {
    const { reviewer, author, project } = await seed();

    const review = await createReview(testPrisma, {
      projectId: project.id,
      reviewerId: reviewer.id,
      content: "Private peer review.",
      visibility: "ANONYMOUS",
    });
    await testPrisma.review.update({ where: { id: review.id }, data: { status: "PUBLISHED" } });

    // Give author an endorsement so both users appear in leaderboard
    const thirdUser = await testPrisma.user.create({
      data: { email: "third@example.com", name: "Third" },
    });
    await createEndorsement(testPrisma, thirdUser.id, author.id, "writing");

    await writeSnapshot(testPrisma, reviewer.id);
    await writeSnapshot(testPrisma, author.id);

    const board = await getLeaderboard(testPrisma, {}, 50);
    const reviewerEntry = board.find((e) => e.id === reviewer.id);

    // Reviewer appears on leaderboard with their score
    expect(reviewerEntry).toBeDefined();
    expect(reviewerEntry!.total).toBeGreaterThan(0);

    // Leaderboard entry does NOT expose reviews breakdown (only aggregated total)
    // No reviewerId field exists on LeaderboardEntry by design
    expect("reviewerId" in (reviewerEntry ?? {})).toBe(false);
  });

  it("SEMI_PRIVATE review: outsider cannot see reviewer, but author can", async () => {
    const { reviewer, author, outsider, project } = await seed();

    const review = await createReview(testPrisma, {
      projectId: project.id,
      reviewerId: reviewer.id,
      content: "Semi-private feedback.",
      visibility: "SEMI_PRIVATE",
    });
    await testPrisma.review.update({ where: { id: review.id }, data: { status: "PUBLISHED" } });

    const authorView = await getReview(testPrisma, review.id, author.id);
    expect(authorView?.reviewerId).toBe(reviewer.id);

    const outsiderView = await getReview(testPrisma, review.id, outsider.id);
    expect(outsiderView?.reviewerId).toBeNull();
  });
});
