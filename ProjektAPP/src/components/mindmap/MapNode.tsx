"use client";

import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { PHASE_MAP, PHASES, TASK_STATUS_MAP, PRIORITY_MAP, getDeadlineStatus } from "@/lib/constants";
import type { Phase, TaskStatus, Priority } from "@/lib/supabase/types";

export interface MapNodeData {
  label: string;
  description: string | null;
  phase: Phase;
  status: TaskStatus;
  priority: Priority;
  deadline: string | null;
  tags: Array<{ name: string; color: string }>;
  diaryCount: number;
  subtaskProgress?: { done: number; total: number } | null;
  isBlocked?: boolean;
  blockedByCount?: number;
  dbId: string;
  isDimmed?: boolean;
  onChangePhase?: (nodeId: string, newPhase: Phase) => void;
  onCycleStatus?: (nodeId: string) => void;
  onCyclePriority?: (nodeId: string) => void;
  onUpdateLabel?: (nodeId: string, newLabel: string) => void;
  onDuplicate?: (nodeId: string) => void;
  [key: string]: unknown;
}

function MapNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as MapNodeData;
  const phaseConfig = PHASE_MAP.get(nodeData.phase);
  const statusConfig = TASK_STATUS_MAP.get(nodeData.status);
  const priorityConfig = PRIORITY_MAP.get(nodeData.priority);
  const deadlineStatus = getDeadlineStatus(nodeData.deadline);
  const [isPhaseMenuOpen, setIsPhaseMenuOpen] = useState(false);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [editLabel, setEditLabel] = useState(nodeData.label);
  const editInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditingLabel && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditingLabel]);

  useEffect(() => {
    if (!isPhaseMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsPhaseMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isPhaseMenuOpen]);

  const handleLabelDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditLabel(nodeData.label);
    setIsEditingLabel(true);
  };

  const handleLabelSave = () => {
    const trimmed = editLabel.trim();
    if (trimmed && trimmed !== nodeData.label) {
      nodeData.onUpdateLabel?.(nodeData.dbId, trimmed);
    }
    setIsEditingLabel(false);
  };

  const handleLabelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLabelSave();
    } else if (e.key === "Escape") {
      setIsEditingLabel(false);
      setEditLabel(nodeData.label);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPhaseMenuOpen(true);
  };

  const handlePhaseSelect = (phase: Phase) => {
    setIsPhaseMenuOpen(false);
    if (phase !== nodeData.phase) {
      nodeData.onChangePhase?.(nodeData.dbId, phase);
    }
  };

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    nodeData.onCycleStatus?.(nodeData.dbId);
  };

  const handlePriorityClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    nodeData.onCyclePriority?.(nodeData.dbId);
  };

  return (
    <div
      className={`relative rounded-lg border-2 bg-card px-4 py-3 shadow-sm transition-all ${
        selected ? "ring-2 ring-primary shadow-md" : "hover:shadow-md"
      } ${nodeData.isBlocked ? "border-red-300 border-dashed" : (phaseConfig?.borderColor ?? "border-gray-200")} ${nodeData.isDimmed ? "opacity-20 pointer-events-none" : ""}`}
      style={{ minWidth: 180, maxWidth: 220 }}
      onContextMenu={handleContextMenu}
    >
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-white !bg-gray-400" />

      <div className="mb-1 flex items-center justify-between gap-2">
        {isEditingLabel ? (
          <input
            ref={editInputRef}
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onBlur={handleLabelSave}
            onKeyDown={handleLabelKeyDown}
            className="w-full rounded border border-primary bg-card px-1 py-0.5 text-sm font-semibold outline-none"
          />
        ) : (
          <span
            className="truncate text-sm font-semibold cursor-text"
            onDoubleClick={handleLabelDoubleClick}
            title="Dvojklikem přejmenujete"
          >
            {nodeData.label}
          </span>
        )}
        {phaseConfig && (
          <Badge
            variant="secondary"
            className={`text-xs ${phaseConfig.color} ${phaseConfig.bgColor} shrink-0 cursor-context-menu`}
            title="Pravý klik pro změnu fáze"
          >
            {phaseConfig.label}
          </Badge>
        )}
      </div>

      {nodeData.description && (
        <p className="mb-1 line-clamp-2 text-xs text-muted-foreground">
          {nodeData.description}
        </p>
      )}

      <div className="mb-1 flex items-center gap-1">
        {statusConfig && (
          <Badge
            variant="secondary"
            className={`text-[10px] px-1.5 py-0 cursor-pointer select-none ${statusConfig.color} ${statusConfig.bgColor} hover:opacity-80`}
            onClick={handleStatusClick}
            title="Kliknutím změníte stav"
          >
            {statusConfig.label}
          </Badge>
        )}
        {priorityConfig && (
          <Badge
            variant="secondary"
            className={`text-[10px] px-1.5 py-0 cursor-pointer select-none ${priorityConfig.color} ${priorityConfig.bgColor} hover:opacity-80`}
            onClick={handlePriorityClick}
            title="Kliknutím změníte prioritu"
          >
            {priorityConfig.label}
          </Badge>
        )}
      </div>

      {nodeData.isBlocked && (
        <div className="mb-1 flex items-center gap-1 text-[10px] font-medium text-red-600">
          <LockSmallIcon className="h-3 w-3" />
          <span>Blokováno ({nodeData.blockedByCount} {nodeData.blockedByCount === 1 ? "závislost" : "závislosti"})</span>
        </div>
      )}

      {deadlineStatus && (
        <div className={`flex items-center gap-1 text-[10px] font-medium ${deadlineStatus.color}`}>
          <DeadlineIcon className="h-3 w-3" />
          <span>{deadlineStatus.label}</span>
        </div>
      )}

      {nodeData.tags && nodeData.tags.length > 0 && (
        <div className="mb-1 flex flex-wrap gap-1">
          {nodeData.tags.slice(0, 3).map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded-full px-1.5 py-0 text-[9px] font-medium text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </span>
          ))}
          {nodeData.tags.length > 3 && (
            <span className="text-[9px] text-muted-foreground">
              +{nodeData.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {nodeData.subtaskProgress && nodeData.subtaskProgress.total > 0 && (
        <div className="mb-1">
          <div className="flex items-center justify-between text-[9px] text-muted-foreground mb-0.5">
            <span>{nodeData.subtaskProgress.done}/{nodeData.subtaskProgress.total} kroků</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${(nodeData.subtaskProgress.done / nodeData.subtaskProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {nodeData.diaryCount > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <NoteIcon className="h-3 w-3" />
          <span>{nodeData.diaryCount} záznam{nodeData.diaryCount > 1 ? "y" : ""}</span>
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !border-white !bg-gray-400" />

      {isPhaseMenuOpen && (
        <div
          ref={menuRef}
          className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-md border bg-card py-1 shadow-lg"
        >
          <p className="px-3 py-1 text-xs font-medium text-muted-foreground">Změnit fázi</p>
          {PHASES.map((phase) => (
            <button
              key={phase.id}
              onClick={() => handlePhaseSelect(phase.id)}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-100 ${
                phase.id === nodeData.phase ? "font-semibold" : ""
              }`}
            >
              <span className={`inline-block h-2 w-2 rounded-full ${phase.bgColor} ${phase.borderColor} border`} />
              <span className={phase.color}>{phase.label}</span>
            </button>
          ))}
          <div className="my-1 border-t" />
          <button
            onClick={() => {
              setIsPhaseMenuOpen(false);
              nodeData.onDuplicate?.(nodeData.dbId);
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-100"
          >
            <CopyIcon className="h-3 w-3" />
            <span>Duplikovat</span>
          </button>
        </div>
      )}
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

function LockSmallIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
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

export const MapNodeType = memo(MapNodeComponent);
