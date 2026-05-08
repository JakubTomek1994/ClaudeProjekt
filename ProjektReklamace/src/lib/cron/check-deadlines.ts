import { differenceInCalendarDays, subDays } from "date-fns";

import type { CaseStatus, NotificationType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const TERMINAL: ReadonlyArray<CaseStatus> = [
  "RESOLVED",
  "CLOSED",
  "REJECTED",
  "CANCELLED",
];

const STAGNATION_DAYS = 5;

type DeadlineBucket =
  | "DEADLINE_WARNING_7D"
  | "DEADLINE_WARNING_3D"
  | "DEADLINE_TODAY"
  | "DEADLINE_PASSED";

export function deadlineBucket(
  deadlineAt: Date,
  now: Date = new Date(),
): DeadlineBucket | null {
  const days = differenceInCalendarDays(deadlineAt, now);
  if (days < 0) return "DEADLINE_PASSED";
  if (days === 0) return "DEADLINE_TODAY";
  if (days <= 3) return "DEADLINE_WARNING_3D";
  if (days <= 7) return "DEADLINE_WARNING_7D";
  return null;
}

const DEADLINE_TITLE: Record<DeadlineBucket, string> = {
  DEADLINE_WARNING_7D: "Lhůta za 7 dní",
  DEADLINE_WARNING_3D: "Lhůta za 3 dny",
  DEADLINE_TODAY: "Lhůta vyprší dnes",
  DEADLINE_PASSED: "Lhůta vypršela",
};

export type CronResult = {
  scannedCases: number;
  created: number;
  byType: Record<NotificationType, number>;
  errors: string[];
};

function emptyByType(): Record<NotificationType, number> {
  return {
    DEADLINE_WARNING_7D: 0,
    DEADLINE_WARNING_3D: 0,
    DEADLINE_TODAY: 0,
    DEADLINE_PASSED: 0,
    STAGNANT_CASE: 0,
    NEW_CASE_DRAFT: 0,
    CUSTOMER_REPLIED: 0,
    CASE_ASSIGNED: 0,
  };
}

async function getRecipientUserIds(
  assigneeId: string | null,
): Promise<Array<string | null>> {
  if (assigneeId) return [assigneeId];
  const users = await prisma.user.findMany({ select: { id: true } });
  if (users.length === 0) return [null];
  return users.map((u) => u.id);
}

async function fanOutNotification(
  type: NotificationType,
  caseId: string,
  title: string,
  message: string,
  assigneeId: string | null,
): Promise<number> {
  const existing = await prisma.notification.findFirst({
    where: { caseId, type },
    select: { id: true },
  });
  if (existing) return 0;

  const recipients = await getRecipientUserIds(assigneeId);
  await prisma.notification.createMany({
    data: recipients.map((userId) => ({
      userId,
      caseId,
      type,
      title,
      message,
      channel: "in_app",
    })),
  });
  return recipients.length;
}

export async function runDeadlineCheck(now: Date = new Date()): Promise<CronResult> {
  const result: CronResult = {
    scannedCases: 0,
    created: 0,
    byType: emptyByType(),
    errors: [],
  };

  const cases = await prisma.case.findMany({
    where: { status: { notIn: [...TERMINAL] }, isDraft: false },
    select: {
      id: true,
      caseNumber: true,
      type: true,
      status: true,
      deadlineAt: true,
      assigneeId: true,
      updatedAt: true,
      events: {
        orderBy: { occurredAt: "desc" },
        take: 1,
        select: { occurredAt: true },
      },
    },
  });

  result.scannedCases = cases.length;

  for (const c of cases) {
    try {
      const bucket = deadlineBucket(c.deadlineAt, now);
      if (bucket) {
        const created = await fanOutNotification(
          bucket,
          c.id,
          DEADLINE_TITLE[bucket],
          `Případ ${c.caseNumber} – termín ${c.deadlineAt.toLocaleDateString("cs-CZ")}.`,
          c.assigneeId,
        );
        if (created > 0) {
          result.created += created;
          result.byType[bucket] += created;
        }
      }

      const lastActivity = c.events[0]?.occurredAt ?? c.updatedAt;
      const daysSinceActivity = differenceInCalendarDays(now, lastActivity);
      if (daysSinceActivity >= STAGNATION_DAYS) {
        const sinceCutoff = subDays(now, STAGNATION_DAYS);
        const recent = await prisma.notification.findFirst({
          where: {
            caseId: c.id,
            type: "STAGNANT_CASE",
            createdAt: { gte: lastActivity > sinceCutoff ? lastActivity : sinceCutoff },
          },
          select: { id: true },
        });
        if (!recent) {
          const recipients = await getRecipientUserIds(c.assigneeId);
          await prisma.notification.createMany({
            data: recipients.map((userId) => ({
              userId,
              caseId: c.id,
              type: "STAGNANT_CASE" as NotificationType,
              title: "Stagnující případ",
              message: `Případ ${c.caseNumber} bez aktivity ${daysSinceActivity} dní.`,
              channel: "in_app",
            })),
          });
          result.created += recipients.length;
          result.byType.STAGNANT_CASE += recipients.length;
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result.errors.push(`${c.caseNumber}: ${msg}`);
    }
  }

  return result;
}
