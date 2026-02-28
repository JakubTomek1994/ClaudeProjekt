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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROJECT_TEMPLATES } from "@/lib/templates";
import type { TemplateNode } from "@/lib/templates";

interface NewProjectDialogProps {
  onCreate: (name: string, description: string, templateNodes?: TemplateNode[]) => Promise<void>;
}

export function NewProjectDialog({ onCreate }: NewProjectDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("empty");
  const [isLoading, setIsLoading] = useState(false);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = PROJECT_TEMPLATES.find((t) => t.id === templateId);
    if (template && templateId !== "empty") {
      setDescription(template.description);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const template = PROJECT_TEMPLATES.find((t) => t.id === selectedTemplate);
      const nodes = template && template.nodes.length > 0 ? template.nodes : undefined;
      await onCreate(name.trim(), description.trim(), nodes);
      setName("");
      setDescription("");
      setSelectedTemplate("empty");
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
        <Button>Nový projekt</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nový projekt</DialogTitle>
          <DialogDescription>
            Vytvořte nový projekt pro vedení vývoje.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-template">Šablona</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
              <SelectTrigger id="project-template">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-name">Název</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Název projektu"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-description">Popis</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Krátký popis projektu (volitelné)"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Zrušit
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? "Vytváří se..." : "Vytvořit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
