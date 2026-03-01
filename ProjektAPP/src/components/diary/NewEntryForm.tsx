"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface NewEntryFormProps {
  onSubmit: (content: string, nextStep: string) => Promise<void>;
}

export function NewEntryForm({ onSubmit }: NewEntryFormProps) {
  const [content, setContent] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content.trim(), nextStep.trim());
      setContent("");
      setNextStep("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border bg-card p-4">
      <div className="space-y-2">
        <Label htmlFor="entry-content">Popis</Label>
        <Textarea
          id="entry-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Co se změnilo? Co jste udělali?"
          rows={3}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="entry-next-step">Další krok (volitelné)</Label>
        <Input
          id="entry-next-step"
          value={nextStep}
          onChange={(e) => setNextStep(e.target.value)}
          placeholder="Co je další krok?"
        />
      </div>

      <Button type="submit" disabled={isSubmitting || !content.trim()}>
        {isSubmitting ? "Ukládání..." : "Přidat záznam"}
      </Button>
    </form>
  );
}
