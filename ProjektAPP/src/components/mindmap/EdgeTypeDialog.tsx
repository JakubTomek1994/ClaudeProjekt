"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EDGE_TYPES } from "@/lib/constants";
import type { EdgeType } from "@/lib/supabase/types";

interface EdgeTypeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: EdgeType) => void;
}

export function EdgeTypeDialog({ isOpen, onClose, onSelect }: EdgeTypeDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Typ propojení</DialogTitle>
          <DialogDescription>
            Vyberte typ vztahu mezi uzly.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {EDGE_TYPES.map((edgeType) => (
            <button
              key={edgeType.id}
              onClick={() => onSelect(edgeType.id)}
              className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
            >
              <div
                className="h-4 w-8 rounded-full border-2"
                style={{
                  borderColor: edgeType.color,
                  borderStyle: edgeType.strokeDasharray ? "dashed" : "solid",
                }}
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{edgeType.label}</p>
                <p className="text-xs text-muted-foreground">{edgeType.description}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
