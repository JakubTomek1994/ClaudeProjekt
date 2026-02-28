"use client";

import type { Attachment } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/client";

interface AttachmentPreviewProps {
  attachment: Attachment;
}

export function AttachmentPreview({ attachment }: AttachmentPreviewProps) {
  const supabase = createClient();
  const isImage = attachment.file_type.startsWith("image/");

  const getUrl = () => {
    const { data } = supabase.storage
      .from("attachments")
      .getPublicUrl(attachment.file_path);
    return data.publicUrl;
  };

  const handleDownload = async () => {
    const { data, error } = await supabase.storage
      .from("attachments")
      .download(attachment.file_path);

    if (error || !data) return;

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = attachment.file_name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isImage) {
    return (
      <button
        onClick={handleDownload}
        className="group relative overflow-hidden rounded-md border"
      >
        <img
          src={getUrl()}
          alt={attachment.file_name}
          className="h-24 w-32 object-cover transition-transform group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 bg-black/50 px-1 py-0.5">
          <p className="truncate text-xs text-white">{attachment.file_name}</p>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted"
    >
      <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 text-left">
        <p className="truncate text-sm">{attachment.file_name}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(attachment.file_size)}
        </p>
      </div>
    </button>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </svg>
  );
}
