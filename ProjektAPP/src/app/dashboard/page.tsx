"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ProjectCard } from "@/components/ProjectCard";
import { NewProjectDialog } from "@/components/NewProjectDialog";
import type { Project } from "@/lib/supabase/types";
import { toast } from "sonner";

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
  }, [supabase]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreate = async (name: string, description: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Nejste prihlaseni");
      return;
    }

    const { error } = await supabase
      .from("projects")
      .insert({ name, description: description || null, user_id: user.id });

    if (error) {
      toast.error("Nepodařilo se vytvořit projekt");
      throw error;
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

    toast.success("Projekt smazan");
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projekty</h1>
          <p className="text-sm text-muted-foreground">
            Spravujte sve projekty a sledujte jejich postup.
          </p>
        </div>
        <NewProjectDialog onCreate={handleCreate} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Nacitani...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <p className="mb-2 text-muted-foreground">Zatim nemáte žádné projekty.</p>
          <p className="text-sm text-muted-foreground">Vytvorte svuj prvni projekt tlacitkem vyse.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
