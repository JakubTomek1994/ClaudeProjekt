"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { PHASE_MAP } from "@/lib/constants";
import type { Phase } from "@/lib/supabase/types";

export interface MapNodeData {
  label: string;
  description: string | null;
  phase: Phase;
  diaryCount: number;
  dbId: string;
  [key: string]: unknown;
}

function MapNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as MapNodeData;
  const phaseConfig = PHASE_MAP.get(nodeData.phase);

  return (
    <div
      className={`rounded-lg border-2 bg-white px-4 py-3 shadow-sm transition-shadow ${
        selected ? "ring-2 ring-primary shadow-md" : "hover:shadow-md"
      } ${phaseConfig?.borderColor ?? "border-gray-200"}`}
      style={{ minWidth: 180, maxWidth: 220 }}
    >
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-white !bg-gray-400" />

      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold">{nodeData.label}</span>
        {phaseConfig && (
          <Badge variant="secondary" className={`text-xs ${phaseConfig.color} ${phaseConfig.bgColor} shrink-0`}>
            {phaseConfig.label}
          </Badge>
        )}
      </div>

      {nodeData.description && (
        <p className="mb-1 line-clamp-2 text-xs text-muted-foreground">
          {nodeData.description}
        </p>
      )}

      {nodeData.diaryCount > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <NoteIcon className="h-3 w-3" />
          <span>{nodeData.diaryCount} zaznam{nodeData.diaryCount > 1 ? "y" : ""}</span>
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !border-white !bg-gray-400" />
    </div>
  );
}

function NoteIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 20h9" /><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
    </svg>
  );
}

export const MapNodeType = memo(MapNodeComponent);
