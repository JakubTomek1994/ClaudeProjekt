"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AttachmentPreview } from "./AttachmentPreview";
import { AttachmentUpload } from "./AttachmentUpload";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { DiaryEntry as DiaryEntryType, Attachment } from "@/lib/supabase/types";

const ENTRY_TYPE_LABELS: Record<string, string> = {
  note: "Poznámka",
  phase_change: "Změna fáze",
  node_created: "Nový uzel",
  node_updated: "Úprava uzlu",
  milestone: "Milník",
};

const ENTRY_TYPE_COLORS: Record<string, string> = {
  note: "bg-blue-100 text-blue-700",
  phase_change: "bg-purple-100 text-purple-700",
  node_created: "bg-green-100 text-green-700",
  node_updated: "bg-amber-100 text-amber-700",
  milestone: "bg-red-100 text-red-700",
};

interface DiaryEntryProps {
  entry: DiaryEntryType;
  projectId: string;
  onNodeClick?: (nodeId: string) => void;
  onEntryUpdated?: () => void;
}

export function DiaryEntryComponent({ entry, projectId, onNodeClick, onEntryUpdated }: DiaryEntryProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(entry.content);
  const [editNextStep, setEditNextStep] = useState(entry.next_step ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadVisible, setIsUploadVisible] = useState(false);
  const supabase = createClient();

  const loadAttachments = async () => {
    const { data } = await supabase
      .from("attachments")
      .select("*")
      .eq("diary_entry_id", entry.id)
      .order("created_at", { ascending: true });

    if (data) setAttachments(data as Attachment[]);
  };

  useEffect(() => {
    loadAttachments();
  }, [entry.id]);

  const handleEditSave = async () => {
    if (!editContent.trim()) return;
    setIsSaving(true);

    const { error } = await supabase
      .from("diary_entries")
      .update({
        content: editContent.trim(),
        next_step: editNextStep.trim() || null,
      })
      .eq("id", entry.id);

    setIsSaving(false);

    if (error) {
      toast.error("Nepodařilo se uložit změny");
      return;
    }

    toast.success("Záznam upraven");
    setIsEditing(false);
    onEntryUpdated?.();
  };

  const handleEditCancel = () => {
    setEditContent(entry.content);
    setEditNextStep(entry.next_step ?? "");
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!confirm("Opravdu chcete smazat tento záznam?")) return;

    setIsDeleting(true);
    const { error } = await supabase
      .from("diary_entries")
      .delete()
      .eq("id", entry.id);

    if (error) {
      toast.error("Nepodařilo se smazat záznam");
      setIsDeleting(false);
      return;
    }

    onEntryUpdated?.();
  };

  return (
    <div className="overflow-hidden rounded-lg border bg-card p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={`shrink-0 text-[10px] px-1.5 py-0 ${ENTRY_TYPE_COLORS[entry.entry_type]}`}>
            {ENTRY_TYPE_LABELS[entry.entry_type]}
          </Badge>
          {entry.node_id && onNodeClick && (
            <button
              onClick={() => onNodeClick(entry.node_id!)}
              className="text-xs text-primary underline hover:no-underline"
            >
              Zobrazit uzel
            </button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <time className="text-xs text-muted-foreground">
            {new Date(entry.created_at).toLocaleString("cs-CZ")}
          </time>
          <button
            onClick={() => {
              setEditContent(entry.content);
              setEditNextStep(entry.next_step ?? "");
              setIsEditing(true);
            }}
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
            title="Upravit záznam"
          >
            <EditIcon className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-xs text-muted-foreground hover:text-red-600 transition-colors"
            title="Smazat záznam"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
            className="text-sm"
            autoFocus
          />
          {(entry.next_step !== null || editNextStep) && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Další krok:</p>
              <Input
                value={editNextStep}
                onChange={(e) => setEditNextStep(e.target.value)}
                className="text-sm"
                placeholder="Další krok..."
              />
            </div>
          )}
          <div className="flex gap-1">
            <Button size="sm" className="h-7 text-xs" onClick={handleEditSave} disabled={isSaving || !editContent.trim()}>
              {isSaving ? "Ukládání..." : "Uložit"}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleEditCancel}>
              Zrušit
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="break-words whitespace-pre-wrap text-sm">{entry.content}</p>

          {entry.next_step && (
            <div className="mt-2 rounded bg-muted px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground">Další krok:</p>
              <p className="text-sm">{entry.next_step}</p>
            </div>
          )}
        </>
      )}

      {attachments.length > 0 && (
        <div className="mt-3 flex flex-col gap-1">
          {attachments.map((att) => (
            <AttachmentPreview key={att.id} attachment={att} onDeleted={loadAttachments} />
          ))}
        </div>
      )}

      {isUploadVisible ? (
        <div className="mt-3">
          <AttachmentUpload
            diaryEntryId={entry.id}
            projectId={projectId}
            onUploaded={() => {
              loadAttachments();
              setIsUploadVisible(false);
            }}
          />
        </div>
      ) : (
        <button
          onClick={() => setIsUploadVisible(true)}
          className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <PaperclipIcon className="h-3.5 w-3.5" />
          Připojit soubor
        </button>
      )}
    </div>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 20h9" /><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
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

function PaperclipIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}
