import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ReviewVisibility, ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, getAuth } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { createReview, listReviews } from "@/services/review.service";

const CreateReviewSchema = z.object({
  projectId: z.string().min(1),
  templateId: z.string().cuid().optional(),
  clarity: z.number().int().min(1).max(5).optional(),
  rigor: z.number().int().min(1).max(5).optional(),
  novelty: z.number().int().min(1).max(5).optional(),
  reproducibility: z.number().int().min(1).max(5).optional(),
  content: z.string().min(1).max(20000),
  visibility: z.nativeEnum(ReviewVisibility).optional(),
  status: z.nativeEnum(ReviewStatus).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const body = CreateReviewSchema.parse(await req.json());
    const review = await createReview(prisma, { ...body, reviewerId: userId });
    return NextResponse.json(review, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}

const ListReviewsQuerySchema = z.object({
  projectId: z.string().optional(),
  reviewerId: z.string().optional(),
  status: z.nativeEnum(ReviewStatus).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { userId } = await getAuth();
    const { searchParams } = new URL(req.url);
    const query = ListReviewsQuerySchema.safeParse(Object.fromEntries(searchParams));
    if (!query.success) {
      return NextResponse.json({ error: "Invalid query params", details: query.error.errors }, { status: 422 });
    }
    const reviews = await listReviews(prisma, query.data, userId);
    return NextResponse.json(reviews);
  } catch (e) {
    return handleError(e);
  }
}
