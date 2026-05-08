"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createCustomer,
  updateCustomer,
  type CustomerActionState,
} from "@/lib/actions/customers";

const inputClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const textareaClass =
  "min-h-[88px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const labelClass = "text-sm font-medium leading-none";

type CustomerFormProps = {
  mode: "create" | "edit";
  initial?: {
    id?: string;
    email?: string | null;
    name?: string | null;
    phone?: string | null;
    street?: string | null;
    city?: string | null;
    zip?: string | null;
    country?: string | null;
    ico?: string | null;
    dic?: string | null;
    isCompany?: boolean;
    notes?: string | null;
    tags?: string[];
  };
};

export function CustomerForm({ mode, initial }: CustomerFormProps) {
  const action = mode === "create" ? createCustomer : updateCustomer;
  const [state, dispatch, pending] = useActionState<CustomerActionState, FormData>(
    action,
    null,
  );
  const [isCompany, setIsCompany] = useState<boolean>(initial?.isCompany ?? false);

  const fieldErrors = (state && !state.ok && state.fieldErrors) || {};

  return (
    <form action={dispatch} className="space-y-5">
      {state && !state.ok && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      {state && state.ok && mode === "edit" && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          Zákazník uložen.
        </div>
      )}

      {mode === "edit" && initial?.id && (
        <input type="hidden" name="id" value={initial.id} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Kontaktní údaje</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <label className={labelClass} htmlFor="email">
              Email <span className="text-destructive">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={initial?.email ?? ""}
              disabled={pending}
              className={inputClass}
            />
            {fieldErrors.email && (
              <p className="text-xs text-destructive">{fieldErrors.email[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className={labelClass} htmlFor="name">
              Jméno {isCompany && "/ název firmy"}
            </label>
            <input
              id="name"
              name="name"
              defaultValue={initial?.name ?? ""}
              disabled={pending}
              className={inputClass}
            />
          </div>

          <div className="space-y-2">
            <label className={labelClass} htmlFor="phone">
              Telefon
            </label>
            <input
              id="phone"
              name="phone"
              defaultValue={initial?.phone ?? ""}
              disabled={pending}
              className={inputClass}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isCompany"
                checked={isCompany}
                onChange={(e) => setIsCompany(e.target.checked)}
                disabled={pending}
              />
              Firemní zákazník (IČO/DIČ)
            </label>
          </div>

          {isCompany && (
            <>
              <div className="space-y-2">
                <label className={labelClass} htmlFor="ico">
                  IČO
                </label>
                <input
                  id="ico"
                  name="ico"
                  defaultValue={initial?.ico ?? ""}
                  disabled={pending}
                  className={inputClass}
                />
              </div>

              <div className="space-y-2">
                <label className={labelClass} htmlFor="dic">
                  DIČ
                </label>
                <input
                  id="dic"
                  name="dic"
                  defaultValue={initial?.dic ?? ""}
                  disabled={pending}
                  className={inputClass}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Adresa</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <label className={labelClass} htmlFor="street">
              Ulice a č. p.
            </label>
            <input
              id="street"
              name="street"
              defaultValue={initial?.street ?? ""}
              disabled={pending}
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <label className={labelClass} htmlFor="city">
              Město
            </label>
            <input
              id="city"
              name="city"
              defaultValue={initial?.city ?? ""}
              disabled={pending}
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <label className={labelClass} htmlFor="zip">
              PSČ
            </label>
            <input
              id="zip"
              name="zip"
              defaultValue={initial?.zip ?? ""}
              disabled={pending}
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <label className={labelClass} htmlFor="country">
              Země
            </label>
            <input
              id="country"
              name="country"
              maxLength={2}
              defaultValue={initial?.country ?? "CZ"}
              disabled={pending}
              className={inputClass}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Štítky a poznámky</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className={labelClass} htmlFor="tags">
              Štítky
            </label>
            <input
              id="tags"
              name="tags"
              defaultValue={initial?.tags?.join(", ") ?? ""}
              disabled={pending}
              placeholder="VIP, problémový, …"
              className={inputClass}
            />
            <p className="text-xs text-muted-foreground">Oddělte čárkou.</p>
          </div>

          <div className="space-y-2">
            <label className={labelClass} htmlFor="notes">
              Interní poznámka
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={initial?.notes ?? ""}
              disabled={pending}
              className={textareaClass}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          render={<a href={initial?.id ? `/customers/${initial.id}` : "/customers"} />}
          variant="outline"
          disabled={pending}
        >
          Zrušit
        </Button>
        <Button type="submit" disabled={pending}>
          {pending
            ? "Ukládám…"
            : mode === "create"
            ? "Vytvořit zákazníka"
            : "Uložit změny"}
        </Button>
      </div>
    </form>
  );
}
