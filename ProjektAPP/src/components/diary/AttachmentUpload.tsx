"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

interface AttachmentUploadProps {
  diaryEntryId: string;
  projectId: string;
  onUploaded: () => void;
}

export function AttachmentUpload({ diaryEntryId, projectId, onUploaded }: AttachmentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const supabase = createClient();

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      for (const file of fileArray) {
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`Soubor "${file.name}" je příliš velký (max 20 MB)`);
          continue;
        }

        setIsUploading(true);
        const filePath = `${projectId}/${diaryEntryId}/${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("attachments")
          .upload(filePath, file);

        if (uploadError) {
          toast.error(`Nepodařilo se nahrát "${file.name}"`);
          setIsUploading(false);
          continue;
        }

        const { error: dbError } = await supabase.from("attachments").insert({
          diary_entry_id: diaryEntryId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
        });

        if (dbError) {
          toast.error(`Nepodařilo se uložit záznam pro "${file.name}"`);
        }

        setIsUploading(false);
      }

      onUploaded();
    },
    [diaryEntryId, projectId, supabase, onUploaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        uploadFiles(e.dataTransfer.files);
      }
    },
    [uploadFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        uploadFiles(e.target.files);
        e.target.value = "";
      }
    },
    [uploadFiles]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`flex items-center justify-center rounded-md border-2 border-dashed p-4 text-center transition-colors ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/50"
      }`}
    >
      {isUploading ? (
        <p className="text-sm text-muted-foreground">Nahravam...</p>
      ) : (
        <label className="cursor-pointer text-sm text-muted-foreground">
          <span>Pretahnete soubory sem nebo </span>
          <span className="font-medium text-primary underline">vyberte</span>
          <input
            type="file"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}
