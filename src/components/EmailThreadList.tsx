import { useMemo, useState } from "react";
import { EmailMessage, type EmailRow } from "./EmailMessage";
import { formatRelative } from "@/lib/utils";

interface ThreadGroup {
  threadKey: string;
  subject: string;
  participants: Set<string>;
  lastReceivedAt: string;
  hasUnread: boolean;
  emails: EmailRow[];
}

function groupByThread(emails: EmailRow[]): ThreadGroup[] {
  const map = new Map<string, ThreadGroup>();
  for (const e of emails) {
    const key = e.thread_external_id || e.thread_id || e.id;
    let group = map.get(key);
    if (!group) {
      group = {
        threadKey: key,
        subject: e.subject || "(no subject)",
        participants: new Set<string>(),
        lastReceivedAt: e.received_at,
        hasUnread: false,
        emails: [],
      };
      map.set(key, group);
    }
    group.emails.push(e);
    for (const p of e.participants ?? []) {
      group.participants.add(p.name || p.address);
    }
    if (e.received_at > group.lastReceivedAt) group.lastReceivedAt = e.received_at;
    if ((e as any).has_unread) group.hasUnread = true;
  }
  for (const g of map.values()) {
    g.emails.sort((a, b) => (a.received_at ?? "").localeCompare(b.received_at ?? ""));
    if (g.emails[0]?.subject) g.subject = g.emails[0].subject;
  }
  return [...map.values()].sort((a, b) => (b.lastReceivedAt ?? "").localeCompare(a.lastReceivedAt ?? ""));
}

export interface EmailThreadListProps {
  emails: EmailRow[];
  onReply: (email: EmailRow) => void;
  onReplyAll: (email: EmailRow) => void;
  onForward: (email: EmailRow) => void;
}

export function EmailThreadList({ emails, onReply, onReplyAll, onForward }: EmailThreadListProps) {
  const threads = useMemo(() => groupByThread(emails), [emails]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(threads.length ? [threads[0].threadKey] : []));

  const toggle = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="flex flex-col">
      {threads.map(group => {
        const isOpen = expanded.has(group.threadKey);
        const last = group.emails[group.emails.length - 1];
        const lastFrom = last?.participants.find(p => p.role === "from");
        return (
          <div key={group.threadKey} className="border-b last:border-b-0">
            <button
              onClick={() => toggle(group.threadKey)}
              className="w-full flex items-start gap-3 p-3 text-left transition-colors hover:bg-muted/50"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                {(lastFrom?.name?.[0] ?? lastFrom?.address?.[0] ?? "?").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">
                    {[...group.participants].slice(0, 3).join(", ")}
                    {group.participants.size > 3 && ` +${group.participants.size - 3}`}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {group.hasUnread && <span className="h-2 w-2 rounded-full bg-blue-500" />}
                    {group.emails.length > 1 && (
                      <span className="text-xs text-muted-foreground">{group.emails.length}</span>
                    )}
                    <span className="text-xs text-muted-foreground">{formatRelative(group.lastReceivedAt)}</span>
                  </div>
                </div>
                <p className="text-sm truncate">{group.subject}</p>
                {!isOpen && last && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{last.body?.slice(0, 140)}</p>
                )}
              </div>
            </button>
            {isOpen && (
              <div>
                {group.emails.map(e => (
                  <EmailMessage
                    key={e.id}
                    email={e}
                    onReply={() => onReply(e)}
                    onReplyAll={() => onReplyAll(e)}
                    onForward={() => onForward(e)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

