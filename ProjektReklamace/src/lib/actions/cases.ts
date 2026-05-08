"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import type { CaseStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateDeadline } from "@/lib/case/deadline";
import { generateCaseNumber } from "@/lib/case/numbering";
import { canTransition, isTerminal } from "@/lib/case/workflow";
import {
  ChangeStatusSchema,
  CreateCaseSchema,
  type CreateCaseInput,
} from "@/lib/zod/case";

export type CreateCaseState =
  | { ok: true; caseId: string; caseNumber: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }
  | null;

async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Nepřihlášený uživatel.");
  }
  return session.user;
}

function parseFormItems(formData: FormData): CreateCaseInput["items"] {
  const names = formData.getAll("item.productName") as string[];
  const skus = formData.getAll("item.productSku") as string[];
  const quantities = formData.getAll("item.quantity") as string[];
  const prices = formData.getAll("item.unitPrice") as string[];
  const defectTypes = formData.getAll("item.defectType") as string[];
  const defectDescs = formData.getAll("item.defectDesc") as string[];
  const suppliers = formData.getAll("item.supplier") as string[];

  return names.map((productName, index) => ({
    productName,
    productSku: skus[index] || undefined,
    quantity: quantities[index] ? Number(quantities[index]) : 1,
    unitPrice: prices[index] && prices[index] !== "" ? Number(prices[index]) : undefined,
    defectType: defectTypes[index] || undefined,
    defectDesc: defectDescs[index] || undefined,
    supplier: suppliers[index] || undefined,
  }));
}

export async function createCase(
  _prev: CreateCaseState,
  formData: FormData,
): Promise<CreateCaseState> {
  const user = await requireUser();

  const raw = {
    type: formData.get("type"),
    source: formData.get("source") || "MANUAL",
    receivedAt: formData.get("receivedAt") || new Date().toISOString(),
    customerEmail: formData.get("customerEmail"),
    customerName: formData.get("customerName") || undefined,
    customerPhone: formData.get("customerPhone") || undefined,
    description: formData.get("description") || undefined,
    internalNotes: formData.get("internalNotes") || undefined,
    items: parseFormItems(formData),
  };

  const parsed = CreateCaseSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Zkontrolujte vyplněné údaje.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;

  const customer = await prisma.customer.upsert({
    where: { email: data.customerEmail },
    update: {
      name: data.customerName ?? undefined,
      phone: data.customerPhone ?? undefined,
    },
    create: {
      email: data.customerEmail,
      name: data.customerName,
      phone: data.customerPhone,
      source: "CASE_CREATION",
    },
  });

  const caseNumber = await generateCaseNumber(data.type);
  const deadlineAt = calculateDeadline(data.type, data.receivedAt);

  const created = await prisma.case.create({
    data: {
      caseNumber,
      type: data.type,
      status: "NEW",
      source: data.source,
      receivedAt: data.receivedAt,
      deadlineAt,
      customerId: customer.id,
      assigneeId: user.id,
      description: data.description,
      internalNotes: data.internalNotes,
      items: {
        create: data.items.map((it) => ({
          productName: it.productName,
          productSku: it.productSku,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          defectType: it.defectType,
          defectDesc: it.defectDesc,
          supplier: it.supplier,
        })),
      },
      events: {
        create: {
          eventType: "CREATED",
          authorId: user.id,
          metadata: JSON.stringify({ source: data.source, itemCount: data.items.length }),
        },
      },
    },
  });

  revalidatePath("/cases");
  revalidatePath("/");
  redirect(`/cases/${created.id}`);
}

export async function changeCaseStatus(formData: FormData): Promise<void> {
  const user = await requireUser();

  const parsed = ChangeStatusSchema.safeParse({
    caseId: formData.get("caseId"),
    status: formData.get("status"),
    resolution: formData.get("resolution") || undefined,
    resolutionNote: formData.get("resolutionNote") || undefined,
    refundAmount: formData.get("refundAmount") || undefined,
  });

  if (!parsed.success) {
    throw new Error("Neplatné parametry změny stavu.");
  }

  const existing = await prisma.case.findUniqueOrThrow({
    where: { id: parsed.data.caseId },
    select: { id: true, status: true, type: true },
  });

  if (existing.status === parsed.data.status) {
    return;
  }

  if (!canTransition(existing.type, existing.status, parsed.data.status)) {
    throw new Error(`Přechod ${existing.status} → ${parsed.data.status} není povolený.`);
  }

  const now = new Date();
  const updates: {
    status: CaseStatus;
    decidedAt?: Date;
    resolvedAt?: Date;
    refundedAt?: Date;
    resolution?: typeof parsed.data.resolution;
    resolutionNote?: string;
    refundAmount?: number;
  } = { status: parsed.data.status };

  if (parsed.data.status === "DECIDED") {
    updates.decidedAt = now;
    if (parsed.data.resolution) updates.resolution = parsed.data.resolution;
    if (parsed.data.resolutionNote) updates.resolutionNote = parsed.data.resolutionNote;
  }
  if (parsed.data.status === "RESOLVED") {
    updates.resolvedAt = now;
    if (parsed.data.refundAmount !== undefined) {
      updates.refundAmount = parsed.data.refundAmount;
      updates.refundedAt = now;
    }
  }
  if (parsed.data.status === "REJECTED" && parsed.data.resolutionNote) {
    updates.resolutionNote = parsed.data.resolutionNote;
    updates.resolution = "REJECTED";
    updates.decidedAt ??= now;
  }
  if (isTerminal(parsed.data.status) && !updates.resolvedAt && parsed.data.status !== "RESOLVED") {
    updates.resolvedAt = now;
  }

  await prisma.$transaction([
    prisma.case.update({ where: { id: existing.id }, data: updates }),
    prisma.caseEvent.create({
      data: {
        caseId: existing.id,
        eventType: "STATUS_CHANGED",
        fromValue: existing.status,
        toValue: parsed.data.status,
        authorId: user.id,
      },
    }),
  ]);

  revalidatePath(`/cases/${existing.id}`);
  revalidatePath("/cases");
  revalidatePath("/");
}

