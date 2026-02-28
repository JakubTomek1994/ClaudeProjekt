"use client";

import { useState } from "react";
import {
  FileText,
  FileArchive,
  FileImage,
  File,
  Eye,
  Loader2,
  Download,
  Trash2,
} from "lucide-react";
import type { Attachment } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface AttachmentPreviewProps {
  attachment: Attachment;
  onDeleted?: () => void;
}

const ARCHIVE_EXTENSIONS = [".zip", ".rar", ".7z", ".tar", ".gz", ".bz2"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico"];
const TEXT_EXTENSIONS = [".txt", ".md", ".csv", ".json", ".xml", ".html", ".css", ".js", ".ts", ".log"];
const OFFICE_EXTENSIONS = [".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".odt", ".ods", ".odp"];

function isArchiveFile(fileName: string): boolean {
  return ARCHIVE_EXTENSIONS.some((ext) => fileName.toLowerCase().endsWith(ext));
}

function isImageFile(fileName: string): boolean {
  return IMAGE_EXTENSIONS.some((ext) => fileName.toLowerCase().endsWith(ext));
}

function isTextFile(fileName: string): boolean {
  return TEXT_EXTENSIONS.some((ext) => fileName.toLowerCase().endsWith(ext));
}

function isOfficeFile(fileName: string): boolean {
  return OFFICE_EXTENSIONS.some((ext) => fileName.toLowerCase().endsWith(ext));
}

function getFileExtension(fileName: string): string {
  const ext = fileName.split(".").pop();
  return ext ? ext.toUpperCase() : "";
}

function getFileIconColor(fileName: string): string {
  if (isArchiveFile(fileName)) return "text-amber-500";
  if (isImageFile(fileName)) return "text-violet-500";
  const ext = fileName.toLowerCase();
  if (ext.endsWith(".pdf")) return "text-red-500";
  if (ext.endsWith(".doc") || ext.endsWith(".docx") || ext.endsWith(".odt"))
    return "text-blue-500";
  if (ext.endsWith(".xls") || ext.endsWith(".xlsx")) return "text-green-500";
  if (ext.endsWith(".ppt") || ext.endsWith(".pptx")) return "text-orange-500";
  return "text-muted-foreground";
}

function getFileIcon(fileName: string) {
  if (isArchiveFile(fileName)) return FileArchive;
  if (isImageFile(fileName)) return FileImage;
  if (fileName.toLowerCase().endsWith(".pdf")) return FileText;
  return File;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function AttachmentPreview({ attachment, onDeleted }: AttachmentPreviewProps) {
  const supabase = createClient();
  const [isOpening, setIsOpening] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);

  const IconComponent = getFileIcon(attachment.file_name);
  const iconColor = getFileIconColor(attachment.file_name);
  const ext = getFileExtension(attachment.file_name);
  const isImage = attachment.file_type.startsWith("image/");
  const isText = isTextFile(attachment.file_name);

  const handleOpen = async () => {
    setIsOpening(true);

    if (isText) {
      const { data, error } = await supabase.storage
        .from("attachments")
        .download(attachment.file_path);

      setIsOpening(false);
      if (error || !data) return;

      const text = await data.text();
      setTextContent(text);
      setIsModalOpen(true);
    } else {
      const { data, error } = await supabase.storage
        .from("attachments")
        .createSignedUrl(attachment.file_path, 3600);

      setIsOpening(false);
      if (error || !data?.signedUrl) return;

      setSignedUrl(data.signedUrl);
      setIsModalOpen(true);
    }
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

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Smazat soubor "${attachment.file_name}"?`)) return;

    setIsDeleting(true);

    const { error: storageError } = await supabase.storage
      .from("attachments")
      .remove([attachment.file_path]);

    if (storageError) {
      toast.error("Nepodařilo se smazat soubor z úložiště");
      setIsDeleting(false);
      return;
    }

    const { error: dbError } = await supabase
      .from("attachments")
      .delete()
      .eq("id", attachment.id);

    if (dbError) {
      toast.error("Nepodařilo se smazat záznam přílohy");
      setIsDeleting(false);
      return;
    }

    toast.success("Soubor smazán");
    onDeleted?.();
  };

  const renderModalContent = () => {
    if (isText && textContent !== null) {
      return (
        <pre className="max-h-[calc(90vh-100px)] w-full overflow-auto whitespace-pre-wrap rounded bg-zinc-950 p-4 font-mono text-sm leading-relaxed text-zinc-200">
          {textContent}
        </pre>
      );
    }

    if (!signedUrl) return null;

    if (isImage) {
      return (
        <img
          src={signedUrl}
          alt={attachment.file_name}
          className="max-h-[calc(90vh-100px)] w-auto max-w-full rounded object-contain"
        />
      );
    }

    if (isOfficeFile(attachment.file_name)) {
      return (
        <iframe
          src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`}
          title={attachment.file_name}
          className="h-[calc(90vh-100px)] w-full rounded"
        />
      );
    }

    return (
      <iframe
        src={signedUrl}
        title={attachment.file_name}
        className="h-[calc(90vh-100px)] w-full rounded"
      />
    );
  };

  return (
    <>
      <div className="flex items-center gap-1">
      <button
        onClick={handleOpen}
        disabled={isOpening}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-muted/50 disabled:opacity-70"
      >
        <IconComponent className={`h-4 w-4 shrink-0 ${iconColor}`} />
        <span className="min-w-0 flex-1 truncate text-sm">
          {attachment.file_name}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatFileSize(attachment.file_size)}
        </span>
        {ext && (
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
            {ext}
          </span>
        )}
        {isOpening ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <Eye className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        title="Smazat soubor"
      >
        {isDeleting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </button>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[90vh] sm:max-w-4xl overflow-hidden p-0">
          <DialogHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
            <DialogTitle className="truncate text-sm font-medium">
              {attachment.file_name}
            </DialogTitle>
            <button
              onClick={handleDownload}
              className="mr-8 flex shrink-0 items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
            >
              <Download className="h-3.5 w-3.5" />
              Stáhnout
            </button>
          </DialogHeader>
          <div className="flex max-h-[calc(90vh-60px)] items-center justify-center overflow-auto p-4">
            {renderModalContent()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
