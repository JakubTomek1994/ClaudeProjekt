"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ProjectCard } from "@/components/ProjectCard";
import { NewProjectDialog } from "@/components/NewProjectDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PHASES, PHASE_COLUMN_WIDTH, PHASE_MAP } from "@/lib/constants";
import type { TemplateNode } from "@/lib/templates";
import type { Project, ProjectStatus } from "@/lib/supabase/types";
import { toast } from "sonner";

export interface ProjectStats {
  open: number;
  inProgress: number;
  done: number;
  overdue: number;
  lastActivity: string | null;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statsMap, setStatsMap] = useState<Record<string, ProjectStats>>({});
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("active");
  const supabase = createClient();

  const fetchProjects = useCallback(async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Nepodařilo se načíst projekty");
      return;
    }
    setProjects(data ?? []);
    setIsLoading(false);

    // Batch-fetch stats
    if (data && data.length > 0) {
      const projectIds = data.map((p: Project) => p.id);

      const [nodesResult, diaryResult] = await Promise.all([
        supabase
          .from("map_nodes")
          .select("project_id, status, deadline")
          .in("project_id", projectIds),
        supabase
          .from("diary_entries")
          .select("project_id, created_at")
          .in("project_id", projectIds)
          .order("created_at", { ascending: false }),
      ]);

      const stats: Record<string, ProjectStats> = {};
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const pid of projectIds) {
        stats[pid] = { open: 0, inProgress: 0, done: 0, overdue: 0, lastActivity: null };
      }

      if (nodesResult.data) {
        for (const node of nodesResult.data) {
          const s = stats[node.project_id];
          if (!s) continue;
          if (node.status === "open") s.open++;
          else if (node.status === "in_progress") s.inProgress++;
          else if (node.status === "done") s.done++;

          if (node.deadline) {
            const dl = new Date(node.deadline + "T00:00:00");
            if (dl <= today && node.status !== "done") s.overdue++;
          }
        }
      }

      if (diaryResult.data) {
        for (const entry of diaryResult.data) {
          const s = stats[entry.project_id];
          if (s && !s.lastActivity) {
            s.lastActivity = entry.created_at;
          }
        }
      }

      setStatsMap(stats);
    }
  }, [supabase]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreate = async (name: string, description: string, templateNodes?: TemplateNode[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Nejste přihlášeni");
      return;
    }

    const { data: projectData, error } = await supabase
      .from("projects")
      .insert({ name, description: description || null, user_id: user.id })
      .select()
      .single();

    if (error || !projectData) {
      toast.error("Nepodařilo se vytvořit projekt");
      throw error;
    }

    if (templateNodes && templateNodes.length > 0) {
      const phaseCounters: Record<string, number> = {};
      const nodeInserts = templateNodes.map((node) => {
        const phaseIndex = PHASES.findIndex((p) => p.id === node.phase);
        phaseCounters[node.phase] = (phaseCounters[node.phase] || 0);
        const y = phaseCounters[node.phase] * 120 + 50;
        phaseCounters[node.phase]++;

        return {
          project_id: projectData.id,
          label: node.label,
          description: node.description,
          phase: node.phase,
          position_x: phaseIndex * (PHASE_COLUMN_WIDTH + 70) + 20,
          position_y: y,
        };
      });

      await supabase.from("map_nodes").insert(nodeInserts);
    }

    toast.success("Projekt vytvořen");
    fetchProjects();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("projects").delete().eq("id", id);

    if (error) {
      toast.error("Nepodařilo se smazat projekt");
      return;
    }

    toast.success("Projekt smazán");
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const handleArchive = async (id: string) => {
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    const newStatus: ProjectStatus = project.status === "archived" ? "active" : "archived";

    const { error } = await supabase
      .from("projects")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast.error("Nepodařilo se změnit stav");
      return;
    }

    toast.success(newStatus === "archived" ? "Projekt archivován" : "Projekt obnoven");
    setProjects((prev) => prev.map((p) => p.id === id ? { ...p, status: newStatus } : p));
  };

  const filteredProjects = statusFilter === "all"
    ? projects
    : projects.filter((p) => p.status === statusFilter);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projekty</h1>
          <p className="text-sm text-muted-foreground">
            Spravujte své projekty a sledujte jejich postup.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ProjectStatus | "all")}>
            <SelectTrigger className="h-9 w-40 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechny</SelectItem>
              <SelectItem value="active">Aktivní</SelectItem>
              <SelectItem value="completed">Dokončené</SelectItem>
              <SelectItem value="archived">Archivované</SelectItem>
            </SelectContent>
          </Select>
          <NewProjectDialog onCreate={handleCreate} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Načítání...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <p className="mb-2 text-muted-foreground">
            {projects.length === 0 ? "Zatím nemáte žádné projekty." : "Žádné projekty neodpovídají filtru."}
          </p>
          {projects.length === 0 && (
            <p className="text-sm text-muted-foreground">Vytvořte svůj první projekt tlačítkem výše.</p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDelete={handleDelete}
              onArchive={handleArchive}
              stats={statsMap[project.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
