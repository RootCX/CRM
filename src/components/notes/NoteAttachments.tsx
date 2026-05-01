import { useRef, useState } from "react";
import { useAppCollection } from "@rootcx/sdk";
import { Button, ConfirmDialog, toast } from "@rootcx/ui";
import { IconPaperclip, IconDownload, IconTrash, IconUpload } from "@tabler/icons-react";
import { useFileUpload } from "@/hooks/useFileUpload";
import { APP_ID } from "@/lib/constants";
import type { Attachment } from "@/lib/types";

interface Props {
  noteId: string;
}

function formatSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function NoteAttachments({ noteId }: Props) {
  const { data: attachments, create, remove } = useAppCollection<Attachment>(APP_ID, "attachments", {
    where: { note_id: { $eq: noteId } },
  });
  const { uploadMany, uploading, download, deleteFile } = useFileUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const results = await uploadMany(Array.from(files));
      for (const result of results) {
        await create({
          file_id: result.file_id,
          filename: result.name,
          content_type: result.content_type,
          size: result.size,
          note_id: noteId,
        });
      }
      toast.success(`${results.length} file${results.length > 1 ? "s" : ""} uploaded`);
    } catch {
      toast.error("Failed to upload files");
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDelete = async (attachment: Attachment) => {
    try {
      await deleteFile(attachment.file_id);
      await remove(attachment.id);
      toast.success("File deleted");
    } catch {
      toast.error("Failed to delete file");
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      await download(attachment.file_id, attachment.filename);
    } catch {
      toast.error("Failed to download file");
    }
  };

  return (
    <div className="border-t px-6 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <IconPaperclip className="h-3.5 w-3.5" />
          Attachments{attachments.length > 0 && ` (${attachments.length})`}
        </span>
        <Button
          size="sm"
          variant="ghost"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <IconUpload className="h-3.5 w-3.5 mr-1" />
          {uploading ? "Uploading…" : "Upload"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>
      {attachments.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {attachments.map(att => (
            <div key={att.id} className="group flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm">
              <span className="truncate flex-1">{att.filename}</span>
              <span className="text-xs text-muted-foreground shrink-0">{formatSize(att.size)}</span>
              <button
                onClick={() => handleDownload(att)}
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <IconDownload className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setDeleteTarget(att)}
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <IconTrash className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => !o && setDeleteTarget(null)}
        title="Delete attachment"
        description={`Delete "${deleteTarget?.filename}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => { if (deleteTarget) { await handleDelete(deleteTarget); setDeleteTarget(null); } }}
      />
    </div>
  );
}
