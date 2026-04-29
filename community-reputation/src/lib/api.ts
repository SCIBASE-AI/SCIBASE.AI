import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AuthError } from "./auth";

export function handleError(e: unknown): NextResponse {
  if (e instanceof AuthError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (e instanceof ZodError) {
    return NextResponse.json({ error: "Validation failed", details: e.errors }, { status: 422 });
  }
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Already exists" }, { status: 409 });
    }
    if (e.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }
  if (e instanceof Error) {
    const { message } = e;
    if (message === "Not found" || message.endsWith("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message === "Cannot endorse yourself") {
      return NextResponse.json({ error: message }, { status: 422 });
    }
    if (message === "Cannot review your own project") {
      return NextResponse.json({ error: message }, { status: 422 });
    }
    if (message === "Daily endorsement limit reached") {
      return NextResponse.json({ error: message }, { status: 429 });
    }
  }
  console.error(e);
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}
