"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCase, type CreateCaseState } from "@/lib/actions/cases";
import { CASE_SOURCE_LABELS } from "@/lib/case/labels";

const inputClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const textareaClass =
  "min-h-[88px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const labelClass = "text-sm font-medium leading-none";

const selectClass = inputClass;

type DefectType = { code: string; name: string; category: string | null };

let nextItemKey = 0;
const newItem = () => ({ key: ++nextItemKey });

export function NewCaseForm({
  defectTypes,
  defaultDate,
}: {
  defectTypes: DefectType[];
  defaultDate: string;
}) {
  const [state, action, pending] = useActionState<CreateCaseState, FormData>(createCase, null);
  const [items, setItems] = useState<{ key: number }[]>([newItem()]);

  function addItem() {
    setItems((prev) => [...prev, newItem()]);
  }
  function removeItem(key: number) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((it) => it.key !== key)));
  }

  const fieldErrors = (state && !state.ok && state.fieldErrors) || {};

  return (
    <form action={action} className="space-y-5">
      {state && !state.ok && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Základní údaje</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <span className={labelClass}>Typ případu</span>
            <div className="flex gap-2">
              <label className="flex flex-1 cursor-pointer items-start gap-3 rounded-md border border-input p-3 hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input
                  type="radio"
                  name="type"
                  value="REKLAMACE"
                  required
                  defaultChecked
                  disabled={pending}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium">Reklamace</div>
                  <div className="text-xs text-muted-foreground">Lhůta 30 dní. Číslo R-YYYY-NNN.</div>
                </div>
              </label>
              <label className="flex flex-1 cursor-pointer items-start gap-3 rounded-md border border-input p-3 hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input
                  type="radio"
                  name="type"
                  value="ODSTOUPENI"
                  disabled={pending}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium">Odstoupení od smlouvy</div>
                  <div className="text-xs text-muted-foreground">Lhůta 14 dní. Číslo O-YYYY-NNN.</div>
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className={labelClass} htmlFor="receivedAt">
              Datum přijetí
            </label>
            <input
              id="receivedAt"
              name="receivedAt"
              type="date"
              defaultValue={defaultDate}
              required
              disabled={pending}
              className={inputClass}
            />
          </div>

          <div className="space-y-2">
            <label className={labelClass} htmlFor="source">
              Zdroj
            </label>
            <select
              id="source"
              name="source"
              defaultValue="MANUAL"
              disabled={pending}
              className={selectClass}
            >
              {Object.entries(CASE_SOURCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zákazník</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <label className={labelClass} htmlFor="customerEmail">
              Email <span className="text-destructive">*</span>
            </label>
            <input
              id="customerEmail"
              name="customerEmail"
              type="email"
              required
              disabled={pending}
              placeholder="zakaznik@example.cz"
              className={inputClass}
            />
            {fieldErrors.customerEmail && (
              <p className="text-xs text-destructive">{fieldErrors.customerEmail[0]}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Pokud zákazník již existuje, doplníme k němu jméno a telefon (nepřepisujeme prázdnými hodnotami).
            </p>
          </div>

          <div className="space-y-2">
            <label className={labelClass} htmlFor="customerName">
              Jméno
            </label>
            <input
              id="customerName"
              name="customerName"
              disabled={pending}
              className={inputClass}
            />
          </div>

          <div className="space-y-2">
            <label className={labelClass} htmlFor="customerPhone">
              Telefon
            </label>
            <input
              id="customerPhone"
              name="customerPhone"
              disabled={pending}
              className={inputClass}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Položky</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={pending}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Přidat položku
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, index) => (
            <div
              key={item.key}
              className="grid gap-3 rounded-md border bg-muted/20 p-3 sm:grid-cols-12"
            >
              <div className="space-y-1.5 sm:col-span-5">
                <label className="text-xs font-medium">
                  Název produktu <span className="text-destructive">*</span>
                </label>
                <input
                  name="item.productName"
                  required
                  disabled={pending}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-3">
                <label className="text-xs font-medium">SKU / kód</label>
                <input name="item.productSku" disabled={pending} className={inputClass} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium">Ks</label>
                <input
                  name="item.quantity"
                  type="number"
                  min="1"
                  defaultValue="1"
                  disabled={pending}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium">Cena/ks</label>
                <input
                  name="item.unitPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={pending}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-4">
                <label className="text-xs font-medium">Druh vady</label>
                <select name="item.defectType" disabled={pending} className={selectClass}>
                  <option value="">— Vyberte —</option>
                  {defectTypes.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-4">
                <label className="text-xs font-medium">Dodavatel / výrobce</label>
                <input name="item.supplier" disabled={pending} className={inputClass} />
              </div>
              <div className="space-y-1.5 sm:col-span-12">
                <label className="text-xs font-medium">Popis vady / problému</label>
                <textarea
                  name="item.defectDesc"
                  rows={2}
                  disabled={pending}
                  className={textareaClass}
                />
              </div>
              <div className="sm:col-span-12 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(item.key)}
                  disabled={pending || items.length === 1}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Odstranit položku {index + 1}
                </Button>
              </div>
            </div>
          ))}
          {fieldErrors.items && (
            <p className="text-xs text-destructive">{fieldErrors.items[0]}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Popis a poznámky</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <label className={labelClass} htmlFor="description">
              Popis problému (zákazníkův text)
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              disabled={pending}
              className={textareaClass}
              placeholder="Co zákazník popsal v emailu, telefonu nebo na osobní schůzce."
            />
          </div>
          <div className="space-y-2">
            <label className={labelClass} htmlFor="internalNotes">
              Interní poznámka (nezobrazuje se zákazníkovi)
            </label>
            <textarea
              id="internalNotes"
              name="internalNotes"
              rows={3}
              disabled={pending}
              className={textareaClass}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button render={<a href="/cases" />} variant="outline" disabled={pending}>
          Zrušit
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Ukládám…" : "Vytvořit případ"}
        </Button>
      </div>
    </form>
  );
}
