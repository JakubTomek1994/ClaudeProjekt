"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

interface SearchResult {
  type: "project" | "node" | "entry";
  id: string;
  projectId: string;
  label: string;
  description?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  const fetchResults = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const search = `%${q.trim()}%`;

    const [projectsResult, nodesResult, entriesResult] = await Promise.all([
      supabase
        .from("projects")
        .select("id, name, description")
        .or(`name.ilike.${search},description.ilike.${search}`)
        .limit(5),
      supabase
        .from("map_nodes")
        .select("id, project_id, label, description")
        .or(`label.ilike.${search},description.ilike.${search}`)
        .limit(10),
      supabase
        .from("diary_entries")
        .select("id, project_id, content, node_id")
        .ilike("content", search)
        .limit(5),
    ]);

    const items: SearchResult[] = [];

    if (projectsResult.data) {
      for (const p of projectsResult.data) {
        items.push({
          type: "project",
          id: p.id,
          projectId: p.id,
          label: p.name,
          description: p.description ?? undefined,
        });
      }
    }

    if (nodesResult.data) {
      for (const n of nodesResult.data) {
        items.push({
          type: "node",
          id: n.id,
          projectId: n.project_id,
          label: n.label,
          description: n.description ?? undefined,
        });
      }
    }

    if (entriesResult.data) {
      for (const e of entriesResult.data) {
        items.push({
          type: "entry",
          id: e.id,
          projectId: e.project_id,
          label: e.content.substring(0, 80) + (e.content.length > 80 ? "..." : ""),
        });
      }
    }

    setResults(items);
    setSelectedIndex(0);
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => fetchResults(query), 200);
    return () => clearTimeout(timer);
  }, [query, fetchResults]);

  const handleSelect = (result: SearchResult) => {
    onClose();
    router.push(`/project/${result.projectId}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  const grouped = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    for (const r of results) {
      const key = r.type;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }
    return groups;
  }, [results]);

  const TYPE_LABELS: Record<string, string> = {
    project: "Projekty",
    node: "Uzly",
    entry: "Záznamy",
  };

  let flatIndex = -1;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg gap-0 p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Vyhledávání</DialogTitle>
        </DialogHeader>
        <div className="flex items-center border-b px-4 py-3">
          <SearchIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Hledat projekty, uzly, záznamy..."
            className="h-8 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
            autoFocus
          />
          <kbd className="ml-2 shrink-0 rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {isLoading && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Hledání...</p>
          )}

          {!isLoading && query && results.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Žádné výsledky.</p>
          )}

          {!isLoading && Object.entries(grouped).map(([type, items]) => (
            <div key={type}>
              <p className="px-4 pt-2 pb-1 text-xs font-semibold text-muted-foreground">
                {TYPE_LABELS[type] || type}
              </p>
              {items.map((item) => {
                flatIndex++;
                const idx = flatIndex;
                return (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleSelect(item)}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors hover:bg-accent ${
                      idx === selectedIndex ? "bg-accent" : ""
                    }`}
                  >
                    <TypeIcon type={item.type} className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.label}</p>
                      {item.description && (
                        <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}

          {!query && !isLoading && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Začněte psát pro vyhledávání...
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TypeIcon({ type, className }: { type: string; className?: string }) {
  if (type === "project") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
      </svg>
    );
  }
  if (type === "node") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="3" /><path d="M12 2v4" /><path d="M12 18v4" /><path d="m4.93 4.93 2.83 2.83" /><path d="m16.24 16.24 2.83 2.83" /><path d="M2 12h4" /><path d="M18 12h4" /><path d="m4.93 19.07 2.83-2.83" /><path d="m16.24 7.76 2.83-2.83" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 20h9" /><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  );
}
