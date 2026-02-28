"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AttachmentPreview } from "./AttachmentPreview";
import { AttachmentUpload } from "./AttachmentUpload";
import { createClient } from "@/lib/supabase/client";
import type { DiaryEntry as DiaryEntryType, Attachment } from "@/lib/supabase/types";

const ENTRY_TYPE_LABELS: Record<string, string> = {
  note: "Poznamka",
  phase_change: "Zmena faze",
  node_created: "Novy uzel",
  node_updated: "Uprava uzlu",
  milestone: "Milnik",
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
}

export function DiaryEntryComponent({ entry, projectId, onNodeClick }: DiaryEntryProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
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

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={ENTRY_TYPE_COLORS[entry.entry_type]}>
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
        <time className="text-xs text-muted-foreground">
          {new Date(entry.created_at).toLocaleString("cs-CZ")}
        </time>
      </div>

      <p className="whitespace-pre-wrap text-sm">{entry.content}</p>

      {entry.next_step && (
        <div className="mt-2 rounded bg-muted px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">Dalsi krok:</p>
          <p className="text-sm">{entry.next_step}</p>
        </div>
      )}

      {attachments.length > 0 && (
        <>
          <Separator className="my-3" />
          <div className="flex flex-wrap gap-2">
            {attachments.map((att) => (
              <AttachmentPreview key={att.id} attachment={att} />
            ))}
          </div>
        </>
      )}

      <Separator className="my-3" />
      <AttachmentUpload
        diaryEntryId={entry.id}
        projectId={projectId}
        onUploaded={loadAttachments}
      />
    </div>
  );
}
