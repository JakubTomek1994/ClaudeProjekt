"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface NewProjectDialogProps {
  onCreate: (name: string, description: string) => Promise<void>;
}

export function NewProjectDialog({ onCreate }: NewProjectDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      await onCreate(name.trim(), description.trim());
      setName("");
      setDescription("");
      setIsOpen(false);
    } catch {
      // Error is handled by the parent
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Novy projekt</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novy projekt</DialogTitle>
          <DialogDescription>
            Vytvorte novy projekt pro vedeni vyvoje.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Nazev</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nazev projektu"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-description">Popis</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kratky popis projektu (volitelne)"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Zrusit
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? "Vytvari se..." : "Vytvorit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
