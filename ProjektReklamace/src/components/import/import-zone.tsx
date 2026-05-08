"use client";

import { useActionState, useRef } from "react";
import { CheckCircle2, FileUp, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ImportState } from "@/lib/actions/imports";

const MAX_VISIBLE_ERRORS = 10;

export function ImportZone({
  title,
  description,
  columns,
  action,
  acceptedExtensions = ".csv,.txt",
}: {
  title: string;
  description: string;
  columns: { code: string; required?: boolean; note?: string }[];
  action: (prev: ImportState, formData: FormData) => Promise<ImportState>;
  acceptedExtensions?: string;
}) {
  const [state, dispatch, pending] = useActionState<ImportState, FormData>(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
            Očekávané sloupce ({columns.length})
          </summary>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2 text-xs text-muted-foreground">
            {columns.map((c) => (
              <li key={c.code} className="flex items-baseline gap-2">
                <code className="rounded bg-muted px-1 font-mono">{c.code}</code>
                {c.required && <span className="text-destructive">*</span>}
                {c.note && <span>— {c.note}</span>}
              </li>
            ))}
          </ul>
        </details>

        <form ref={formRef} action={dispatch} className="space-y-3">
          <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input bg-muted/20 px-4 py-8 text-center transition-colors hover:border-primary hover:bg-muted/40 cursor-pointer">
            <FileUp className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm font-medium">Vyberte CSV soubor</span>
            <span className="text-xs text-muted-foreground">
              UTF-8, hlavička v prvním řádku
            </span>
            <input
              ref={fileInputRef}
              type="file"
              name="file"
              accept={acceptedExtensions}
              required
              disabled={pending}
              className="sr-only"
              onChange={() => formRef.current?.requestSubmit()}
            />
          </label>

          {pending && (
            <p className="text-sm text-muted-foreground">Zpracovávám soubor…</p>
          )}
        </form>

        {state && state.ok === false && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        {state && state.ok && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                Hotovo. Vytvořeno: <strong>{state.created}</strong> · Aktualizováno:{" "}
                <strong>{state.updated}</strong>
                {state.skipped > 0 && (
                  <>
                    {" "}
                    · Přeskočeno: <strong>{state.skipped}</strong>
                  </>
                )}{" "}
                · Z {state.totalLines} řádků.
              </span>
            </div>

            {state.errors.length > 0 && (
              <details className="rounded-md border bg-amber-50 p-3 text-xs dark:bg-amber-950/40">
                <summary className="cursor-pointer font-medium">
                  Chyby ({state.errors.length})
                </summary>
                <ul className="mt-2 space-y-1">
                  {state.errors.slice(0, MAX_VISIBLE_ERRORS).map((err, i) => (
                    <li key={i}>
                      <strong>Řádek {err.rowIndex}:</strong> {err.message}
                    </li>
                  ))}
                  {state.errors.length > MAX_VISIBLE_ERRORS && (
                    <li className="text-muted-foreground">
                      … a dalších {state.errors.length - MAX_VISIBLE_ERRORS} chyb.
                    </li>
                  )}
                </ul>
              </details>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (fileInputRef.current) fileInputRef.current.value = "";
                formRef.current?.reset();
              }}
            >
              Načíst další soubor
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
