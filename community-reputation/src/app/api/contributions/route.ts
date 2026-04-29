import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CreditRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { handleError } from "@/lib/api";
import { logContribution, listContributions } from "@/services/contribution.service";

const CreateContributionSchema = z.object({
  projectId: z.string().min(1),
  role: z.nativeEnum(CreditRole),
  description: z.string().max(500).optional(),
  occurredAt: z.coerce.date().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const body = CreateContributionSchema.parse(await req.json());
    const contribution = await logContribution(prisma, { ...body, userId });
    return NextResponse.json(contribution, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contributions = await listContributions(prisma, {
      userId: searchParams.get("userId") ?? undefined,
      projectId: searchParams.get("projectId") ?? undefined,
    });
    return NextResponse.json(contributions);
  } catch (e) {
    return handleError(e);
  }
}
