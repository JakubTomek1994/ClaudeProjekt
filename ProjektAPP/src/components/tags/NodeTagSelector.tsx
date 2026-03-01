"use client";

import { createClient } from "@/lib/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import type { Tag } from "@/lib/supabase/types";

interface NodeTagSelectorProps {
  nodeId: string;
  projectId: string;
  allTags: Tag[];
  assignedTagIds: string[];
  onTagsChanged: () => void;
  children: React.ReactNode;
}

export function NodeTagSelector({
  nodeId,
  allTags,
  assignedTagIds,
  onTagsChanged,
  children,
}: NodeTagSelectorProps) {
  const supabase = createClient();

  const handleToggle = async (tagId: string, isAssigned: boolean) => {
    if (isAssigned) {
      const { error } = await supabase
        .from("node_tags")
        .delete()
        .eq("node_id", nodeId)
        .eq("tag_id", tagId);

      if (error) {
        toast.error("Nepodařilo se odebrat štítek");
        return;
      }
    } else {
      const { error } = await supabase
        .from("node_tags")
        .insert({ node_id: nodeId, tag_id: tagId });

      if (error) {
        toast.error("Nepodařilo se přidat štítek");
        return;
      }
    }

    onTagsChanged();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Štítky</p>
        {allTags.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground">
            Žádné štítky. Vytvořte je v nastavení.
          </p>
        ) : (
          <div className="space-y-1">
            {allTags.map((tag) => {
              const isAssigned = assignedTagIds.includes(tag.id);
              return (
                <label
                  key={tag.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
                >
                  <Checkbox
                    checked={isAssigned}
                    onCheckedChange={() => handleToggle(tag.id, isAssigned)}
                  />
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-sm">{tag.name}</span>
                </label>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
