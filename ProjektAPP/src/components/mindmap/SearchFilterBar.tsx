"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PHASES, TASK_STATUSES, PRIORITIES } from "@/lib/constants";
import type { Phase, TaskStatus, Priority, Tag } from "@/lib/supabase/types";

export interface FilterState {
  searchQuery: string;
  statusFilter: TaskStatus | "all";
  priorityFilter: Priority | "all";
  phaseFilter: Phase | "all";
  tagFilter: string | "all";
  deadlineFilter: "all" | "overdue" | "today" | "week" | "none";
}

export const DEFAULT_FILTERS: FilterState = {
  searchQuery: "",
  statusFilter: "all",
  priorityFilter: "all",
  phaseFilter: "all",
  tagFilter: "all",
  deadlineFilter: "all",
};

export interface SelectedNodeInfo {
  id: string;
  label: string;
  phase: Phase;
  status: TaskStatus;
  priority: Priority;
}

interface SearchFilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  allTags: Tag[];
  selectedNode?: SelectedNodeInfo | null;
  onChangePhase?: (nodeId: string, phase: Phase) => void;
  onSetStatus?: (nodeId: string, status: TaskStatus) => void;
  onSetPriority?: (nodeId: string, priority: Priority) => void;
  onDeleteNode?: (nodeId: string) => void;
  onFocusNode?: (nodeId: string) => void;
}

export function SearchFilterBar({
  filters,
  onFiltersChange,
  allTags,
  selectedNode,
  onChangePhase,
  onSetStatus,
  onSetPriority,
  onDeleteNode,
  onFocusNode,
}: SearchFilterBarProps) {
  const [localSearch, setLocalSearch] = useState(filters.searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.searchQuery) {
        onFiltersChange({ ...filters, searchQuery: localSearch });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch]);

  const isFiltered = filters.searchQuery !== "" ||
    filters.statusFilter !== "all" ||
    filters.priorityFilter !== "all" ||
    filters.phaseFilter !== "all" ||
    filters.tagFilter !== "all" ||
    filters.deadlineFilter !== "all";

  const handleReset = () => {
    setLocalSearch("");
    onFiltersChange(DEFAULT_FILTERS);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-background/80 px-3 py-1.5 backdrop-blur-sm">
      <div className="relative">
        <SearchIcon className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Hledat uzly..."
          className="h-7 w-40 pl-7 text-xs"
        />
      </div>

      <Select
        value={filters.statusFilter}
        onValueChange={(v) => onFiltersChange({ ...filters, statusFilter: v as TaskStatus | "all" })}
      >
        <SelectTrigger className="h-7 w-28 text-xs">
          <SelectValue placeholder="Stav" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Všechny stavy</SelectItem>
          {TASK_STATUSES.map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.priorityFilter}
        onValueChange={(v) => onFiltersChange({ ...filters, priorityFilter: v as Priority | "all" })}
      >
        <SelectTrigger className="h-7 w-28 text-xs">
          <SelectValue placeholder="Priorita" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Všechny priority</SelectItem>
          {PRIORITIES.map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.phaseFilter}
        onValueChange={(v) => onFiltersChange({ ...filters, phaseFilter: v as Phase | "all" })}
      >
        <SelectTrigger className="h-7 w-28 text-xs">
          <SelectValue placeholder="Fáze" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Všechny fáze</SelectItem>
          {PHASES.map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {allTags.length > 0 && (
        <Select
          value={filters.tagFilter}
          onValueChange={(v) => onFiltersChange({ ...filters, tagFilter: v })}
        >
          <SelectTrigger className="h-7 w-28 text-xs">
            <SelectValue placeholder="Štítek" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny štítky</SelectItem>
            {allTags.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={filters.deadlineFilter}
        onValueChange={(v) => onFiltersChange({ ...filters, deadlineFilter: v as FilterState["deadlineFilter"] })}
      >
        <SelectTrigger className="h-7 w-28 text-xs">
          <SelectValue placeholder="Termín" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Všechny termíny</SelectItem>
          <SelectItem value="overdue">Po termínu</SelectItem>
          <SelectItem value="today">Dnes</SelectItem>
          <SelectItem value="week">Tento týden</SelectItem>
          <SelectItem value="none">Bez termínu</SelectItem>
        </SelectContent>
      </Select>

      {isFiltered && (
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleReset}>
          Resetovat
        </Button>
      )}

      {selectedNode && (
        <div className="ml-auto flex items-center gap-2 border-l pl-2">
          <PencilIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <button
            className="truncate text-xs font-medium max-w-32 hover:text-primary hover:underline transition-colors"
            title="Zacentrovat na uzel"
            onClick={() => onFocusNode?.(selectedNode.id)}
          >
            {selectedNode.label}
          </button>

          <Select
            value={selectedNode.phase}
            onValueChange={(v) => onChangePhase?.(selectedNode.id, v as Phase)}
          >
            <SelectTrigger className="h-6 w-24 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PHASES.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedNode.status}
            onValueChange={(v) => onSetStatus?.(selectedNode.id, v as TaskStatus)}
          >
            <SelectTrigger className="h-6 w-28 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_STATUSES.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedNode.priority}
            onValueChange={(v) => onSetPriority?.(selectedNode.id, v as Priority)}
          >
            <SelectTrigger className="h-6 w-24 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600"
            onClick={() => onDeleteNode?.(selectedNode.id)}
            title="Smazat uzel"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
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
