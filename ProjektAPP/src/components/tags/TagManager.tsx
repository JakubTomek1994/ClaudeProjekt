"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Tag } from "@/lib/supabase/types";

const TAG_COLORS = [
  "#6b7280", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6",
  "#ec4899", "#14b8a6",
];

interface TagManagerProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onTagsChanged: () => void;
}

export function TagManager({ projectId, isOpen, onClose, onTagsChanged }: TagManagerProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const supabase = createClient();

  const loadTags = async () => {
    const { data } = await supabase
      .from("tags")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (data) setTags(data as Tag[]);
  };

  useEffect(() => {
    if (isOpen) loadTags();
  }, [isOpen]);

  const handleCreate = async () => {
    if (!newName.trim()) return;

    const { error } = await supabase.from("tags").insert({
      project_id: projectId,
      name: newName.trim(),
      color: newColor,
    });

    if (error) {
      toast.error("Nepodařilo se vytvořit štítek");
      return;
    }

    setNewName("");
    setNewColor(TAG_COLORS[0]);
    loadTags();
    onTagsChanged();
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;

    const { error } = await supabase
      .from("tags")
      .update({ name: editName.trim(), color: editColor })
      .eq("id", id);

    if (error) {
      toast.error("Nepodařilo se upravit štítek");
      return;
    }

    setEditingId(null);
    loadTags();
    onTagsChanged();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("tags").delete().eq("id", id);

    if (error) {
      toast.error("Nepodařilo se smazat štítek");
      return;
    }

    loadTags();
    onTagsChanged();
  };

  const startEditing = (tag: Tag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Správa štítků</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create new tag */}
          <div className="space-y-2">
            <Label>Nový štítek</Label>
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Název štítku"
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <Button onClick={handleCreate} disabled={!newName.trim()} size="sm">
                Přidat
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TAG_COLORS.map((color) => (
                <button
                  key={color}
                  className={`h-6 w-6 rounded-full border-2 transition-transform ${
                    newColor === color ? "scale-125 border-foreground" : "border-transparent hover:scale-110"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setNewColor(color)}
                  aria-label={`Barva ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Tag list */}
          {tags.length > 0 && (
            <div className="space-y-2">
              <Label>Existující štítky</Label>
              <div className="max-h-60 space-y-1.5 overflow-y-auto">
                {tags.map((tag) => (
                  <div key={tag.id} className="flex items-center gap-2 rounded-md border p-2">
                    {editingId === tag.id ? (
                      <>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-7 flex-1 text-sm"
                          onKeyDown={(e) => e.key === "Enter" && handleUpdate(tag.id)}
                        />
                        <div className="flex gap-1">
                          {TAG_COLORS.map((color) => (
                            <button
                              key={color}
                              className={`h-4 w-4 rounded-full border ${
                                editColor === color ? "border-foreground" : "border-transparent"
                              }`}
                              style={{ backgroundColor: color }}
                              onClick={() => setEditColor(color)}
                              aria-label={`Barva ${color}`}
                            />
                          ))}
                        </div>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleUpdate(tag.id)}>
                          Uložit
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingId(null)}>
                          Zrušit
                        </Button>
                      </>
                    ) : (
                      <>
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="flex-1 text-sm">{tag.name}</span>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => startEditing(tag)}>
                          Upravit
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-600 hover:text-red-700" onClick={() => handleDelete(tag.id)}>
                          Smazat
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
