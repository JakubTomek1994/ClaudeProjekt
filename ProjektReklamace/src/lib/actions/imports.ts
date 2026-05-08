"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseCustomersCsv } from "@/lib/import/csv-customers";
import { parseOrdersCsv } from "@/lib/import/csv-orders";

export type ImportReport = {
  ok: true;
  created: number;
  updated: number;
  skipped: number;
  errors: { rowIndex: number; message: string }[];
  totalLines: number;
} | {
  ok: false;
  error: string;
};

export type ImportState = ImportReport | null;

async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Nepřihlášený uživatel.");
  }
  return session.user;
}

async function readUploadText(formData: FormData): Promise<string | null> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }
  const buffer = await file.arrayBuffer();
  // Strip UTF-8 BOM if present
  const text = new TextDecoder("utf-8").decode(buffer);
  return text.replace(/^﻿/, "");
}

export async function importCustomers(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  await requireUser();

  const text = await readUploadText(formData);
  if (text === null) {
    return { ok: false, error: "Nahrajte CSV soubor." };
  }

  const { rows, errors, totalLines } = parseCustomersCsv(text);

  let created = 0;
  let updated = 0;
  const dbErrors = [...errors];

  for (const row of rows) {
    try {
      const existing = await prisma.customer.findUnique({
        where: { email: row.email },
        select: { id: true },
      });

      if (existing) {
        await prisma.customer.update({
          where: { id: existing.id },
          data: {
            name: row.name ?? undefined,
            phone: row.phone ?? undefined,
            street: row.street ?? undefined,
            city: row.city ?? undefined,
            zip: row.zip ?? undefined,
            country: row.country ?? undefined,
            ico: row.ico ?? undefined,
            dic: row.dic ?? undefined,
            isCompany: row.isCompany,
          },
        });
        updated++;
      } else {
        await prisma.customer.create({
          data: {
            email: row.email,
            name: row.name,
            phone: row.phone,
            street: row.street,
            city: row.city,
            zip: row.zip,
            country: row.country ?? "CZ",
            ico: row.ico,
            dic: row.dic,
            isCompany: row.isCompany,
            source: "CSV_IMPORT",
          },
        });
        created++;
      }
    } catch (e) {
      dbErrors.push({
        rowIndex: row.rowIndex,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  revalidatePath("/customers");

  return {
    ok: true,
    created,
    updated,
    skipped: errors.length,
    errors: dbErrors,
    totalLines,
  };
}

export async function importOrders(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  await requireUser();

  const text = await readUploadText(formData);
  if (text === null) {
    return { ok: false, error: "Nahrajte CSV soubor." };
  }

  const { rows, errors, totalLines } = parseOrdersCsv(text);

  let created = 0;
  let updated = 0;
  const dbErrors = [...errors];

  for (const row of rows) {
    try {
      const customer = await prisma.customer.upsert({
        where: { email: row.customerEmail },
        update: {},
        create: {
          email: row.customerEmail,
          source: "CSV_IMPORT",
        },
      });

      const existing = await prisma.order.findUnique({
        where: { shoptetNumber: row.shoptetNumber },
        select: { id: true },
      });

      if (existing) {
        await prisma.$transaction([
          prisma.orderItem.deleteMany({ where: { orderId: existing.id } }),
          prisma.order.update({
            where: { id: existing.id },
            data: {
              customerId: customer.id,
              orderDate: row.orderDate,
              totalAmount: row.totalAmount,
              currency: row.currency,
              paymentMethod: row.paymentMethod,
              shippingMethod: row.shippingMethod,
              status: row.status,
              items: {
                create: row.items.map((it) => ({
                  sku: it.sku,
                  name: it.name,
                  quantity: it.quantity,
                  unitPrice: it.unitPrice,
                })),
              },
            },
          }),
        ]);
        updated++;
      } else {
        await prisma.order.create({
          data: {
            shoptetNumber: row.shoptetNumber,
            customerId: customer.id,
            orderDate: row.orderDate,
            totalAmount: row.totalAmount,
            currency: row.currency,
            paymentMethod: row.paymentMethod,
            shippingMethod: row.shippingMethod,
            status: row.status,
            items: {
              create: row.items.map((it) => ({
                sku: it.sku,
                name: it.name,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
              })),
            },
          },
        });
        created++;
      }
    } catch (e) {
      dbErrors.push({
        rowIndex: row.rowIndex,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  revalidatePath("/orders");
  revalidatePath("/customers");

  return {
    ok: true,
    created,
    updated,
    skipped: errors.length,
    errors: dbErrors,
    totalLines,
  };
}
