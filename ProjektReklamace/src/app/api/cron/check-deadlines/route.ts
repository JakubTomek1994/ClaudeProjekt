import { NextResponse } from "next/server";

import { runDeadlineCheck } from "@/lib/cron/check-deadlines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;

  // Vercel Cron sends Authorization: Bearer <CRON_SECRET> automatically
  // when CRON_SECRET is set in project env. No fallback needed.
  return false;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDeadlineCheck();
    return NextResponse.json(result);
  } catch (e) {
    console.error("[cron/check-deadlines]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Cron failed." },
      { status: 500 },
    );
  }
}

// Vercel Cron může používat GET — povolíme stejně.
export async function GET(req: Request) {
  return POST(req);
}
