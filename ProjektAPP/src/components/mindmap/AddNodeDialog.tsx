"use client";

import { useState } from "react";
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
import { PHASES } from "@/lib/constants";
import type { Phase } from "@/lib/supabase/types";

interface AddNodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (label: string, description: string, phase: Phase) => void;
  defaultPhase?: Phase;
}

export function AddNodeDialog({ isOpen, onClose, onAdd, defaultPhase = "idea" }: AddNodeDialogProps) {
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [phase, setPhase] = useState<Phase>(defaultPhase);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    onAdd(label.trim(), description.trim(), phase);
    setLabel("");
    setDescription("");
    setPhase(defaultPhase);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pridat uzel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="node-label">Nazev</Label>
            <Input
              id="node-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Nazev uzlu"
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
              placeholder="Kratky popis (volitelne)"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="node-phase">Faze</Label>
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Zrusit
            </Button>
            <Button type="submit" disabled={!label.trim()}>
              Pridat
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
