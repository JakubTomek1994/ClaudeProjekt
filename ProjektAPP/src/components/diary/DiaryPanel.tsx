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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import type { DiaryEntry, MapNode, Subtask, SubtaskAttachment, TaskStatus, Priority, Tag, NodeTag } from "@/lib/supabase/types";

const OFFICE_EXTENSIONS = [".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".odt", ".ods", ".odp"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico"];
const TEXT_EXTENSIONS = [".txt", ".md", ".csv", ".json", ".xml", ".html", ".css", ".js", ".ts", ".log"];

function isOfficeFile(fileName: string): boolean {
  return OFFICE_EXTENSIONS.some((ext) => fileName.toLowerCase().endsWith(ext));
}

function isImageFile(fileName: string): boolean {
  return IMAGE_EXTENSIONS.some((ext) => fileName.toLowerCase().endsWith(ext));
}

function isTextFile(fileName: string): boolean {
  return TEXT_EXTENSIONS.some((ext) => fileName.toLowerCase().endsWith(ext));
}

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
  const [expandedSubtaskId, setExpandedSubtaskId] = useState<string | null>(null);
  const [subtaskNotes, setSubtaskNotes] = useState<Map<string, string>>(new Map());
  const [subtaskAttachments, setSubtaskAttachments] = useState<Map<string, SubtaskAttachment[]>>(new Map());
  const [isUploadingSubtaskFile, setIsUploadingSubtaskFile] = useState(false);
  const [isDraggingSubtaskFile, setIsDraggingSubtaskFile] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<SubtaskAttachment | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTextContent, setPreviewTextContent] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
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
      setSubtaskNotes(new Map());
      setSubtaskAttachments(new Map());
      setExpandedSubtaskId(null);
      return;
    }

    const [nodeResult, tagsResult, subtasksResult] = await Promise.all([
      supabase.from("map_nodes").select("*").eq("id", selectedNodeId).single(),
      supabase.from("node_tags").select("tag_id").eq("node_id", selectedNodeId),
      supabase.from("subtasks").select("*").eq("node_id", selectedNodeId).order("sort_order", { ascending: true }),
    ]);

    if (nodeResult.data) setNodeData(nodeResult.data as MapNode);
    if (tagsResult.data) setAssignedTagIds((tagsResult.data as NodeTag[]).map((nt) => nt.tag_id));

    const loadedSubtasks = (subtasksResult.data ?? []) as Subtask[];
    setSubtasks(loadedSubtasks);

    // Initialize notes map from loaded subtasks
    const notesMap = new Map<string, string>();
    for (const s of loadedSubtasks) {
      notesMap.set(s.id, s.notes ?? "");
    }
    setSubtaskNotes(notesMap);

    // Load attachments for all subtasks in one query
    if (loadedSubtasks.length > 0) {
      const subtaskIds = loadedSubtasks.map((s) => s.id);
      const { data: attachData } = await supabase
        .from("subtask_attachments")
        .select("*")
        .in("subtask_id", subtaskIds)
        .order("created_at", { ascending: true });

      const attMap = new Map<string, SubtaskAttachment[]>();
      for (const att of (attachData ?? []) as SubtaskAttachment[]) {
        const existing = attMap.get(att.subtask_id) ?? [];
        existing.push(att);
        attMap.set(att.subtask_id, existing);
      }
      setSubtaskAttachments(attMap);
    } else {
      setSubtaskAttachments(new Map());
    }
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

  const handleSaveSubtaskNotes = useCallback(async (subtaskId: string) => {
    const notes = subtaskNotes.get(subtaskId) ?? "";
    const subtask = subtasks.find((s) => s.id === subtaskId);
    if (!subtask || notes === (subtask.notes ?? "")) return;

    const { error } = await supabase
      .from("subtasks")
      .update({ notes: notes || "" })
      .eq("id", subtaskId);

    if (error) {
      toast.error("Nepodařilo se uložit poznámku");
      return;
    }

    setSubtasks((prev) => prev.map((s) => s.id === subtaskId ? { ...s, notes } : s));
  }, [subtaskNotes, subtasks, supabase]);

  const handleSubtaskFileUpload = useCallback(async (subtaskId: string, files: FileList | File[]) => {
    const MAX_FILE_SIZE = 20 * 1024 * 1024;
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`Soubor "${file.name}" je příliš velký (max 20 MB)`);
        continue;
      }

      setIsUploadingSubtaskFile(true);
      try {
        const safeName = file.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9._-]/g, "_");
        const filePath = `${projectId}/subtasks/${subtaskId}/${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("attachments")
          .upload(filePath, file);

        if (uploadError) {
          console.error("Storage upload error:", uploadError);
          toast.error(`Nepodařilo se nahrát "${file.name}": ${uploadError.message}`);
          continue;
        }

        const { data: dbData, error: dbError } = await supabase
          .from("subtask_attachments")
          .insert({
            subtask_id: subtaskId,
            file_name: file.name,
            file_path: filePath,
            file_type: file.type || "application/octet-stream",
            file_size: file.size,
          })
          .select()
          .single();

        if (dbError) {
          console.error("DB insert error:", dbError);
          toast.error(`Nepodařilo se uložit záznam pro "${file.name}": ${dbError.message}`);
          // Clean up the orphaned storage file
          await supabase.storage.from("attachments").remove([filePath]);
          continue;
        }

        if (dbData) {
          const att = dbData as SubtaskAttachment;
          setSubtaskAttachments((prev) => {
            const next = new Map(prev);
            const existing = next.get(subtaskId) ?? [];
            next.set(subtaskId, [...existing, att]);
            return next;
          });
          toast.success(`Soubor "${file.name}" nahrán`);
        }
      } catch (err) {
        console.error("Unexpected upload error:", err);
        toast.error(`Chyba při nahrávání "${file.name}"`);
      } finally {
        setIsUploadingSubtaskFile(false);
      }
    }
  }, [projectId, supabase]);

  const handleDeleteSubtaskAttachment = useCallback(async (attachment: SubtaskAttachment) => {
    if (!confirm(`Smazat soubor "${attachment.file_name}"?`)) return;

    const { error: storageError } = await supabase.storage
      .from("attachments")
      .remove([attachment.file_path]);

    if (storageError) {
      toast.error("Nepodařilo se smazat soubor z úložiště");
      return;
    }

    const { error: dbError } = await supabase
      .from("subtask_attachments")
      .delete()
      .eq("id", attachment.id);

    if (dbError) {
      toast.error("Nepodařilo se smazat záznam přílohy");
      return;
    }

    setSubtaskAttachments((prev) => {
      const next = new Map(prev);
      const existing = next.get(attachment.subtask_id) ?? [];
      next.set(attachment.subtask_id, existing.filter((a) => a.id !== attachment.id));
      return next;
    });
    toast.success("Soubor smazán");
  }, [supabase]);

  const handleOpenSubtaskAttachment = useCallback(async (attachment: SubtaskAttachment) => {
    setPreviewAttachment(attachment);
    setPreviewUrl(null);
    setPreviewTextContent(null);
    setIsPreviewLoading(true);

    try {
      if (isTextFile(attachment.file_name)) {
        const { data, error } = await supabase.storage
          .from("attachments")
          .download(attachment.file_path);

        if (error || !data) {
          toast.error("Nepodařilo se načíst soubor");
          setPreviewAttachment(null);
          return;
        }

        const text = await data.text();
        setPreviewTextContent(text);
      } else {
        const { data, error } = await supabase.storage
          .from("attachments")
          .createSignedUrl(attachment.file_path, 3600);

        if (error || !data?.signedUrl) {
          toast.error("Nepodařilo se vytvořit odkaz na soubor");
          setPreviewAttachment(null);
          return;
        }

        setPreviewUrl(data.signedUrl);
      }
    } catch {
      toast.error("Chyba při načítání náhledu");
      setPreviewAttachment(null);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [supabase]);

  const handleDownloadSubtaskAttachment = useCallback(async (attachment: SubtaskAttachment) => {
    const { data, error } = await supabase.storage
      .from("attachments")
      .download(attachment.file_path);

    if (error || !data) return;

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = attachment.file_name;
    a.click();
    URL.revokeObjectURL(url);
  }, [supabase]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
              {subtasks.map((subtask, index) => {
                const isExpanded = expandedSubtaskId === subtask.id;
                const attachments = subtaskAttachments.get(subtask.id) ?? [];
                const hasDetail = (subtask.notes && subtask.notes.length > 0) || attachments.length > 0;

                return (
                <div key={subtask.id}>
                  <div className="group flex items-center gap-1.5">
                    <button
                      onClick={() => setExpandedSubtaskId(isExpanded ? null : subtask.id)}
                      className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground"
                      title={isExpanded ? "Sbalit" : "Rozbalit"}
                    >
                      {isExpanded ? (
                        <ChevronDownSmallIcon className="h-3 w-3" />
                      ) : (
                        <ChevronRightSmallIcon className={cn("h-3 w-3", hasDetail && "text-primary")} />
                      )}
                    </button>
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

                  {isExpanded && (
                    <div className="ml-5 mt-1 mb-2 rounded-md border bg-muted/30 p-2.5 space-y-2.5">
                      {/* Notes */}
                      <div>
                        <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Poznámky</label>
                        <Textarea
                          value={subtaskNotes.get(subtask.id) ?? ""}
                          onChange={(e) => {
                            setSubtaskNotes((prev) => {
                              const next = new Map(prev);
                              next.set(subtask.id, e.target.value);
                              return next;
                            });
                          }}
                          onBlur={() => handleSaveSubtaskNotes(subtask.id)}
                          placeholder="Poznámky ke kroku..."
                          rows={2}
                          className="text-xs resize-none"
                        />
                      </div>

                      {/* Attachments list */}
                      {attachments.length > 0 && (
                        <div>
                          <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Přílohy</label>
                          <div className="space-y-1">
                            {attachments.map((att) => {
                              const iconInfo = getFileIconInfo(att.file_name);
                              const ext = att.file_name.split(".").pop()?.toUpperCase() ?? "";
                              return (
                              <div key={att.id} className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-muted/50">
                                <iconInfo.Icon className={cn("h-3.5 w-3.5 shrink-0", iconInfo.color)} />
                                <button
                                  onClick={() => handleOpenSubtaskAttachment(att)}
                                  className="min-w-0 flex-1 truncate text-left hover:underline"
                                  title={att.file_name}
                                >
                                  {att.file_name}
                                </button>
                                <span className="shrink-0 text-[10px] text-muted-foreground">
                                  {formatFileSize(att.file_size)}
                                </span>
                                {ext && (
                                  <span className="shrink-0 rounded bg-muted px-1 py-0.5 text-[9px] font-semibold uppercase text-muted-foreground">
                                    {ext}
                                  </span>
                                )}
                                <button
                                  onClick={() => handleDeleteSubtaskAttachment(att)}
                                  className="shrink-0 p-0.5 text-muted-foreground hover:text-red-600"
                                  title="Smazat soubor"
                                >
                                  <XIcon className="h-3 w-3" />
                                </button>
                              </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Upload area */}
                      <div
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingSubtaskFile(false);
                          if (e.dataTransfer.files.length > 0) {
                            handleSubtaskFileUpload(subtask.id, e.dataTransfer.files);
                          }
                        }}
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingSubtaskFile(true); }}
                        onDragLeave={() => setIsDraggingSubtaskFile(false)}
                        className={cn(
                          "flex items-center justify-center rounded border-2 border-dashed p-2 text-center transition-colors",
                          isDraggingSubtaskFile
                            ? "border-primary bg-primary/5"
                            : "border-muted-foreground/25 hover:border-muted-foreground/50"
                        )}
                      >
                        <input
                          id={`subtask-file-${subtask.id}`}
                          type="file"
                          multiple
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              handleSubtaskFileUpload(subtask.id, e.target.files);
                              e.target.value = "";
                            }
                          }}
                          className="sr-only"
                        />
                        {isUploadingSubtaskFile ? (
                          <p className="text-[11px] text-muted-foreground">Nahrávám...</p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => document.getElementById(`subtask-file-${subtask.id}`)?.click()}
                            className="cursor-pointer text-[11px] text-muted-foreground"
                          >
                            <span>Přetáhněte soubory nebo </span>
                            <span className="font-medium text-primary underline">vyberte</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                );
              })}
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

      {/* Subtask attachment preview modal */}
      <Dialog open={!!previewAttachment} onOpenChange={(open) => { if (!open) setPreviewAttachment(null); }}>
        <DialogContent className="max-h-[90vh] sm:max-w-4xl overflow-hidden p-0">
          {previewAttachment && (
            <>
              <DialogHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
                <DialogTitle className="truncate text-sm font-medium">
                  {previewAttachment.file_name}
                </DialogTitle>
                <button
                  onClick={() => handleDownloadSubtaskAttachment(previewAttachment)}
                  className="mr-8 flex shrink-0 items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                >
                  <DownloadIcon className="h-3.5 w-3.5" />
                  Stáhnout
                </button>
              </DialogHeader>
              <div className="flex max-h-[calc(90vh-60px)] items-center justify-center overflow-auto p-4">
                {isPreviewLoading ? (
                  <p className="text-sm text-muted-foreground">Načítání náhledu...</p>
                ) : previewTextContent !== null ? (
                  <pre className="max-h-[calc(90vh-100px)] w-full overflow-auto whitespace-pre-wrap rounded bg-zinc-950 p-4 font-mono text-sm leading-relaxed text-zinc-200">
                    {previewTextContent}
                  </pre>
                ) : previewUrl ? (
                  isImageFile(previewAttachment.file_name) ? (
                    <img
                      src={previewUrl}
                      alt={previewAttachment.file_name}
                      className="max-h-[calc(90vh-100px)] w-auto max-w-full rounded object-contain"
                    />
                  ) : isOfficeFile(previewAttachment.file_name) ? (
                    <iframe
                      src={`https://docs.google.com/gview?url=${encodeURIComponent(previewUrl)}&embedded=true`}
                      title={previewAttachment.file_name}
                      className="h-[calc(90vh-100px)] w-full rounded"
                    />
                  ) : (
                    <iframe
                      src={previewUrl}
                      title={previewAttachment.file_name}
                      className="h-[calc(90vh-100px)] w-full rounded"
                    />
                  )
                ) : null}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
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

function ChevronRightSmallIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function ChevronDownSmallIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

// File type icon helper
type IconComponent = (props: { className?: string }) => React.JSX.Element;

function getFileIconInfo(fileName: string): { Icon: IconComponent; color: string } {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".doc") || lower.endsWith(".docx") || lower.endsWith(".odt"))
    return { Icon: FileWordIcon, color: "text-blue-500" };
  if (lower.endsWith(".xls") || lower.endsWith(".xlsx") || lower.endsWith(".csv"))
    return { Icon: FileSpreadsheetIcon, color: "text-green-500" };
  if (lower.endsWith(".ppt") || lower.endsWith(".pptx"))
    return { Icon: FileTextIcon, color: "text-orange-500" };
  if (lower.endsWith(".pdf"))
    return { Icon: FileTextIcon, color: "text-red-500" };
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico"].some((ext) => lower.endsWith(ext)))
    return { Icon: FileImageIcon, color: "text-violet-500" };
  if ([".zip", ".rar", ".7z", ".tar", ".gz", ".bz2"].some((ext) => lower.endsWith(ext)))
    return { Icon: FileArchiveIcon, color: "text-amber-500" };

  return { Icon: FileGenericIcon, color: "text-muted-foreground" };
}

// File type SVG icons (lucide-style)
function FileWordIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M8 13h2l1 3 1-3h2" />
    </svg>
  );
}

function FileSpreadsheetIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M8 13h2" /><path d="M14 13h2" /><path d="M8 17h2" /><path d="M14 17h2" />
    </svg>
  );
}

function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 13H8" /><path d="M16 13h-2" /><path d="M10 17H8" />
    </svg>
  );
}

function FileImageIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><circle cx="10" cy="13" r="2" /><path d="m20 17-1.1-1.1a2 2 0 0 0-2.81.01L10 22" />
    </svg>
  );
}

function FileArchiveIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 12v4h4v-4z" /><path d="M10 12h4" />
    </svg>
  );
}

function FileGenericIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </svg>
  );
}
