"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Project } from "@/lib/supabase/types";
import type { ProjectStats } from "@/app/dashboard/page";

const STATUS_LABELS: Record<string, string> = {
  active: "Aktivní",
  archived: "Archivovaný",
  completed: "Dokončený",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  archived: "secondary",
  completed: "outline",
};

interface ProjectCardProps {
  project: Project;
  onDelete: (id: string) => void;
  onArchive?: (id: string) => void;
  stats?: ProjectStats;
}

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "právě teď";
  if (diffMins < 60) return `před ${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `před ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `před ${diffDays} d`;
  return date.toLocaleDateString("cs-CZ");
}

export function ProjectCard({ project, onDelete, onArchive, stats }: ProjectCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    onDelete(project.id);
  };

  return (
    <Card className="group relative transition-shadow hover:shadow-md">
      <Link href={`/project/${project.id}`} className="absolute inset-0 z-0" />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{project.name}</CardTitle>
          <Badge variant={STATUS_VARIANTS[project.status]}>
            {STATUS_LABELS[project.status]}
          </Badge>
        </div>
        {project.description && (
          <CardDescription className="line-clamp-2">
            {project.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {stats && (stats.open + stats.inProgress + stats.done) > 0 && (
          <div className="mb-3 space-y-1.5">
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100">
              {stats.done > 0 && (
                <div
                  className="bg-green-500 transition-all"
                  style={{ width: `${(stats.done / (stats.open + stats.inProgress + stats.done)) * 100}%` }}
                />
              )}
              {stats.inProgress > 0 && (
                <div
                  className="bg-orange-400 transition-all"
                  style={{ width: `${(stats.inProgress / (stats.open + stats.inProgress + stats.done)) * 100}%` }}
                />
              )}
              {stats.open > 0 && (
                <div
                  className="bg-gray-300 transition-all"
                  style={{ width: `${(stats.open / (stats.open + stats.inProgress + stats.done)) * 100}%` }}
                />
              )}
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-green-500" />{stats.done} hotových</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-orange-400" />{stats.inProgress} rozpracovaných</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-gray-300" />{stats.open} otevřených</span>
            </div>
            {stats.overdue > 0 && (
              <p className="text-xs font-medium text-red-600">{stats.overdue} po termínu</p>
            )}
            {stats.lastActivity && (
              <p className="text-[10px] text-muted-foreground">
                Poslední aktivita: {getRelativeTime(stats.lastActivity)}
              </p>
            )}
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {new Date(project.created_at).toLocaleDateString("cs-CZ")}
          </span>
          <div className="flex items-center gap-1">
            {onArchive && (
              <Button
                variant="ghost"
                size="sm"
                className="relative z-10 h-8 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => onArchive(project.id)}
              >
                {project.status === "archived" ? "Obnovit" : "Archivovat"}
              </Button>
            )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="relative z-10 h-8 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                disabled={isDeleting}
              >
                Smazat
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Smazat projekt?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tato akce je nevratná. Projekt &quot;{project.name}&quot; a všechna jeho data budou trvale smazána.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Zrušit</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Smazat
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
