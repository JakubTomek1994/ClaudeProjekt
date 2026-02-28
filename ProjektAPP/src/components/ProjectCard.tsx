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

const STATUS_LABELS: Record<string, string> = {
  active: "Aktivni",
  archived: "Archivovany",
  completed: "Dokonceny",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  archived: "secondary",
  completed: "outline",
};

interface ProjectCardProps {
  project: Project;
  onDelete: (id: string) => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
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
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {new Date(project.created_at).toLocaleDateString("cs-CZ")}
          </span>
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
                  Tato akce je nevratna. Projekt &quot;{project.name}&quot; a vsechna jeho data budou trvale smazana.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Zrusit</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Smazat
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
