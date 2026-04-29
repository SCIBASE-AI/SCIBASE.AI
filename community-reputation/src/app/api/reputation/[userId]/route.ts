import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/lib/api";
import { gatherComponents } from "@/services/reputation.service";
import { computeReputation } from "@/lib/reputation";

// Returns a live reputation score + full breakdown for a user.
// Does NOT write a snapshot — that is the cron job's responsibility.
export async function GET(_req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { id: true, name: true, institution: true, domain: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const components = await gatherComponents(prisma, params.userId);
    const { total, breakdown } = computeReputation(components);

    return NextResponse.json({ user, total, components, breakdown });
  } catch (e) {
    return handleError(e);
  }
}
