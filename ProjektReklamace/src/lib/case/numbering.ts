import type { CaseType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function generateCaseNumber(type: CaseType): Promise<string> {
  const prefix = type === "REKLAMACE" ? "R" : "O";
  const year = new Date().getFullYear();
  const yearPrefix = `${prefix}-${year}-`;

  const last = await prisma.case.findFirst({
    where: { type, caseNumber: { startsWith: yearPrefix } },
    orderBy: { caseNumber: "desc" },
    select: { caseNumber: true },
  });

  let nextSeq = 1;
  if (last) {
    const parts = last.caseNumber.split("-");
    const lastSeq = Number.parseInt(parts[2] ?? "0", 10);
    if (Number.isFinite(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  return `${yearPrefix}${String(nextSeq).padStart(3, "0")}`;
}
