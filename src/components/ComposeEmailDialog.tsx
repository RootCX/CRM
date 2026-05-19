import { useRef, useState } from "react";
import { Button, Input, Label, toast } from "@rootcx/ui";
import { IconPaperclip, IconX, IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { useRuntimeClient } from "@rootcx/sdk";
import { APP_ID } from "@/lib/constants";
import { useFileUpload } from "@/hooks/useFileUpload";
import { escapeHtml, formatBytes } from "@/lib/utils";
import { HtmlEditor, type HtmlEditorHandle } from "@/components/editor/HtmlEditor";

interface PendingAttachment {
  file_id: string;
  filename: string;
  size: number;
  content_type?: string;
}

const PER_FILE_MAX = 25 * 1024 * 1024;
const TOTAL_MAX = 30 * 1024 * 1024;

export interface ComposeMode {
  kind: "new" | "reply" | "reply_all" | "forward";
  email?: any;
  defaultTo?: string;
  defaultCc?: string;
  defaultSubject?: string;
  defaultBodyHtml?: string;
}

export interface ComposeEmailDialogProps {
  mode: ComposeMode;
  provider: string;
  aliases: string[];
  primaryHandle: string;
  onSent: () => void;
  onCancel: () => void;
}

function normalizeSubject(prefix: "Re:" | "Fwd:", subject: string): string {
  const stripped = subject.replace(/^(Re:|Fwd:|RE:|FWD:)\s*/i, "").trim();
  return `${prefix} ${stripped}`;
}

function buildPrefill(mode: ComposeMode, currentHandle: string): { to: string; cc: string; subject: string; bodyHtml: string; replyId?: string; isForward: boolean } {
  if (mode.kind === "new") {
    return { to: mode.defaultTo ?? "", cc: mode.defaultCc ?? "", subject: mode.defaultSubject ?? "", bodyHtml: mode.defaultBodyHtml ?? "", isForward: false };
  }
  const email = mode.email;
  const from = email?.participants?.find((p: any) => p.role === "from");
  const to = email?.participants?.filter((p: any) => p.role === "to") ?? [];
  const cc = email?.participants?.filter((p: any) => p.role === "cc") ?? [];

  if (mode.kind === "forward") {
    const original = email?.body_html || `<pre>${escapeHtml(email?.body ?? "")}</pre>`;
    const header = `<br/><br/>--- Forwarded message ---<br/>From: ${escapeHtml(from?.name || from?.address || "")} &lt;${escapeHtml(from?.address ?? "")}&gt;<br/>Date: ${escapeHtml(email?.received_at ?? "")}<br/>Subject: ${escapeHtml(email?.subject ?? "")}<br/><br/>`;
    return {
      to: "", cc: "",
      subject: normalizeSubject("Fwd:", email?.subject ?? ""),
      bodyHtml: header + original,
      replyId: email?.id,
      isForward: true,
    };
  }

  // reply / reply_all
  const original = email?.body_html || `<pre>${escapeHtml(email?.body ?? "")}</pre>`;
  const quoteHeader = `<br/><br/>On ${escapeHtml(email?.received_at ?? "")}, ${escapeHtml(from?.name || from?.address || "")} wrote:<br/>`;
  const quote = `<blockquote>${original}</blockquote>`;

  const replyTo = from?.address ?? "";
  const replyAllCc = mode.kind === "reply_all"
    ? [...to, ...cc]
      .map((p: any) => p.address)
      .filter((a: string) => a && a.toLowerCase() !== currentHandle.toLowerCase() && a.toLowerCase() !== replyTo.toLowerCase())
      .join(", ")
    : "";

  return {
    to: replyTo,
    cc: replyAllCc,
    subject: normalizeSubject("Re:", email?.subject ?? ""),
    bodyHtml: "<br/>" + quoteHeader + quote,
    replyId: email?.id,
    isForward: false,
  };
}


export function ComposeEmailDialog({ mode, provider, aliases, primaryHandle, onSent, onCancel }: ComposeEmailDialogProps) {
  const client = useRuntimeClient();
  const fileUpload = useFileUpload();
  const prefill = buildPrefill(mode, primaryHandle);

  const [to, setTo] = useState(prefill.to);
  const [cc, setCc] = useState(prefill.cc);
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState(prefill.subject);
  const [from, setFrom] = useState(primaryHandle);
  const [showCcBcc, setShowCcBcc] = useState(!!cc || !!bcc);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [sending, setSending] = useState(false);
  const editorRef = useRef<HtmlEditorHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalSize = attachments.reduce((n, a) => n + a.size, 0);

  const handleFileChoose = async (files: FileList | null) => {
    if (!files) return;
    const accepted: File[] = [];
    let runningTotal = totalSize;
    for (const f of files) {
      if (f.size > PER_FILE_MAX) {
        toast.error(`${f.name} exceeds 25MB`);
        continue;
      }
      if (runningTotal + f.size > TOTAL_MAX) {
        toast.error("total attachments exceed 30MB");
        break;
      }
      accepted.push(f);
      runningTotal += f.size;
    }
    if (accepted.length === 0) return;
    try {
      const uploaded = await fileUpload.uploadMany(accepted);
      const mapped: PendingAttachment[] = uploaded.map(u => ({
        file_id: u.file_id, filename: u.name, size: u.size, content_type: u.content_type,
      }));
      setAttachments(prev => [...prev, ...mapped]);
    } catch (e: any) {
      toast.error(e?.message ?? "upload failed");
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.file_id !== id));
    fileUpload.deleteFile(id).catch(() => {});
  };

  const handleSend = async (asDraft = false) => {
    if (!to.trim()) { toast.error("Recipient required"); return; }
    setSending(true);
    try {
      const html = editorRef.current?.getHTML() ?? "";
      const text = editorRef.current?.getText() ?? "";
      const result = await client.rpc(APP_ID, asDraft ? "create_draft" : "send_email", {
        provider,
        to: to.trim(),
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
        subject: subject.trim(),
        body_text: text,
        body_html: html,
        attachments_file_ids: attachments.map(a => a.file_id),
        reply_to_message_id: prefill.isForward ? undefined : prefill.replyId,
        from,
      });
      toast.success(asDraft ? "Saved as draft" : "Sent");
      onSent();
      return result;
    } catch (e: any) {
      const code = e?.code ?? "";
      const msg = code === "INSUFFICIENT_PERMISSIONS" ? "Reconnect Gmail to send"
        : code === "TEMPORARY_ERROR" ? "Gmail is rate-limiting. Try again shortly."
        : code === "MISCONFIGURED" ? (e?.message ?? "Bad request")
        : (e?.message ?? "send failed");
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h3 className="text-sm font-medium">
          {mode.kind === "reply" ? "Reply" : mode.kind === "reply_all" ? "Reply all" : mode.kind === "forward" ? "Forward" : "New message"}
        </h3>
        <Button variant="ghost" size="sm" onClick={onCancel}>Close</Button>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="px-3 py-2 space-y-2 border-b">
          {aliases.length > 1 && (
            <div className="flex items-center gap-2 text-sm">
              <Label className="text-xs text-muted-foreground w-12">From:</Label>
              <select value={from} onChange={(e) => setFrom(e.target.value)}
                className="flex-1 text-sm bg-transparent border rounded px-2 py-1">
                {aliases.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground w-12">To:</Label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="recipient@example.com" className="flex-1 h-8" />
            <button onClick={() => setShowCcBcc(s => !s)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5">
              Cc/Bcc {showCcBcc ? <IconChevronUp className="h-3 w-3" /> : <IconChevronDown className="h-3 w-3" />}
            </button>
          </div>
          {showCcBcc && (
            <>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground w-12">Cc:</Label>
                <Input value={cc} onChange={(e) => setCc(e.target.value)} className="flex-1 h-8" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground w-12">Bcc:</Label>
                <Input value={bcc} onChange={(e) => setBcc(e.target.value)} className="flex-1 h-8" />
              </div>
            </>
          )}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground w-12">Subject:</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="flex-1 h-8" />
          </div>
        </div>

        <HtmlEditor
          ref={editorRef}
          defaultHtml={prefill.bodyHtml}
          placeholder="Write your message..."
          autoFocus={mode.kind === "new"}
        />

        {attachments.length > 0 && (
          <div className="border-t px-3 py-2 flex flex-wrap gap-2">
            {attachments.map(a => (
              <div key={a.file_id} className="inline-flex items-center gap-1 rounded border bg-muted/30 px-2 py-1 text-xs">
                <span className="truncate max-w-[160px]">{a.filename}</span>
                <button onClick={() => removeAttachment(a.file_id)} className="hover:text-destructive">
                  <IconX className="h-3 w-3" />
                </button>
              </div>
            ))}
            <span className="text-xs text-muted-foreground self-center">
              {formatBytes(totalSize)} / 30 MB
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t px-3 py-2">
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" multiple className="hidden"
            onChange={(e) => handleFileChoose(e.target.files)} />
          <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={fileUpload.uploading}>
            <IconPaperclip className="h-4 w-4 mr-1" />
            {fileUpload.uploading ? "Uploading..." : "Attach"}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleSend(true)} disabled={sending}>
            Save draft
          </Button>
          <Button size="sm" onClick={() => handleSend(false)} disabled={sending || !to.trim()}>
            {sending ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}

