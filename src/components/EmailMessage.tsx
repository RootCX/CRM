import { useEffect, useRef, useState, useMemo } from "react";
import DOMPurify, { type Config as DOMPurifyConfig } from "dompurify";
import { Button } from "@rootcx/ui";
import { IconDownload, IconExternalLink, IconArrowBackUp, IconArrowForwardUp, IconPhoto } from "@tabler/icons-react";
import { useRuntimeClient } from "@rootcx/sdk";
import { formatBytes } from "@/lib/utils";
import type { EmailParticipant } from "@/lib/types";

export interface EmailAttachment {
  id: string;
  email_id: string;
  external_id: string;
  filename: string;
  mime_type: string;
  size: number;
  is_inline?: boolean;
  content_id?: string | null;
  file_id?: string | null;
}

export type { EmailParticipant } from "@/lib/types";

export interface EmailRow {
  id: string;
  external_id?: string;
  header_message_id?: string;
  thread_id?: string;
  thread_external_id?: string;
  subject?: string;
  body?: string;
  body_text?: string;
  body_html?: string;
  received_at: string;
  participants: EmailParticipant[];
  attachments?: EmailAttachment[];
}

const PURIFY_CONFIG: DOMPurifyConfig = {
  FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "button", "link", "meta", "style"],
  FORBID_ATTR: ["onload", "onclick", "onerror", "onmouseover", "onfocus", "onblur"],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ["target", "rel"],
};

function blockExternalImages(html: string): string {
  return html
    .replace(/<img\b([^>]*?)\bsrc=(["'])(https?:\/\/[^"']+)\2/gi, '<img$1data-blocked-src="$3" src=""')
    .replace(/<img\b([^>]*?)\bsrc=(["'])(cid:[^"']+)\2/gi, '<img$1data-cid="$3" src=""');
}

function applyAttachmentBytes(html: string, attachmentBytes: Map<string, string>): string {
  return html.replace(/<img\b([^>]*?)\bdata-cid=(["'])(cid:[^"']+)\2([^>]*)>/gi, (_, pre, _q, cid, post) => {
    const cidKey = cid.replace(/^cid:/, "");
    const data = attachmentBytes.get(cidKey);
    if (!data) return `<img${pre}${post}>`;
    return `<img${pre} src="${data}"${post}>`;
  });
}

function unblockExternalImages(html: string): string {
  return html.replace(/<img\b([^>]*?)\bsrc=""([^>]*?)\bdata-blocked-src=(["'])([^"']+)\3/gi, '<img$1 src="$4"$2');
}

function ensureLinkSafety(html: string): string {
  return html.replace(/<a\b([^>]*?)>/gi, (m, attrs) => {
    const hasTarget = /\btarget=/i.test(attrs);
    const hasRel = /\brel=/i.test(attrs);
    let out = attrs;
    if (!hasTarget) out += ' target="_blank"';
    if (!hasRel) out += ' rel="noopener noreferrer"';
    return `<a${out}>`;
  });
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export interface EmailMessageProps {
  email: EmailRow;
  onReply: () => void;
  onReplyAll: () => void;
  onForward: () => void;
}

export function EmailMessage({ email, onReply, onReplyAll, onForward }: EmailMessageProps) {
  const client = useRuntimeClient();
  const [showImages, setShowImages] = useState(false);
  const [inlineBytes, setInlineBytes] = useState<Map<string, string>>(new Map());
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const from = email.participants.find(p => p.role === "from");
  const to = email.participants.filter(p => p.role === "to");
  const cc = email.participants.filter(p => p.role === "cc");
  const inlineAttachments = (email.attachments ?? []).filter(a => a.is_inline && a.content_id);
  const fileAttachments = (email.attachments ?? []).filter(a => !a.is_inline);

  const hasHtml = !!email.body_html;
  const rawHtml = email.body_html ?? "";
  const bodyText = email.body_text ?? email.body ?? "";

  const renderedHtml = useMemo(() => {
    if (!hasHtml) return "";
    let h = rawHtml;
    if (!showImages) h = blockExternalImages(h);
    if (showImages && inlineBytes.size > 0) h = applyAttachmentBytes(h, inlineBytes);
    if (showImages) h = unblockExternalImages(h);
    h = ensureLinkSafety(h);
    return DOMPurify.sanitize(h, PURIFY_CONFIG) as unknown as string;
  }, [rawHtml, hasHtml, showImages, inlineBytes]);

  const srcdoc = useMemo(() => {
    if (!renderedHtml) return "";
    const isDark = document.documentElement.classList.contains("dark");
    const fg = isDark ? "#e5e7eb" : "#1f2937";
    const border = isDark ? "#374151" : "#e5e7eb";
    const muted = isDark ? "#9ca3af" : "#6b7280";
    return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>body{font-family:system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.5;color:${fg};background:transparent;margin:0;padding:8px;word-wrap:break-word}img{max-width:100%;height:auto}blockquote{margin:0.5em 0;padding-left:1em;border-left:3px solid ${border};color:${muted}}a{color:#3b82f6}</style></head><body>${renderedHtml}</body></html>`;
  }, [renderedHtml]);

  useEffect(() => {
    if (!iframeRef.current) return;
    const iframe = iframeRef.current;
    const handleLoad = () => {
      const body = iframe.contentDocument?.body;
      if (body) iframe.style.height = `${body.scrollHeight}px`;
    };
    iframe.addEventListener("load", handleLoad);
    return () => iframe.removeEventListener("load", handleLoad);
  }, [srcdoc]);

  const handleShowImages = async () => {
    setShowImages(true);
    if (inlineAttachments.length === 0) return;
    const toFetch = inlineAttachments.filter(a => a.content_id && !inlineBytes.has(a.content_id));
    const results = await Promise.allSettled(toFetch.map(async (a) => {
      const raw = await client.callIntegration("gmail", "get_attachment", {
        messageId: email.external_id, attachmentId: a.external_id,
      }) as any;
      const result = raw?.ok ? raw.data : raw;
      return { cid: a.content_id!, data: result?.data, mime: a.mime_type };
    }));
    const fetched = new Map<string, string>(inlineBytes);
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.data) {
        fetched.set(r.value.cid, `data:${r.value.mime};base64,${r.value.data}`);
      }
    }
    setInlineBytes(fetched);
  };

  const downloadAttachment = async (a: EmailAttachment) => {
    try {
      const raw = await client.callIntegration("gmail", "get_attachment", {
        messageId: email.external_id, attachmentId: a.external_id,
      }) as any;
      const result = raw?.ok ? raw.data : raw;
      if (!result?.data) return;
      const b64 = result.data.replace(/-/g, "+").replace(/_/g, "/");
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: a.mime_type || "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = a.filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error("attachment download failed", e); }
  };

  const openInGmail = () => {
    if (!email.thread_external_id) return;
    const url = `https://mail.google.com/mail/u/0/#all/${email.thread_external_id}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const hasContent = (hasHtml && rawHtml) || bodyText;

  return (
    <div className="border-b last:border-b-0 py-3">
      <div className="flex items-start gap-3 px-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
          {(from?.name?.[0] ?? from?.address?.[0] ?? "?").toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-sm font-medium truncate block">
                {from?.name || from?.address || "Unknown"}
              </span>
              <span className="text-xs text-muted-foreground truncate block">
                {from && from.name ? from.address : ""}
              </span>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{formatDate(email.received_at)}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            <span>To: {to.map(p => p.name || p.address).join(", ")}</span>
            {cc.length > 0 && <span> · Cc: {cc.map(p => p.name || p.address).join(", ")}</span>}
          </div>
        </div>
      </div>

      <div className="px-3 mt-3 pl-14">
        {hasContent ? (
          hasHtml ? (
            <iframe
              ref={iframeRef}
              srcDoc={srcdoc}
              sandbox="allow-popups allow-popups-to-escape-sandbox"
              className="w-full border-0 rounded min-h-[60px]"
              title="email body"
            />
          ) : (
            <pre className="text-sm whitespace-pre-wrap break-words leading-relaxed font-sans">{bodyText}</pre>
          )
        ) : (
          <p className="text-sm text-muted-foreground italic">(no content)</p>
        )}


        {hasHtml && !showImages && (
          <Button size="sm" variant="outline" className="mt-2" onClick={handleShowImages}>
            <IconPhoto className="h-3.5 w-3.5 mr-1.5" />
            Show images
          </Button>
        )}

        {fileAttachments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {fileAttachments.map(a => (
              <button
                key={a.id}
                onClick={() => downloadAttachment(a)}
                className="inline-flex items-center gap-2 rounded border bg-muted/30 px-2 py-1 text-xs hover:bg-muted"
              >
                <IconDownload className="h-3.5 w-3.5" />
                <span className="truncate max-w-[200px]">{a.filename}</span>
                <span className="text-muted-foreground">({formatBytes(a.size)})</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onReply}>
            <IconArrowBackUp className="h-3.5 w-3.5 mr-1" /> Reply
          </Button>
          {(to.length + cc.length) > 1 && (
            <Button variant="outline" size="sm" onClick={onReplyAll}>
              <IconArrowBackUp className="h-3.5 w-3.5 mr-1" /> Reply all
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onForward}>
            <IconArrowForwardUp className="h-3.5 w-3.5 mr-1" /> Forward
          </Button>
          {email.thread_external_id && (
            <Button variant="ghost" size="sm" onClick={openInGmail}>
              <IconExternalLink className="h-3.5 w-3.5 mr-1" /> Open in Gmail
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

