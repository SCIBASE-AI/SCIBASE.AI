import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/api";

// Returns all badges earned by a user, with badge metadata, ordered by award date.
export async function GET(_req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const badges = await prisma.userBadge.findMany({
      where: { userId: params.userId },
      include: {
        badge: {
          select: { slug: true, name: true, description: true, threshold: true },
        },
      },
      orderBy: { awardedAt: "desc" },
    });

    return NextResponse.json(badges);
  } catch (e) {
    return handleError(e);
  }
}
