import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/api";

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(365).default(90),
});

// Returns the append-only snapshot history for a user — used by score sparklines.
export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const query = QuerySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!query.success) {
      return NextResponse.json({ error: "Invalid query params", details: query.error.errors }, { status: 422 });
    }

    const snapshots = await prisma.reputationSnapshot.findMany({
      where: { userId: params.userId },
      select: {
        total: true,
        computedAt: true,
        reviewsCompleted: true,
        endorsementsReceived: true,
        citationsReceived: true,
        forksReceived: true,
        reproducibilityVerified: true,
        bountiesCompleted: true,
        badgesEarned: true,
      },
      orderBy: { computedAt: "asc" },
      take: query.data.limit,
    });

    return NextResponse.json(snapshots);
  } catch (e) {
    return handleError(e);
  }
}
