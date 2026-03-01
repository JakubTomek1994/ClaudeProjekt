"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MindMap } from "@/components/mindmap/MindMap";
import { DiaryPanel } from "@/components/diary/DiaryPanel";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagManager } from "@/components/tags/TagManager";
import { PhaseManager } from "@/components/mindmap/PhaseManager";
import { CommandPalette } from "@/components/CommandPalette";
import { projectPhasesToConfig, type PhaseConfig } from "@/lib/constants";
import type { Project, ProjectStatus, ProjectPhase, Tag } from "@/lib/supabase/types";
import { toast } from "sonner";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDiaryOpen, setIsDiaryOpen] = useState(false);
  const [mapRefreshKey, setMapRefreshKey] = useState(0);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [isPhaseManagerOpen, setIsPhaseManagerOpen] = useState(false);
  const [projectPhases, setProjectPhases] = useState<PhaseConfig[] | undefined>(undefined);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const loadProject = async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        toast.error("Projekt nenalezen");
        router.push("/dashboard");
        return;
      }

      setProject(data as Project);
      setIsLoading(false);
    };

    loadProject();
  }, [id, supabase, router]);

  const loadTags = useCallback(async () => {
    const { data } = await supabase
      .from("tags")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: true });

    if (data) setAllTags(data as Tag[]);
  }, [id, supabase]);

  const loadPhases = useCallback(async () => {
    const { data } = await supabase
      .from("project_phases")
      .select("*")
      .eq("project_id", id)
      .order("sort_order", { ascending: true });

    if (data && data.length > 0) {
      setProjectPhases(projectPhasesToConfig(data as ProjectPhase[]));
    }
  }, [id, supabase]);

  useEffect(() => {
    if (!isLoading) {
      loadTags();
      loadPhases();
    }
  }, [isLoading, loadTags, loadPhases]);

  const handleTagsChanged = useCallback(() => {
    loadTags();
    setMapRefreshKey((k) => k + 1);
  }, [loadTags]);

  const handlePhasesChanged = useCallback(() => {
    loadPhases();
    setMapRefreshKey((k) => k + 1);
  }, [loadPhases]);

  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    if (nodeId) {
      setIsDiaryOpen(true);
    }
  }, []);

  const handleNodeClickFromDiary = useCallback((nodeId: string) => {
    if (!nodeId) {
      setSelectedNodeId(null);
    } else {
      setSelectedNodeId(nodeId);
    }
  }, []);

  const handleStatusChange = useCallback(async (newStatus: ProjectStatus) => {
    const { error } = await supabase
      .from("projects")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast.error("Nepodařilo se změnit stav projektu");
      return;
    }

    setProject((prev) => prev ? { ...prev, status: newStatus } : prev);
    toast.success(`Stav projektu změněn`);
  }, [id, supabase]);

  const handleNodeDataChanged = useCallback(() => {
    setMapRefreshKey((k) => k + 1);
  }, []);

  if (isLoading || !project) {
    return (
      <div className="flex h-screen">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Načítání...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Project header */}
        <header className="flex items-center justify-between border-b px-2 py-2 md:px-4">
          <div className="flex items-center gap-1 md:gap-3 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden"
              aria-label="Otevřít menu"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
            <Button variant="ghost" size="sm" className="hidden md:inline-flex" onClick={() => router.push("/dashboard")}>
              <ArrowLeftIcon className="mr-1 h-4 w-4" />
              Zpět
            </Button>
            <h1 className="truncate text-base font-semibold md:text-lg">{project.name}</h1>
            <Select value={project.status} onValueChange={(v) => handleStatusChange(v as ProjectStatus)}>
              <SelectTrigger className="h-7 w-28 text-xs md:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktivní</SelectItem>
                <SelectItem value="completed">Dokončený</SelectItem>
                <SelectItem value="archived">Archivovaný</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex shrink-0 items-center gap-1 md:gap-2">
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => setIsPhaseManagerOpen(true)}
            >
              <LayersIcon className="mr-1 h-4 w-4" />
              Fáze
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => setIsTagManagerOpen(true)}
            >
              <TagIcon className="mr-1 h-4 w-4" />
              Štítky
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDiaryOpen(!isDiaryOpen)}
            >
              <BookIcon className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">{isDiaryOpen ? "Skrýt deník" : "Zobrazit deník"}</span>
            </Button>
          </div>
        </header>

        {/* Content: Map + Diary */}
        <div className="relative flex flex-1 overflow-hidden">
          <div className="min-w-0 flex-1">
            <MindMap
              projectId={project.id}
              onNodeSelect={handleNodeSelect}
              refreshKey={mapRefreshKey}
              allTags={allTags}
              phases={projectPhases}
            />
          </div>

          {/* Diary panel: overlay on mobile, side panel on desktop */}
          {isDiaryOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/50 md:hidden"
                onClick={() => setIsDiaryOpen(false)}
              />
              <div className="fixed inset-y-0 right-0 z-50 w-[85vw] max-w-96 md:static md:z-auto md:w-96 md:max-w-none h-full overflow-hidden">
                <DiaryPanel
                  projectId={project.id}
                  selectedNodeId={selectedNodeId}
                  onNodeClick={handleNodeClickFromDiary}
                  onNodeDataChanged={handleNodeDataChanged}
                  allTags={allTags}
                  onTagsChanged={handleTagsChanged}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <TagManager
        projectId={project.id}
        isOpen={isTagManagerOpen}
        onClose={() => setIsTagManagerOpen(false)}
        onTagsChanged={handleTagsChanged}
      />

      <PhaseManager
        projectId={project.id}
        isOpen={isPhaseManagerOpen}
        onClose={() => setIsPhaseManagerOpen(false)}
        onPhasesChanged={handlePhasesChanged}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
    </svg>
  );
}

function TagIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

function LayersIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22.54 12.43-1.96-.89-8.58 3.91a2 2 0 0 1-1.66 0L2.6 11.64l-1.97.89a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
    </svg>
  );
}
