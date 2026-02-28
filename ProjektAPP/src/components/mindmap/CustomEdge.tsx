"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { EDGE_TYPE_MAP } from "@/lib/constants";
import type { EdgeType } from "@/lib/supabase/types";

export interface CustomEdgeData {
  edgeType: EdgeType;
  sourceStatus: string;
  targetStatus: string;
  onDelete?: (edgeId: string) => void;
  [key: string]: unknown;
}

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const edgeData = data as unknown as CustomEdgeData | undefined;
  const edgeType = edgeData?.edgeType ?? "relates_to";
  const config = EDGE_TYPE_MAP.get(edgeType);

  const isBlocking = edgeType === "blocks";
  const sourceIsDone = edgeData?.sourceStatus === "done";

  // Determine edge color based on type + dependency state
  let strokeColor = config?.color ?? "#6b7280";
  if (isBlocking) {
    strokeColor = sourceIsDone ? "#22c55e" : "#ef4444";
  }

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: config?.strokeDasharray,
        }}
        markerEnd={config?.markerEnd ? `url(#arrow-${edgeType}${isBlocking && sourceIsDone ? "-done" : ""})` : undefined}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          <div
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-medium shadow-sm transition-opacity bg-card ${
              selected ? "opacity-100" : "opacity-70 hover:opacity-100"
            }`}
            style={{ borderColor: strokeColor, color: strokeColor }}
          >
            {isBlocking && (
              sourceIsDone
                ? <CheckIcon className="h-2.5 w-2.5" />
                : <LockIcon className="h-2.5 w-2.5" />
            )}
            <span>{config?.label ?? edgeType}</span>
            {edgeData?.onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  edgeData.onDelete?.(id);
                }}
                className="ml-0.5 rounded-full p-0.5 hover:bg-red-100 hover:text-red-600 transition-colors"
                title="Smazat propojení"
              >
                <XSmallIcon className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function XSmallIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}

/** SVG marker definitions to render in the ReactFlow container */
export function EdgeMarkerDefs() {
  return (
    <svg style={{ position: "absolute", width: 0, height: 0 }}>
      <defs>
        <marker id="arrow-blocks" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
        </marker>
        <marker id="arrow-blocks-done" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#22c55e" />
        </marker>
        <marker id="arrow-is_part_of" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
        </marker>
      </defs>
    </svg>
  );
}
