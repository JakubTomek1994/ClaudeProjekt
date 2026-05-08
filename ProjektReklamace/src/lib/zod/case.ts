import { z } from "zod";

export const CaseTypeSchema = z.enum(["REKLAMACE", "ODSTOUPENI"]);

export const CaseStatusSchema = z.enum([
  "NEW",
  "UNDER_REVIEW",
  "WITH_SUPPLIER",
  "WAITING_CUSTOMER",
  "DECIDED",
  "WAITING_RETURN",
  "GOODS_RECEIVED",
  "REFUND_PENDING",
  "RESOLVED",
  "CLOSED",
  "REJECTED",
  "CANCELLED",
]);

export const CaseSourceSchema = z.enum(["EMAIL", "WEB_FORM", "PHONE", "IN_PERSON", "MANUAL"]);

export const ResolutionSchema = z.enum([
  "REPAIR",
  "REPLACEMENT",
  "DISCOUNT",
  "REFUND",
  "REJECTED",
  "PARTIAL",
]);

const trimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maximálně ${max} znaků.`);

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maximálně ${max} znaků.`)
    .optional()
    .or(z.literal("").transform(() => undefined));

export const CaseItemInputSchema = z.object({
  productName: trimmed(200).min(1, "Zadejte název produktu."),
  productSku: optionalTrimmed(100),
  quantity: z.coerce.number().int().min(1, "Minimálně 1 ks.").default(1),
  unitPrice: z.coerce.number().min(0).optional(),
  defectType: optionalTrimmed(50),
  defectDesc: optionalTrimmed(2000),
  supplier: optionalTrimmed(200),
});

export const CreateCaseSchema = z.object({
  type: CaseTypeSchema,
  source: CaseSourceSchema.default("MANUAL"),
  receivedAt: z.coerce.date(),
  customerEmail: z.string().trim().email("Neplatný email."),
  customerName: optionalTrimmed(200),
  customerPhone: optionalTrimmed(50),
  description: optionalTrimmed(5000),
  internalNotes: optionalTrimmed(5000),
  items: z.array(CaseItemInputSchema).min(1, "Přidejte alespoň jednu položku."),
});

export type CreateCaseInput = z.infer<typeof CreateCaseSchema>;

export const ChangeStatusSchema = z.object({
  caseId: z.string().min(1),
  status: CaseStatusSchema,
  resolution: ResolutionSchema.optional(),
  resolutionNote: optionalTrimmed(2000),
  refundAmount: z.coerce.number().min(0).optional(),
});

export type ChangeStatusInput = z.infer<typeof ChangeStatusSchema>;

export const AddNoteSchema = z.object({
  caseId: z.string().min(1),
  noteText: trimmed(5000).min(1, "Poznámka nesmí být prázdná."),
});

export type AddNoteInput = z.infer<typeof AddNoteSchema>;

export const ManualChannelSchema = z.enum(["PHONE", "IN_PERSON", "WRITTEN", "INTERNAL_NOTE"]);
export const DirectionSchema = z.enum(["INCOMING", "OUTGOING", "INTERNAL"]);

export const AddCommunicationSchema = z.object({
  caseId: z.string().min(1),
  channel: ManualChannelSchema,
  direction: DirectionSchema,
  occurredAt: z.coerce.date(),
  noteText: trimmed(5000).min(1, "Text nesmí být prázdný."),
});

export type AddCommunicationInput = z.infer<typeof AddCommunicationSchema>;
