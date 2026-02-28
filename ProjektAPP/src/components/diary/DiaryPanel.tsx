"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { DiaryEntryComponent } from "./DiaryEntry";
import { NewEntryForm } from "./NewEntryForm";
import { TASK_STATUSES, TASK_STATUS_MAP, PRIORITIES, PRIORITY_MAP, getDeadlineStatus } from "@/lib/constants";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NodeTagSelector } from "@/components/tags/NodeTagSelector";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import type { DiaryEntry, MapNode, Subtask, TaskStatus, Priority, Tag, NodeTag } from "@/lib/supabase/types";

interface DiaryPanelProps {
  projectId: string;
  selectedNodeId?: string | null;
  onNodeClick?: (nodeId: string) => void;
  onNodeDataChanged?: () => void;
  allTags?: Tag[];
  onTagsChanged?: () => void;
}

export function DiaryPanel({ projectId, selectedNodeId, onNodeClick, onNodeDataChanged, allTags = [], onTagsChanged }: DiaryPanelProps) {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nodeData, setNodeData] = useState<MapNode | null>(null);
  const [assignedTagIds, setAssignedTagIds] = useState<string[]>([]);
  const [diarySearch, setDiarySearch] = useState("");
  const [entryTypeFilter, setEntryTypeFilter] = useState<string>("all");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editDesc, setEditDesc] = useState("");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskContent, setNewSubtaskContent] = useState("");
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskContent, setEditingSubtaskContent] = useState("");
  const supabase = createClient();

  const loadEntries = useCallback(async () => {
    let query = supabase
      .from("diary_entries")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (selectedNodeId) {
      query = query.eq("node_id", selectedNodeId);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Nepodařilo se načíst záznamy");
      return;
    }

    setEntries((data ?? []) as DiaryEntry[]);
    setIsLoading(false);
  }, [projectId, selectedNodeId, supabase]);

  const loadNodeData = useCallback(async () => {
    if (!selectedNodeId) {
      setNodeData(null);
      setAssignedTagIds([]);
      setSubtasks([]);
      return;
    }

    const [nodeResult, tagsResult, subtasksResult] = await Promise.all([
      supabase.from("map_nodes").select("*").eq("id", selectedNodeId).single(),
      supabase.from("node_tags").select("tag_id").eq("node_id", selectedNodeId),
      supabase.from("subtasks").select("*").eq("node_id", selectedNodeId).order("sort_order", { ascending: true }),
    ]);

    if (nodeResult.data) setNodeData(nodeResult.data as MapNode);
    if (tagsResult.data) setAssignedTagIds((tagsResult.data as NodeTag[]).map((nt) => nt.tag_id));
    if (subtasksResult.data) setSubtasks(subtasksResult.data as Subtask[]);
  }, [selectedNodeId, supabase]);

  useEffect(() => {
    loadEntries();
    loadNodeData();
  }, [loadEntries, loadNodeData]);

  const handleNewEntry = async (content: string, nextStep: string) => {
    const { error } = await supabase.from("diary_entries").insert({
      project_id: projectId,
      node_id: selectedNodeId || null,
      entry_type: "note" as const,
      content,
      next_step: nextStep || null,
    });

    if (error) {
      toast.error("Nepodařilo se přidat záznam");
      throw error;
    }

    toast.success("Záznam přidán");
    loadEntries();
  };

  const handleCycleStatus = async () => {
    if (!nodeData) return;
    const currentIndex = TASK_STATUSES.findIndex((s) => s.id === nodeData.status);
    const nextStatus = TASK_STATUSES[(currentIndex + 1) % TASK_STATUSES.length].id;

    const { error } = await supabase
      .from("map_nodes")
      .update({ status: nextStatus })
      .eq("id", nodeData.id);

    if (error) {
      toast.error("Nepodařilo se změnit stav");
      return;
    }

    setNodeData({ ...nodeData, status: nextStatus });
    onNodeDataChanged?.();
  };

  const handleCyclePriority = async () => {
    if (!nodeData) return;
    const currentIndex = PRIORITIES.findIndex((p) => p.id === nodeData.priority);
    const nextPriority = PRIORITIES[(currentIndex + 1) % PRIORITIES.length].id;

    const { error } = await supabase
      .from("map_nodes")
      .update({ priority: nextPriority })
      .eq("id", nodeData.id);

    if (error) {
      toast.error("Nepodařilo se změnit prioritu");
      return;
    }

    setNodeData({ ...nodeData, priority: nextPriority });
    onNodeDataChanged?.();
  };

  const handleSetDeadline = async (date: Date | undefined) => {
    if (!nodeData) return;
    const deadlineStr = date ? date.toISOString().split("T")[0] : null;

    const { error } = await supabase
      .from("map_nodes")
      .update({ deadline: deadlineStr })
      .eq("id", nodeData.id);

    if (error) {
      toast.error("Nepodařilo se nastavit termín");
      return;
    }

    setNodeData({ ...nodeData, deadline: deadlineStr });
    onNodeDataChanged?.();
  };

  const handleAddSubtask = async () => {
    if (!selectedNodeId || !newSubtaskContent.trim()) return;

    const { data, error } = await supabase
      .from("subtasks")
      .insert({
        node_id: selectedNodeId,
        content: newSubtaskContent.trim(),
        sort_order: subtasks.length,
      })
      .select()
      .single();

    if (error) {
      toast.error("Nepodařilo se přidat krok");
      return;
    }

    setSubtasks((prev) => [...prev, data as Subtask]);
    setNewSubtaskContent("");
    onNodeDataChanged?.();
  };

  const handleToggleSubtask = async (subtask: Subtask) => {
    const newDone = !subtask.is_done;

    setSubtasks((prev) => prev.map((s) => s.id === subtask.id ? { ...s, is_done: newDone } : s));

    const { error } = await supabase
      .from("subtasks")
      .update({ is_done: newDone })
      .eq("id", subtask.id);

    if (error) {
      toast.error("Nepodařilo se změnit stav kroku");
      setSubtasks((prev) => prev.map((s) => s.id === subtask.id ? { ...s, is_done: !newDone } : s));
      return;
    }

    onNodeDataChanged?.();
  };

  const handleDeleteSubtask = async (id: string) => {
    const { error } = await supabase.from("subtasks").delete().eq("id", id);
    if (error) {
      toast.error("Nepodařilo se smazat krok");
      return;
    }
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
    onNodeDataChanged?.();
  };

  const handleUpdateSubtask = async (id: string) => {
    if (!editingSubtaskContent.trim()) return;

    const { error } = await supabase
      .from("subtasks")
      .update({ content: editingSubtaskContent.trim() })
      .eq("id", id);

    if (error) {
      toast.error("Nepodařilo se upravit krok");
      return;
    }

    setSubtasks((prev) => prev.map((s) => s.id === id ? { ...s, content: editingSubtaskContent.trim() } : s));
    setEditingSubtaskId(null);
  };

  const handleMoveSubtask = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= subtasks.length) return;

    const updated = [...subtasks];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setSubtasks(updated);

    await Promise.all(
      updated.map((s, i) =>
        supabase.from("subtasks").update({ sort_order: i }).eq("id", s.id)
      )
    );
  };

  const handleDescriptionSave = async () => {
    if (!nodeData) return;
    const trimmed = editDesc.trim();
    const newDesc = trimmed || null;
    if (newDesc === nodeData.description) {
      setIsEditingDesc(false);
      return;
    }

    const { error } = await supabase
      .from("map_nodes")
      .update({ description: newDesc })
      .eq("id", nodeData.id);

    if (error) {
      toast.error("Nepodařilo se uložit popis");
      return;
    }

    setNodeData({ ...nodeData, description: newDesc });
    setIsEditingDesc(false);
    onNodeDataChanged?.();
  };

  const filteredEntries = useMemo(() => {
    let result = entries;
    if (diarySearch) {
      const q = diarySearch.toLowerCase();
      result = result.filter((e) =>
        e.content.toLowerCase().includes(q) ||
        (e.next_step?.toLowerCase().includes(q) ?? false)
      );
    }
    if (entryTypeFilter !== "all") {
      result = result.filter((e) => e.entry_type === entryTypeFilter);
    }
    return result;
  }, [entries, diarySearch, entryTypeFilter]);

  const statusConfig = nodeData ? TASK_STATUS_MAP.get(nodeData.status) : null;
  const priorityConfig = nodeData ? PRIORITY_MAP.get(nodeData.priority) : null;
  const deadlineStatus = nodeData ? getDeadlineStatus(nodeData.deadline) : null;

  return (
    <div className="flex h-full flex-col border-l bg-background">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
        <h2 className="text-sm font-semibold">
          {selectedNodeId ? "Deník uzlu" : "Deník projektu"}
        </h2>
        {selectedNodeId && (
          <button
            onClick={() => onNodeClick?.("")}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Zobrazit vše
          </button>
        )}
      </div>

      {nodeData && (
        <>
        <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2">
          <span className="text-xs text-muted-foreground">Stav:</span>
          {statusConfig && (
            <Badge
              variant="secondary"
              className={`cursor-pointer select-none text-xs ${statusConfig.color} ${statusConfig.bgColor} hover:opacity-80`}
              onClick={handleCycleStatus}
              title="Kliknutím změníte stav"
            >
              {statusConfig.label}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">Priorita:</span>
          {priorityConfig && (
            <Badge
              variant="secondary"
              className={`cursor-pointer select-none text-xs ${priorityConfig.color} ${priorityConfig.bgColor} hover:opacity-80`}
              onClick={handleCyclePriority}
              title="Kliknutím změníte prioritu"
            >
              {priorityConfig.label}
            </Badge>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={`flex items-center gap-1 text-xs hover:opacity-80 ${deadlineStatus ? deadlineStatus.color : "text-muted-foreground"}`}
                title="Nastavit termín"
              >
                <DeadlineIcon className="h-3 w-3" />
                {deadlineStatus ? deadlineStatus.label : "Termín"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={nodeData?.deadline ? new Date(nodeData.deadline + "T00:00:00") : undefined}
                onSelect={handleSetDeadline}
                initialFocus
              />
              {nodeData?.deadline && (
                <div className="border-t p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-full text-xs text-muted-foreground"
                    onClick={() => handleSetDeadline(undefined)}
                  >
                    Zrušit termín
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
          {selectedNodeId && (
            <NodeTagSelector
              nodeId={selectedNodeId}
              projectId={projectId}
              allTags={allTags}
              assignedTagIds={assignedTagIds}
              onTagsChanged={() => {
                loadNodeData();
                onTagsChanged?.();
              }}
            >
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" title="Štítky">
                <TagSmallIcon className="h-3 w-3" />
                Štítky
              </button>
            </NodeTagSelector>
          )}
        </div>
        {assignedTagIds.length > 0 && allTags.length > 0 && (
          <div className="flex shrink-0 flex-wrap gap-1 border-b px-4 py-1.5">
            {allTags
              .filter((t) => assignedTagIds.includes(t.id))
              .map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
          </div>
        )}
        <div className="shrink-0 border-b px-4 py-2">
          {isEditingDesc ? (
            <div className="space-y-1">
              <Textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Popis uzlu..."
                rows={2}
                className="text-xs"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsEditingDesc(false);
                  }
                }}
              />
              <div className="flex gap-1">
                <Button size="sm" className="h-6 text-xs" onClick={handleDescriptionSave}>Uložit</Button>
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setIsEditingDesc(false)}>Zrušit</Button>
              </div>
            </div>
          ) : (
            <p
              className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
              onClick={() => { setEditDesc(nodeData?.description ?? ""); setIsEditingDesc(true); }}
              title="Kliknutím upravíte popis"
            >
              {nodeData?.description || "Přidat popis..."}
            </p>
          )}
        </div>
        </>
      )}

      {selectedNodeId && nodeData && (
        <div className="shrink-0 border-b px-4 py-2">
          <div className="mb-1.5 flex items-center justify-between">
            <h3 className="text-xs font-semibold">Kroky</h3>
            {subtasks.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {subtasks.filter((s) => s.is_done).length}/{subtasks.length}
              </span>
            )}
          </div>

          {subtasks.length > 0 && (
            <div className="mb-2 space-y-1">
              {subtasks.map((subtask, index) => (
                <div key={subtask.id} className="group flex items-center gap-1.5">
                  <Checkbox
                    checked={subtask.is_done}
                    onCheckedChange={() => handleToggleSubtask(subtask)}
                    className="h-3.5 w-3.5"
                  />
                  {editingSubtaskId === subtask.id ? (
                    <Input
                      value={editingSubtaskContent}
                      onChange={(e) => setEditingSubtaskContent(e.target.value)}
                      onBlur={() => handleUpdateSubtask(subtask.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdateSubtask(subtask.id);
                        if (e.key === "Escape") setEditingSubtaskId(null);
                      }}
                      className="h-6 flex-1 text-xs"
                      autoFocus
                    />
                  ) : (
                    <span
                      className={cn(
                        "flex-1 cursor-text text-xs",
                        subtask.is_done && "text-muted-foreground line-through"
                      )}
                      onDoubleClick={() => {
                        setEditingSubtaskId(subtask.id);
                        setEditingSubtaskContent(subtask.content);
                      }}
                    >
                      {subtask.content}
                    </span>
                  )}
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => handleMoveSubtask(index, "up")}
                      className="text-muted-foreground hover:text-foreground p-0.5"
                      disabled={index === 0}
                    >
                      <ChevronUpIcon className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleMoveSubtask(index, "down")}
                      className="text-muted-foreground hover:text-foreground p-0.5"
                      disabled={index === subtasks.length - 1}
                    >
                      <ChevronDownIcon className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteSubtask(subtask.id)}
                      className="text-muted-foreground hover:text-red-600 p-0.5"
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); handleAddSubtask(); }}
            className="flex items-center gap-1"
          >
            <Input
              value={newSubtaskContent}
              onChange={(e) => setNewSubtaskContent(e.target.value)}
              placeholder="Přidat krok..."
              className="h-6 flex-1 text-xs"
            />
            <Button type="submit" size="sm" variant="ghost" className="h-6 px-2 text-xs" disabled={!newSubtaskContent.trim()}>
              +
            </Button>
          </form>
        </div>
      )}

      <div className="shrink-0 px-4 py-2">
        <NewEntryForm onSubmit={handleNewEntry} />
      </div>

      <Separator className="shrink-0" />

      <div className="flex shrink-0 items-center gap-2 border-b px-4 py-1.5">
        <Input
          value={diarySearch}
          onChange={(e) => setDiarySearch(e.target.value)}
          placeholder="Hledat záznamy..."
          className="h-7 flex-1 text-xs"
        />
        <Select value={entryTypeFilter} onValueChange={setEntryTypeFilter}>
          <SelectTrigger className="h-7 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny typy</SelectItem>
            <SelectItem value="note">Poznámky</SelectItem>
            <SelectItem value="phase_change">Změny fáze</SelectItem>
            <SelectItem value="node_created">Vytvořené uzly</SelectItem>
            <SelectItem value="node_updated">Aktualizace</SelectItem>
            <SelectItem value="milestone">Milníky</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="space-y-3 p-4">
          {isLoading ? (
            <p className="text-center text-sm text-muted-foreground">
              Načítání...
            </p>
          ) : filteredEntries.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              {entries.length === 0 ? "Zatím žádné záznamy." : "Žádné záznamy neodpovídají filtru."}
            </p>
          ) : (
            filteredEntries.map((entry) => (
              <DiaryEntryComponent
                key={entry.id}
                entry={entry}
                projectId={projectId}
                onNodeClick={onNodeClick}
                onEntryUpdated={loadEntries}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function TagSmallIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </svg>
  );
}

function DeadlineIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
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

function XIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}
