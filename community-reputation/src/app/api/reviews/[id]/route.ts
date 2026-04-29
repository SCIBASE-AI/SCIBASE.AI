import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ReviewVisibility, ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, getAuth } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { getReview, updateReview } from "@/services/review.service";

const PatchReviewSchema = z
  .object({
    clarity: z.number().int().min(1).max(5).optional(),
    rigor: z.number().int().min(1).max(5).optional(),
    novelty: z.number().int().min(1).max(5).optional(),
    reproducibility: z.number().int().min(1).max(5).optional(),
    content: z.string().min(1).max(20000).optional(),
    visibility: z.nativeEnum(ReviewVisibility).optional(),
    status: z.nativeEnum(ReviewStatus).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field required" });

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await getAuth();
    const review = await getReview(prisma, params.id, userId);
    if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(review);
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireAuth();
    const patch = PatchReviewSchema.parse(await req.json());
    const review = await updateReview(prisma, params.id, userId, patch);
    return NextResponse.json(review);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireAuth();
    const review = await prisma.review.findUnique({
      where: { id: params.id },
      select: { reviewerId: true, deletedAt: true },
    });
    if (!review || review.deletedAt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (review.reviewerId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await prisma.review.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return handleError(e);
  }
}
