import { z } from "zod";

export const DocumentTypeSchema = z.enum([
  "PHOTO_DEFECT",
  "INVOICE",
  "DELIVERY_NOTE",
  "CLAIM_PROTOCOL",
  "RESOLUTION_PROTOCOL",
  "WITHDRAWAL_FORM",
  "SERVICE_REPORT",
  "CREDIT_NOTE",
  "SHIPPING_LABEL",
  "OTHER",
]);

export const UploadDocumentSchema = z.object({
  caseId: z.string().min(1),
  type: DocumentTypeSchema,
  notes: z
    .string()
    .trim()
    .max(1000, "Maximálně 1000 znaků.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type UploadDocumentInput = z.infer<typeof UploadDocumentSchema>;

export const DeleteDocumentSchema = z.object({
  documentId: z.string().min(1),
  caseId: z.string().min(1),
});
