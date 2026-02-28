"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MindMap } from "@/components/mindmap/MindMap";
import { DiaryPanel } from "@/components/diary/DiaryPanel";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/supabase/types";
import { toast } from "sonner";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDiaryOpen, setIsDiaryOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

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

  if (isLoading || !project) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Nacitani...</p>
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
              Zpet
            </Button>
            <h1 className="text-lg font-semibold">{project.name}</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDiaryOpen(!isDiaryOpen)}
          >
            <BookIcon className="mr-1 h-4 w-4" />
            {isDiaryOpen ? "Skryt denik" : "Zobrazit denik"}
          </Button>
        </header>

        {/* Content: Map + Diary */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1">
            <MindMap
              projectId={project.id}
              onNodeSelect={handleNodeSelect}
            />
          </div>

          {isDiaryOpen && (
            <div className="w-96">
              <DiaryPanel
                projectId={project.id}
                selectedNodeId={selectedNodeId}
                onNodeClick={handleNodeClickFromDiary}
              />
            </div>
          )}
        </div>
      </div>
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

function BookIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
    </svg>
  );
}
