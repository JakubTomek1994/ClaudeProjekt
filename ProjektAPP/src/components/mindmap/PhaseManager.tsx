"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import type { ProjectPhase } from "@/lib/supabase/types";
import { toast } from "sonner";

const COLOR_PRESETS = [
  { label: "Žlutá", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  { label: "Modrá", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  { label: "Fialová", color: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200" },
  { label: "Zelená", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  { label: "Oranžová", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  { label: "Červená", color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
  { label: "Šedá", color: "text-gray-700", bg: "bg-gray-50", border: "border-gray-200" },
  { label: "Růžová", color: "text-pink-700", bg: "bg-pink-50", border: "border-pink-200" },
  { label: "Tyrkysová", color: "text-cyan-700", bg: "bg-cyan-50", border: "border-cyan-200" },
];

interface PhaseManagerProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onPhasesChanged: () => void;
}

export function PhaseManager({ projectId, isOpen, onClose, onPhasesChanged }: PhaseManagerProps) {
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newColorIndex, setNewColorIndex] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColorIndex, setEditColorIndex] = useState(0);
  const supabase = createClient();

  const loadPhases = useCallback(async () => {
    const { data, error } = await supabase
      .from("project_phases")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });

    if (error) {
      toast.error("Nepodařilo se načíst fáze");
      return;
    }

    setPhases((data ?? []) as ProjectPhase[]);
    setIsLoading(false);
  }, [projectId, supabase]);

  useEffect(() => {
    if (isOpen) {
      loadPhases();
    }
  }, [isOpen, loadPhases]);

  const handleAdd = async () => {
    if (!newName.trim()) return;

    const preset = COLOR_PRESETS[newColorIndex];
    const maxOrder = phases.length > 0 ? Math.max(...phases.map((p) => p.sort_order)) + 1 : 0;

    const { error } = await supabase.from("project_phases").insert({
      project_id: projectId,
      name: newName.trim(),
      color: preset.color,
      bg_color: preset.bg,
      border_color: preset.border,
      sort_order: maxOrder,
    });

    if (error) {
      toast.error("Nepodařilo se přidat fázi");
      return;
    }

    setNewName("");
    setNewColorIndex(0);
    toast.success("Fáze přidána");
    loadPhases();
    onPhasesChanged();
  };

  const handleDelete = async (phaseId: string) => {
    if (phases.length <= 1) {
      toast.error("Projekt musí mít alespoň jednu fázi");
      return;
    }

    const { error } = await supabase
      .from("project_phases")
      .delete()
      .eq("id", phaseId);

    if (error) {
      toast.error("Nepodařilo se smazat fázi");
      return;
    }

    toast.success("Fáze smazána");
    loadPhases();
    onPhasesChanged();
  };

  const handleStartEdit = (phase: ProjectPhase) => {
    setEditingId(phase.id);
    setEditName(phase.name);
    const presetIdx = COLOR_PRESETS.findIndex(
      (p) => p.color === phase.color && p.bg === phase.bg_color
    );
    setEditColorIndex(presetIdx >= 0 ? presetIdx : 0);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;

    const preset = COLOR_PRESETS[editColorIndex];
    const { error } = await supabase
      .from("project_phases")
      .update({
        name: editName.trim(),
        color: preset.color,
        bg_color: preset.bg,
        border_color: preset.border,
      })
      .eq("id", editingId);

    if (error) {
      toast.error("Nepodařilo se upravit fázi");
      return;
    }

    setEditingId(null);
    toast.success("Fáze upravena");
    loadPhases();
    onPhasesChanged();
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const updated = [...phases];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];

    await Promise.all(
      updated.map((p, i) =>
        supabase.from("project_phases").update({ sort_order: i }).eq("id", p.id)
      )
    );

    loadPhases();
    onPhasesChanged();
  };

  const handleMoveDown = async (index: number) => {
    if (index >= phases.length - 1) return;
    const updated = [...phases];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];

    await Promise.all(
      updated.map((p, i) =>
        supabase.from("project_phases").update({ sort_order: i }).eq("id", p.id)
      )
    );

    loadPhases();
    onPhasesChanged();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Správa fází</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Načítání...</p>
        ) : (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {phases.map((phase, index) => (
              <div
                key={phase.id}
                className="flex items-center gap-2 rounded-md border p-2"
              >
                {editingId === phase.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-7 flex-1 text-sm"
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                    />
                    <Select
                      value={String(editColorIndex)}
                      onValueChange={(v) => setEditColorIndex(Number(v))}
                    >
                      <SelectTrigger className="h-7 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLOR_PRESETS.map((c, i) => (
                          <SelectItem key={i} value={String(i)}>
                            <span className={`${c.color} font-medium`}>{c.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" className="h-7 px-2 text-xs" onClick={handleSaveEdit}>
                      Uložit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setEditingId(null)}
                    >
                      Zrušit
                    </Button>
                  </>
                ) : (
                  <>
                    <span
                      className={`flex-1 rounded px-2 py-0.5 text-sm font-medium ${phase.color} ${phase.bg_color}`}
                    >
                      {phase.name}
                    </span>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        title="Posunout nahoru"
                      >
                        <ChevronUpIcon className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === phases.length - 1}
                        title="Posunout dolů"
                      >
                        <ChevronDownIcon className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground"
                        onClick={() => handleStartEdit(phase)}
                        title="Upravit"
                      >
                        <PencilIcon className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600"
                        onClick={() => handleDelete(phase.id)}
                        title="Smazat"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="border-t pt-3">
          <Label className="text-xs font-medium text-muted-foreground">Přidat novou fázi</Label>
          <div className="mt-1 flex items-center gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Název fáze"
              className="h-8 flex-1 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Select
              value={String(newColorIndex)}
              onValueChange={(v) => setNewColorIndex(Number(v))}
            >
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLOR_PRESETS.map((c, i) => (
                  <SelectItem key={i} value={String(i)}>
                    <span className={`${c.color} font-medium`}>{c.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8" onClick={handleAdd} disabled={!newName.trim()}>
              Přidat
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Zavřít
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}
