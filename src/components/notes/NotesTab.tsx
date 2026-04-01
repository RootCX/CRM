import { useState, useCallback, useRef, useEffect } from "react";
import { useAppCollection } from "@rootcx/sdk";
import { ScrollArea, Button, EmptyState, ConfirmDialog, toast } from "@rootcx/ui";
import { IconNotes, IconPin, IconPinnedOff, IconTrash, IconArrowLeft, IconPlus } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import type { Note } from "@/lib/types";

const APP_ID = "crm";

type FilterKey = "contact_id" | "company_id" | "deal_id";

interface Props {
  filterKey: FilterKey;
  filterId: string;
}

// strip HTML for card preview
const preview = (html: string, max = 120) => {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > max ? text.slice(0, max) + "…" : text;
};

const relativeTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

// --- NoteEditor ---

interface EditorProps {
  note: Note;
  onSave: (id: string, fields: { title: string; body: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onBack: () => void;
}

function NoteEditor({ note, onSave, onDelete, onBack }: EditorProps) {
  const [title, setTitle] = useState(note.title ?? "");
  const [body, setBody] = useState(note.body ?? "");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const dirty = title !== (note.title ?? "") || body !== (note.body ?? "");

  // debounce auto-save — 1.5s after last keystroke
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const save = useCallback(async (t: string, b: string) => {
    await onSave(note.id, { title: t, body: b });
  }, [note.id, onSave]);

  useEffect(() => {
    if (!dirty) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(title, body), 1500);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [title, body, dirty, save]);

  return (
    <div className="flex flex-col h-full">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <IconArrowLeft className="h-4 w-4" /> Notes
        </button>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-xs text-muted-foreground">saving…</span>}
          {!dirty && <span className="text-xs text-muted-foreground">Saved · {relativeTime(note.updated_at)}</span>}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
            <IconTrash className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* content */}
      <ScrollArea className="flex-1 px-6 py-4">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Note title…"
          className="w-full text-2xl font-bold bg-transparent border-none outline-none mb-4 placeholder:text-muted-foreground/50"
        />
        <RichTextEditor content={body} onChange={setBody} />
      </ScrollArea>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete note"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => { await onDelete(note.id); setDeleteOpen(false); onBack(); }}
      />
    </div>
  );
}

// --- NoteCard ---

interface CardProps {
  note: Note;
  onClick: () => void;
  onPin: () => void;
  onDelete: () => void;
}

function NoteCard({ note, onClick, onPin, onDelete }: CardProps) {
  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer rounded-lg border p-3 hover:bg-muted/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className={cn("text-sm font-medium leading-tight truncate", !note.title && "text-muted-foreground italic")}>
          {note.title || "Untitled"}
        </p>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onPin(); }}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            {note.pinned ? <IconPinnedOff className="h-3.5 w-3.5" /> : <IconPin className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-destructive transition-colors"
          >
            <IconTrash className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {note.body && (
        <p className="text-xs text-muted-foreground line-clamp-2">{preview(note.body)}</p>
      )}
      <p className="mt-1.5 text-xs text-muted-foreground/60">{relativeTime(note.created_at)}</p>
    </div>
  );
}

// --- NotesTab ---

export function NotesTab({ filterKey, filterId }: Props) {
  const { data: allNotes, loading, create, update, remove } = useAppCollection<Note>(APP_ID, "notes");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const notes = allNotes
    .filter(n => n[filterKey] === filterId)
    .sort((a, b) => {
      // pinned first, then by updated_at desc
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  const activeNote = notes.find(n => n.id === activeId) ?? null;

  const handleCreate = async () => {
    try {
      const note = await create({ [filterKey]: filterId, title: "", body: "", pinned: false });
      setActiveId(note.id);
    } catch { toast.error("Failed to create note"); }
  };

  const handleSave = useCallback(async (id: string, fields: { title: string; body: string }) => {
    try { await update(id, fields); }
    catch { toast.error("Failed to save note"); }
  }, [update]);

  const handleDelete = useCallback(async (id: string) => {
    try { await remove(id); toast.success("Note deleted"); }
    catch { toast.error("Failed to delete note"); }
  }, [remove]);

  const handlePin = useCallback(async (note: Note) => {
    try { await update(note.id, { pinned: !note.pinned }); }
    catch { toast.error("Failed to update note"); }
  }, [update]);

  if (activeNote) {
    return (
      <NoteEditor
        note={activeNote}
        onSave={handleSave}
        onDelete={handleDelete}
        onBack={() => setActiveId(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
        <span className="text-sm font-medium">Notes {notes.length > 0 && <span className="text-muted-foreground">({notes.length})</span>}</span>
        <Button size="sm" variant="outline" onClick={handleCreate}>
          <IconPlus className="h-3.5 w-3.5 mr-1" /> New Note
        </Button>
      </div>

      {loading && <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>}

      {!loading && notes.length === 0 && (
        <EmptyState
          icon={<IconNotes className="h-8 w-8" />}
          title="No notes yet"
          description="Capture meeting notes, follow-ups, or anything relevant."
          action={<Button onClick={handleCreate}><IconPlus className="h-4 w-4 mr-1.5" /> New Note</Button>}
        />
      )}

      {!loading && notes.length > 0 && (
        <ScrollArea className="flex-1 px-3 py-3">
          <div className="flex flex-col gap-2">
            {notes.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                onClick={() => setActiveId(note.id)}
                onPin={() => handlePin(note)}
                onDelete={() => setDeleteTarget(note.id)}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => !o && setDeleteTarget(null)}
        title="Delete note"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => { if (deleteTarget) { await handleDelete(deleteTarget); setDeleteTarget(null); } }}
      />
    </div>
  );
}
