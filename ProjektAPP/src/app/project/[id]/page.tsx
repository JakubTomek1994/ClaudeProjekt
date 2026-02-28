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
import { CommandPalette } from "@/components/CommandPalette";
import type { Project, ProjectStatus, Tag } from "@/lib/supabase/types";
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
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
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

  useEffect(() => {
    if (!isLoading) loadTags();
  }, [isLoading, loadTags]);

  const handleTagsChanged = useCallback(() => {
    loadTags();
    setMapRefreshKey((k) => k + 1);
  }, [loadTags]);

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
        <Sidebar />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Načítání...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Project header */}
        <header className="flex items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
              <ArrowLeftIcon className="mr-1 h-4 w-4" />
              Zpět
            </Button>
            <h1 className="text-lg font-semibold">{project.name}</h1>
            <Select value={project.status} onValueChange={(v) => handleStatusChange(v as ProjectStatus)}>
              <SelectTrigger className="h-7 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktivní</SelectItem>
                <SelectItem value="completed">Dokončený</SelectItem>
                <SelectItem value="archived">Archivovaný</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
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
              <BookIcon className="mr-1 h-4 w-4" />
              {isDiaryOpen ? "Skrýt deník" : "Zobrazit deník"}
            </Button>
          </div>
        </header>

        {/* Content: Map + Diary */}
        <div className="flex flex-1 overflow-hidden">
          <div className="min-w-0 flex-1">
            <MindMap
              projectId={project.id}
              onNodeSelect={handleNodeSelect}
              refreshKey={mapRefreshKey}
              allTags={allTags}
            />
          </div>

          {isDiaryOpen && (
            <div className="w-96 h-full overflow-hidden">
              <DiaryPanel
                projectId={project.id}
                selectedNodeId={selectedNodeId}
                onNodeClick={handleNodeClickFromDiary}
                onNodeDataChanged={handleNodeDataChanged}
                allTags={allTags}
                onTagsChanged={handleTagsChanged}
              />
            </div>
          )}
        </div>
      </div>

      <TagManager
        projectId={project.id}
        isOpen={isTagManagerOpen}
        onClose={() => setIsTagManagerOpen(false)}
        onTagsChanged={handleTagsChanged}
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
