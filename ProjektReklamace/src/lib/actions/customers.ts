"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stringifyTags } from "@/lib/case/tags";
import {
  CreateCustomerSchema,
  UpdateCustomerSchema,
} from "@/lib/zod/customer";

export type CustomerActionState =
  | { ok: true; customerId: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }
  | null;

async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Nepřihlášený uživatel.");
  }
  return session.user;
}

function rawFromFormData(formData: FormData) {
  return {
    email: formData.get("email"),
    name: formData.get("name") || undefined,
    phone: formData.get("phone") || undefined,
    street: formData.get("street") || undefined,
    city: formData.get("city") || undefined,
    zip: formData.get("zip") || undefined,
    country: formData.get("country") || undefined,
    ico: formData.get("ico") || undefined,
    dic: formData.get("dic") || undefined,
    isCompany: formData.get("isCompany") || false,
    notes: formData.get("notes") || undefined,
    tags: formData.get("tags") || undefined,
  };
}

export async function createCustomer(
  _prev: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  await requireUser();

  const parsed = CreateCustomerSchema.safeParse({
    ...rawFromFormData(formData),
    source: formData.get("source") || "MANUAL",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Zkontrolujte vyplněné údaje.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;

  const existing = await prisma.customer.findUnique({
    where: { email: data.email },
    select: { id: true },
  });
  if (existing) {
    return {
      ok: false,
      error: "Zákazník s tímto emailem už existuje.",
      fieldErrors: { email: ["Email už je v databázi."] },
    };
  }

  const created = await prisma.customer.create({
    data: {
      email: data.email,
      name: data.name,
      phone: data.phone,
      street: data.street,
      city: data.city,
      zip: data.zip,
      country: data.country ?? "CZ",
      ico: data.ico,
      dic: data.dic,
      isCompany: data.isCompany,
      notes: data.notes,
      tags: stringifyTags(data.tags),
      source: data.source,
    },
  });

  revalidatePath("/customers");
  redirect(`/customers/${created.id}`);
}

export async function updateCustomer(
  _prev: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  await requireUser();

  const parsed = UpdateCustomerSchema.safeParse({
    id: formData.get("id"),
    ...rawFromFormData(formData),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Zkontrolujte vyplněné údaje.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;

  const existing = await prisma.customer.findFirst({
    where: { email: data.email, NOT: { id: data.id } },
    select: { id: true },
  });
  if (existing) {
    return {
      ok: false,
      error: "Jiný zákazník už používá tento email.",
      fieldErrors: { email: ["Email už používá jiný zákazník."] },
    };
  }

  await prisma.customer.update({
    where: { id: data.id },
    data: {
      email: data.email,
      name: data.name ?? null,
      phone: data.phone ?? null,
      street: data.street ?? null,
      city: data.city ?? null,
      zip: data.zip ?? null,
      country: data.country ?? "CZ",
      ico: data.ico ?? null,
      dic: data.dic ?? null,
      isCompany: data.isCompany,
      notes: data.notes ?? null,
      tags: stringifyTags(data.tags),
    },
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${data.id}`);

  return { ok: true, customerId: data.id };
}
