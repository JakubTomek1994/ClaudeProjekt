"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DEFAULT_PHASES, type PhaseConfig } from "@/lib/constants";
import type { Phase } from "@/lib/supabase/types";

interface AddNodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (label: string, description: string, phase: Phase, deadline: string | null) => void;
  defaultPhase?: Phase;
  phases?: PhaseConfig[];
}

export function AddNodeDialog({ isOpen, onClose, onAdd, defaultPhase = "idea", phases: phasesProp }: AddNodeDialogProps) {
  const PHASES = phasesProp ?? DEFAULT_PHASES;
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [phase, setPhase] = useState<Phase>(defaultPhase);
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (isOpen) {
      setPhase(defaultPhase);
      setDeadline(undefined);
    }
  }, [isOpen, defaultPhase]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    const deadlineStr = deadline ? deadline.toISOString().split("T")[0] : null;
    onAdd(label.trim(), description.trim(), phase, deadlineStr);
    setLabel("");
    setDescription("");
    setPhase(defaultPhase);
    setDeadline(undefined);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Přidat uzel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="node-label">Název</Label>
            <Input
              id="node-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Název uzlu"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="node-description">Popis</Label>
            <Textarea
              id="node-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Krátký popis (volitelné)"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="node-phase">Fáze</Label>
            <Select value={phase} onValueChange={(v) => setPhase(v as Phase)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PHASES.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Termín (volitelné)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${!deadline ? "text-muted-foreground" : ""}`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deadline
                    ? deadline.toLocaleDateString("cs-CZ")
                    : "Vyberte datum"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={deadline}
                  onSelect={setDeadline}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {deadline && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground"
                onClick={() => setDeadline(undefined)}
              >
                Zrušit termín
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Zrušit
            </Button>
            <Button type="submit" disabled={!label.trim()}>
              Přidat
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" />
    </svg>
  );
}
