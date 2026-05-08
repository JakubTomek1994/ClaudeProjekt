"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { format } from "date-fns";
import { Phone, MessageSquare, Mail, FileText, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { addCommunication } from "@/lib/actions/communications";
import { cn } from "@/lib/utils";

const inputClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const textareaClass =
  "min-h-[88px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const labelClass = "text-xs font-medium leading-none text-muted-foreground";

type ChannelOption = {
  value: "PHONE" | "IN_PERSON" | "WRITTEN" | "INTERNAL_NOTE";
  label: string;
  icon: typeof Phone;
  description: string;
  internal?: boolean;
};

const CHANNELS: ChannelOption[] = [
  { value: "PHONE", label: "Telefon", icon: Phone, description: "Hovor se zákazníkem" },
  { value: "IN_PERSON", label: "Osobně", icon: MessageSquare, description: "Osobní jednání" },
  { value: "WRITTEN", label: "Písemně", icon: Mail, description: "Dopis, jiná komunikace" },
  {
    value: "INTERNAL_NOTE",
    label: "Interní poznámka",
    icon: FileText,
    description: "Pouze pro tým, neuvidí ji zákazník",
    internal: true,
  },
];

export function AddCommunicationForm({ caseId }: { caseId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [channel, setChannel] = useState<ChannelOption["value"]>("PHONE");
  const [direction, setDirection] = useState<"INCOMING" | "OUTGOING">("INCOMING");
  const [error, setError] = useState<string | null>(null);
  const [defaultDateTime, setDefaultDateTime] = useState("");

  useEffect(() => {
    setDefaultDateTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  }, []);

  const isInternal = channel === "INTERNAL_NOTE";

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addCommunication(null, formData);
      if (result?.ok === false) {
        setError(result.error);
      } else {
        formRef.current?.reset();
        setDefaultDateTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      }
    });
  }

  return (
    <form ref={formRef} action={onSubmit} className="space-y-4">
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="direction" value={isInternal ? "INTERNAL" : direction} />

      <div className="space-y-2">
        <span className={labelClass}>Typ záznamu</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CHANNELS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setChannel(opt.value)}
              disabled={pending}
              className={cn(
                "flex flex-col items-start gap-1 rounded-md border p-3 text-left text-xs transition-all",
                channel === opt.value
                  ? "border-foreground bg-foreground/5 shadow-sm"
                  : "border-border hover:border-foreground/40 hover:bg-muted/50",
              )}
            >
              <opt.icon className="h-4 w-4" />
              <span className="font-medium">{opt.label}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">
                {opt.description}
              </span>
            </button>
          ))}
        </div>
        <input type="hidden" name="channel" value={channel} />
      </div>

      {!isInternal && (
        <div className="space-y-2">
          <span className={labelClass}>Směr</span>
          <div className="inline-flex rounded-md border bg-muted/30 p-0.5">
            <button
              type="button"
              onClick={() => setDirection("INCOMING")}
              disabled={pending}
              className={cn(
                "rounded px-3 py-1 text-xs font-medium transition-colors",
                direction === "INCOMING"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Příchozí (od zákazníka)
            </button>
            <button
              type="button"
              onClick={() => setDirection("OUTGOING")}
              disabled={pending}
              className={cn(
                "rounded px-3 py-1 text-xs font-medium transition-colors",
                direction === "OUTGOING"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Odchozí (od nás)
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
        <div className="space-y-2">
          <label className={labelClass} htmlFor="occurredAt">
            Datum a čas
          </label>
          <input
            id="occurredAt"
            name="occurredAt"
            type="datetime-local"
            required
            disabled={pending || !defaultDateTime}
            defaultValue={defaultDateTime}
            key={defaultDateTime}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className={labelClass} htmlFor="noteText">
          {isInternal ? "Poznámka" : "Záznam"}{" "}
          <span className="text-destructive">*</span>
        </label>
        <textarea
          id="noteText"
          name="noteText"
          required
          disabled={pending}
          placeholder={
            isInternal
              ? "Interní poznámka pro tým…"
              : "Co bylo řečeno / co jsme dohodli…"
          }
          className={textareaClass}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Ukládám…" : "Přidat záznam"}
        </Button>
      </div>
    </form>
  );
}
