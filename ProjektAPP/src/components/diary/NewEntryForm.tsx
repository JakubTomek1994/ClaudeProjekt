"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EntryType } from "@/lib/supabase/types";

const ENTRY_TYPES: { value: EntryType; label: string }[] = [
  { value: "note", label: "Poznamka" },
  { value: "milestone", label: "Milnik" },
  { value: "node_updated", label: "Uprava uzlu" },
];

interface NewEntryFormProps {
  onSubmit: (content: string, entryType: EntryType, nextStep: string) => Promise<void>;
}

export function NewEntryForm({ onSubmit }: NewEntryFormProps) {
  const [content, setContent] = useState("");
  const [entryType, setEntryType] = useState<EntryType>("note");
  const [nextStep, setNextStep] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content.trim(), entryType, nextStep.trim());
      setContent("");
      setNextStep("");
      setEntryType("note");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border bg-card p-4">
      <div className="space-y-2">
        <Label htmlFor="entry-type">Typ zaznamu</Label>
        <Select value={entryType} onValueChange={(v) => setEntryType(v as EntryType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTRY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="entry-content">Popis</Label>
        <Textarea
          id="entry-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Co se zmenilo? Co jste udelali?"
          rows={3}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="entry-next-step">Dalsi krok (volitelne)</Label>
        <Input
          id="entry-next-step"
          value={nextStep}
          onChange={(e) => setNextStep(e.target.value)}
          placeholder="Co je dalsi krok?"
        />
      </div>

      <Button type="submit" disabled={isSubmitting || !content.trim()}>
        {isSubmitting ? "Ukladani..." : "Pridat zaznam"}
      </Button>
    </form>
  );
}
