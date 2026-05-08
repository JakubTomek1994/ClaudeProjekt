import { z } from "zod";

const trimmed = (max: number) =>
  z.string().trim().max(max, `Maximálně ${max} znaků.`);

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maximálně ${max} znaků.`)
    .optional()
    .or(z.literal("").transform(() => undefined));

export const CustomerSourceSchema = z.enum([
  "MANUAL",
  "EMAIL",
  "CSV_IMPORT",
  "CASE_CREATION",
]);

export const CustomerInputSchema = z.object({
  email: z.string().trim().email("Neplatný email.").max(200),
  name: optionalTrimmed(200),
  phone: optionalTrimmed(50),
  street: optionalTrimmed(200),
  city: optionalTrimmed(100),
  zip: optionalTrimmed(20),
  country: optionalTrimmed(2).default("CZ"),
  ico: optionalTrimmed(20),
  dic: optionalTrimmed(20),
  isCompany: z
    .union([z.boolean(), z.string()])
    .transform((v) => (typeof v === "boolean" ? v : v === "on" || v === "true"))
    .default(false),
  notes: optionalTrimmed(5000),
  tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      const list = Array.isArray(value)
        ? value
        : value
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
      return list.length > 0 ? list : undefined;
    }),
});

export type CustomerInput = z.infer<typeof CustomerInputSchema>;

export const CreateCustomerSchema = CustomerInputSchema.extend({
  source: CustomerSourceSchema.default("MANUAL"),
});
export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;

export const UpdateCustomerSchema = CustomerInputSchema.extend({
  id: z.string().min(1),
});
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;

export const trimOrTrimmed = trimmed;
