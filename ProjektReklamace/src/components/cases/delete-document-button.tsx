"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteDocument } from "@/lib/actions/documents";

export function DeleteDocumentButton({
  documentId,
  caseId,
}: {
  documentId: string;
  caseId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      title="Smazat dokument"
      onClick={() => {
        if (!confirm("Opravdu smazat tento dokument?")) return;
        startTransition(async () => {
          const fd = new FormData();
          fd.set("documentId", documentId);
          fd.set("caseId", caseId);
          await deleteDocument(fd);
        });
      }}
      className="text-muted-foreground hover:text-destructive"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
