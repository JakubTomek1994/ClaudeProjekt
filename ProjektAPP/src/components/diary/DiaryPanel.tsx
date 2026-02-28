"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { DiaryEntryComponent } from "./DiaryEntry";
import { NewEntryForm } from "./NewEntryForm";
import { PHASES } from "@/lib/constants";
import { toast } from "sonner";
import type { DiaryEntry, EntryType, Phase } from "@/lib/supabase/types";

interface DiaryPanelProps {
  projectId: string;
  selectedNodeId?: string | null;
  onNodeClick?: (nodeId: string) => void;
}

export function DiaryPanel({ projectId, selectedNodeId, onNodeClick }: DiaryPanelProps) {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterPhase, setFilterPhase] = useState<Phase | "all">("all");
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

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleNewEntry = async (content: string, entryType: EntryType, nextStep: string) => {
    const { error } = await supabase.from("diary_entries").insert({
      project_id: projectId,
      node_id: selectedNodeId || null,
      entry_type: entryType,
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

  return (
    <div className="flex h-full flex-col border-l bg-background">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h2 className="text-sm font-semibold">
          {selectedNodeId ? "Denik uzlu" : "Denik projektu"}
        </h2>
        {selectedNodeId && (
          <button
            onClick={() => onNodeClick?.("")}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Zobrazit vse
          </button>
        )}
      </div>

      <div className="px-4 py-2">
        <NewEntryForm onSubmit={handleNewEntry} />
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <div className="space-y-3 p-4">
          {isLoading ? (
            <p className="text-center text-sm text-muted-foreground">
              Nacitani...
            </p>
          ) : entries.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              Zatim zadne zaznamy.
            </p>
          ) : (
            entries.map((entry) => (
              <DiaryEntryComponent
                key={entry.id}
                entry={entry}
                projectId={projectId}
                onNodeClick={onNodeClick}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
