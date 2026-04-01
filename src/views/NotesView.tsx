import { useState, useCallback } from "react";
import { useAppCollection } from "@rootcx/sdk";
import {
  PageHeader, ScrollArea, Button, EmptyState, Badge,
  SearchInput, FilterBar, ConfirmDialog, toast,
} from "@rootcx/ui";
import { IconNotes, IconPlus, IconPin, IconPinnedOff, IconTrash, IconArrowLeft } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import type { Note, Contact, Company, Deal } from "@/lib/types";

const APP_ID = "crm";

type Scope = "all" | "contacts" | "companies" | "deals" | "pinned";

const FILTERS: { key: Scope; label: string }[] = [
  { key: "all",       label: "All" },
  { key: "contacts",  label: "Contacts" },
  { key: "companies", label: "Companies" },
  { key: "deals",     label: "Deals" },
  { key: "pinned",    label: "Pinned" },
];

const preview = (html: string, max = 150) => {
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

// --- NoteDetailPanel ---

interface PanelProps {
  note: Note;
  linkedLabel?: string;
  onSave: (id: string, fields: { title: string; body: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onPin: (note: Note) => Promise<void>;
  onBack: () => void;
}

function NoteDetailPanel({ note, linkedLabel, onSave, onDelete, onPin, onBack }: PanelProps) {
  const [title, setTitle] = useState(note.title ?? "");
  const [body, setBody]   = useState(note.body ?? "");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const dirty = title !== (note.title ?? "") || body !== (note.body ?? "");

  // manual save — no auto-save in global view (user might switch notes fast)
  const handleSave = async () => {
    await onSave(note.id, { title, body });
    toast.success("Note saved");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b shrink-0">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <IconArrowLeft className="h-4 w-4" /> All Notes
        </button>
        <div className="flex items-center gap-2">
          {linkedLabel && <Badge variant="secondary">{linkedLabel}</Badge>}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPin(note)}>
            {note.pinned ? <IconPinnedOff className="h-4 w-4" /> : <IconPin className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" disabled={!dirty} onClick={handleSave}>Save</Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
            <IconTrash className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1 px-8 py-6">
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

// --- NotesView ---

export default function NotesView() {
  const { data: notes, loading, create, update, remove } = useAppCollection<Note>(APP_ID, "notes");
  const { data: contacts }  = useAppCollection<Contact>(APP_ID, "contacts");
  const { data: companies } = useAppCollection<Company>(APP_ID, "companies");
  const { data: deals }     = useAppCollection<Deal>(APP_ID, "deals");

  const [scope, setScope]         = useState<Scope>("all");
  const [search, setSearch]       = useState("");
  const [activeId, setActiveId]   = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const linkedLabel = (note: Note): string | undefined => {
    if (note.contact_id) {
      const c = contacts.find(c => c.id === note.contact_id);
      return c ? `${c.first_name} ${c.last_name}` : undefined;
    }
    if (note.company_id) return companies.find(c => c.id === note.company_id)?.name;
    if (note.deal_id)    return deals.find(d => d.id === note.deal_id)?.title;
  };

  const filtered = notes
    .filter(n => {
      if (scope === "contacts"  && !n.contact_id)  return false;
      if (scope === "companies" && !n.company_id)  return false;
      if (scope === "deals"     && !n.deal_id)     return false;
      if (scope === "pinned"    && !n.pinned)      return false;
      if (search) {
        const q = search.toLowerCase();
        const text = `${n.title ?? ""} ${preview(n.body ?? "")}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  const activeNote = notes.find(n => n.id === activeId) ?? null;

  const handleCreate = async () => {
    try {
      const note = await create({ title: "", body: "", pinned: false });
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
      <div className="h-full">
        <NoteDetailPanel
          note={activeNote}
          linkedLabel={linkedLabel(activeNote)}
          onSave={handleSave}
          onDelete={handleDelete}
          onPin={handlePin}
          onBack={() => setActiveId(null)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6 h-full">
      <PageHeader
        title="Notes"
        description="All notes across contacts, companies, and deals"
        actions={
          <Button onClick={handleCreate}>
            <IconPlus className="h-4 w-4 mr-1.5" /> New Note
          </Button>
        }
      />

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search notes…" debounceMs={200} />
        <div className="flex items-center gap-1">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setScope(f.key)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                scope === f.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </FilterBar>

      {loading && <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>}

      {!loading && filtered.length === 0 && (
        <EmptyState
          icon={<IconNotes className="h-8 w-8" />}
          title={search || scope !== "all" ? "No notes found" : "No notes yet"}
          description={search || scope !== "all" ? "Try adjusting your search or filter." : "Create your first note."}
          action={!search && scope === "all" ? <Button onClick={handleCreate}><IconPlus className="h-4 w-4 mr-1.5" /> New Note</Button> : undefined}
        />
      )}

      {!loading && filtered.length > 0 && (
        <ScrollArea className="flex-1">
          {/* responsive masonry grid */}
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {filtered.map(note => {
              const label = linkedLabel(note);
              return (
                <div
                  key={note.id}
                  onClick={() => setActiveId(note.id)}
                  className="group break-inside-avoid cursor-pointer rounded-lg border bg-card p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className={cn("text-sm font-semibold leading-tight", !note.title && "text-muted-foreground italic")}>
                      {note.title || "Untitled"}
                    </h3>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); handlePin(note); }}
                        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                      >
                        {note.pinned ? <IconPinnedOff className="h-3.5 w-3.5" /> : <IconPin className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteTarget(note.id); }}
                        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-destructive"
                      >
                        <IconTrash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {note.body && (
                    <p className="text-xs text-muted-foreground line-clamp-4">{preview(note.body)}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    {label && <Badge variant="outline" className="text-xs">{label}</Badge>}
                    <span className="text-xs text-muted-foreground/60 ml-auto">{relativeTime(note.created_at)}</span>
                  </div>
                </div>
              );
            })}
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
