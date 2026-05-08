"use client";

import { useActionState, useRef, useState } from "react";
import { CheckCircle2, FileUp, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { uploadDocument, type UploadDocumentState } from "@/lib/actions/documents";
import { DOCUMENT_TYPE_LABELS } from "@/lib/case/labels";
import type { DocumentType } from "@/generated/prisma/client";

const inputClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const textareaClass =
  "min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const labelClass = "text-xs font-medium leading-none text-muted-foreground";

const TYPE_OPTIONS: DocumentType[] = [
  "PHOTO_DEFECT",
  "INVOICE",
  "DELIVERY_NOTE",
  "SERVICE_REPORT",
  "CREDIT_NOTE",
  "SHIPPING_LABEL",
  "WITHDRAWAL_FORM",
  "CLAIM_PROTOCOL",
  "RESOLUTION_PROTOCOL",
  "OTHER",
];

export function UploadDocumentForm({ caseId }: { caseId: string }) {
  const [state, dispatch, pending] = useActionState<UploadDocumentState, FormData>(
    uploadDocument,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);

  function onFilesChosen(e: React.ChangeEvent<HTMLInputElement>) {
    setFileNames(Array.from(e.target.files ?? []).map((f) => f.name));
  }

  function reset() {
    formRef.current?.reset();
    setFileNames([]);
  }

  return (
    <form
      ref={formRef}
      action={(fd) => {
        dispatch(fd);
        if (state && state.ok) reset();
      }}
      className="space-y-3"
    >
      <input type="hidden" name="caseId" value={caseId} />

      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <div className="space-y-2">
          <label className={labelClass} htmlFor="type">
            Typ dokumentu <span className="text-destructive">*</span>
          </label>
          <select
            id="type"
            name="type"
            required
            disabled={pending}
            defaultValue="PHOTO_DEFECT"
            className={inputClass}
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {DOCUMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input bg-muted/20 px-4 py-6 text-center transition-colors hover:border-foreground/40 hover:bg-muted/40 cursor-pointer">
        <FileUp className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-medium">
          {fileNames.length > 0
            ? `Vybráno ${fileNames.length} ${fileNames.length === 1 ? "soubor" : fileNames.length < 5 ? "soubory" : "souborů"}`
            : "Vyberte soubor(y) k nahrání"}
        </span>
        <span className="text-[11px] text-muted-foreground">
          Obrázky / PDF / Word / Excel · max 10 MB / soubor
        </span>
        <input
          ref={fileInputRef}
          type="file"
          name="files"
          multiple
          required
          disabled={pending}
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          onChange={onFilesChosen}
          className="sr-only"
        />
      </label>

      {fileNames.length > 0 && (
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {fileNames.map((n) => (
            <li key={n} className="truncate">
              · {n}
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <label className={labelClass} htmlFor="notes">
          Poznámka (volitelně)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          disabled={pending}
          className={textareaClass}
        />
      </div>

      {state && state.ok === false && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      {state && state.ok && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-2 text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Nahráno {state.uploaded} {state.uploaded === 1 ? "soubor" : "souborů"}.
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending || fileNames.length === 0}
          onClick={reset}
        >
          Vyčistit
        </Button>
        <Button type="submit" size="sm" disabled={pending || fileNames.length === 0}>
          {pending ? "Nahrávám…" : "Nahrát"}
        </Button>
      </div>
    </form>
  );
}
