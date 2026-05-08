import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIST_LIMIT = 20;

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const where = { OR: [{ userId }, { userId: null }] };

  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: LIST_LIMIT,
      select: {
        id: true,
        caseId: true,
        type: true,
        title: true,
        message: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where: { ...where, readAt: null } }),
  ]);

  const caseIds = Array.from(
    new Set(rows.map((r) => r.caseId).filter((id): id is string => Boolean(id))),
  );

  const cases = caseIds.length
    ? await prisma.case.findMany({
        where: { id: { in: caseIds } },
        select: { id: true, caseNumber: true },
      })
    : [];

  const caseNumberById = new Map(cases.map((c) => [c.id, c.caseNumber]));

  const items = rows.map((r) => ({
    ...r,
    case: r.caseId
      ? { caseNumber: caseNumberById.get(r.caseId) ?? null }
      : null,
  }));

  return NextResponse.json({ items, unreadCount });
}
