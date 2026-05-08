"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AddCommunicationSchema } from "@/lib/zod/case";

export type AddCommunicationState =
  | { ok: true }
  | { ok: false; error: string }
  | null;

async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Nepřihlášený uživatel.");
  }
  return session.user;
}

export async function addCommunication(
  _prev: AddCommunicationState,
  formData: FormData,
): Promise<AddCommunicationState> {
  const user = await requireUser();

  // INTERNAL_NOTE always = INTERNAL direction; otherwise honour selection
  const channel = formData.get("channel");
  const directionRaw = formData.get("direction");
  const direction = channel === "INTERNAL_NOTE" ? "INTERNAL" : directionRaw;

  const parsed = AddCommunicationSchema.safeParse({
    caseId: formData.get("caseId"),
    channel,
    direction,
    occurredAt: formData.get("occurredAt"),
    noteText: formData.get("noteText"),
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const firstError =
      Object.values(flat.fieldErrors).flat()[0] ?? "Zkontrolujte vyplněné údaje.";
    return { ok: false, error: firstError };
  }

  const data = parsed.data;

  await prisma.$transaction([
    prisma.communication.create({
      data: {
        caseId: data.caseId,
        direction: data.direction,
        channel: data.channel,
        authorId: user.id,
        noteText: data.noteText,
        occurredAt: data.occurredAt,
      },
    }),
    prisma.caseEvent.create({
      data: {
        caseId: data.caseId,
        eventType: "NOTE_ADDED",
        authorId: user.id,
        metadata: JSON.stringify({ channel: data.channel, direction: data.direction }),
      },
    }),
  ]);

  revalidatePath(`/cases/${data.caseId}`);

  return { ok: true };
}
