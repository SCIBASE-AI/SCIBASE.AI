import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { handleError } from "@/lib/api";

// Soft-delete a contribution. Only the contributor may retract their own record.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await requireAuth();

    const contribution = await prisma.contribution.findFirst({
      where: { id: params.id, deletedAt: null },
      select: { userId: true },
    });
    if (!contribution) return NextResponse.json({ error: "Contribution not found" }, { status: 404 });
    if (contribution.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.contribution.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return handleError(e);
  }
}
