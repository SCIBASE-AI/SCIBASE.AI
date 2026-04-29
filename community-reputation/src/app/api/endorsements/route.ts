import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { handleError } from "@/lib/api";
import {
  createEndorsement,
  removeEndorsement,
  listEndorsements,
} from "@/services/endorsement.service";

const CreateEndorsementSchema = z.object({
  endorseeId: z.string().cuid(),
  skill: z.string().min(1).max(100),
  note: z.string().max(500).optional(),
});

const DeleteEndorsementSchema = z.object({
  endorseeId: z.string().cuid(),
  skill: z.string().min(1).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const body = CreateEndorsementSchema.parse(await req.json());
    const endorsement = await createEndorsement(
      prisma,
      userId,
      body.endorseeId,
      body.skill,
      body.note
    );
    return NextResponse.json(endorsement, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const body = DeleteEndorsementSchema.parse(await req.json());
    await removeEndorsement(prisma, userId, body.endorseeId, body.skill);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return handleError(e);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endorseeId = searchParams.get("endorseeId");
    if (!endorseeId) {
      return NextResponse.json({ error: "endorseeId query param is required" }, { status: 400 });
    }
    const endorsements = await listEndorsements(prisma, endorseeId);
    return NextResponse.json(endorsements);
  } catch (e) {
    return handleError(e);
  }
}
